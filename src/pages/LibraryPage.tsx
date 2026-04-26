import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { Library, History, Bookmark, Loader2, PlayCircle, X, Check, Trash2, Edit3, Film, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { uploadService } from '../services/uploadService';

export default function LibraryPage() {
  const [myVideos, setMyVideos] = useState<VideoMetadata[]>([]);
  const [history, setHistory] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'uploads' | 'history'>('uploads');
  
  // Edit State
  const [editingVideo, setEditingVideo] = useState<VideoMetadata | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'videos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
      } as VideoMetadata));
      setMyVideos(data);
      setLoading(false);
    }, (error) => {
      console.error("Library sync error:", error);
      setLoading(false);
      toast.error('Gagal sinkronisasi data');
    });

    const localHistory = localStorage.getItem('watch_history');
    if (localHistory) {
      const parsed = JSON.parse(localHistory);
      setHistory([...parsed].reverse().slice(0, 10));
    }

    return () => unsubscribe();
  }, []);

  const handleDelete = (id: string) => {
    setDeletingVideoId(id);
  };

  const confirmDelete = async () => {
    if (!deletingVideoId) return;

    try {
      await deleteDoc(doc(db, 'videos', deletingVideoId));
      toast.success('Video berhasil dihapus');
      setDeletingVideoId(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus video');
    }
  };

  const handleEdit = (video: VideoMetadata) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditFile(null);
  };

  const saveEdit = async () => {
    if (!editingVideo) return;
    if (!editTitle.trim()) {
      toast.error('Judul tidak boleh kosong');
      return;
    }

    try {
      if (editFile) {
        // If file is selected, we perform a new upload
        const tempThumb = URL.createObjectURL(editFile);
        await uploadService.startUpload(editTitle, editFile, tempThumb);
        // We delete the old document since we are "replacing" it
        await deleteDoc(doc(db, 'videos', editingVideo.id!));
        toast.success('Re-upload dimulai, video lama akan dihapus');
      } else {
        // Only update title
        await updateDoc(doc(db, 'videos', editingVideo.id!), {
          title: editTitle
        });
        toast.success('Judul video diperbarui');
      }
      setEditingVideo(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui video');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 pt-24 pb-32">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
        <Library className="text-primary" size={40} />
        Library
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/10">
        <button 
          onClick={() => setActiveSubTab('uploads')}
          className={cn(
            "pb-4 text-xs font-black uppercase tracking-widest transition-all",
            activeSubTab === 'uploads' ? "text-primary border-b-2 border-primary" : "text-on-surface-variant"
          )}
        >
          My Uploads
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={cn(
            "pb-4 text-xs font-black uppercase tracking-widest transition-all",
            activeSubTab === 'history' ? "text-primary border-b-2 border-primary" : "text-on-surface-variant"
          )}
        >
          Watch History
        </button>
      </div>

      {activeSubTab === 'uploads' ? (
        <section>
          {myVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container/50 rounded-3xl border border-dashed border-white/10">
              <PlayCircle className="text-neutral-700 mb-4" size={48} />
              <p className="text-on-surface-variant font-bold">No videos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {myVideos.map(video => (
                <div key={video.id}>
                  <VideoCard 
                    video={video} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container/50 rounded-3xl border border-dashed border-white/10">
              <History className="text-neutral-700 mb-4" size={48} />
              <p className="text-on-surface-variant font-bold">Your watch history is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {history.map(video => (
                <div key={`history-${video.id}`}>
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-neutral-800/50">
                <div className="flex items-center gap-3 text-primary">
                  <Edit3 size={20} />
                  <h3 className="text-lg font-bold tracking-tight">Edit Detail Video</h3>
                </div>
                <button 
                  onClick={() => setEditingVideo(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-on-surface-variant transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                  {editFile ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/20 animate-pulse">
                      <Film className="text-primary mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase text-primary">Video Baru Terpilih</p>
                      <p className="text-[8px] text-primary/60 mt-1">{editFile.name}</p>
                    </div>
                  ) : (
                    <img 
                      src={editingVideo.thumbnail || undefined} 
                      className="w-full h-full object-cover opacity-60" 
                      alt="" 
                    />
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Upload className="text-white mb-2" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Ganti File Video</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    accept="video/*"
                    className="hidden" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Judul Video</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-14 px-4 bg-black border border-white/10 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="p-6 flex gap-3 bg-neutral-800/20 border-t border-white/5">
                <button 
                  onClick={() => setEditingVideo(null)}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={saveEdit}
                  className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold text-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingVideoId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Video?</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Are you sure you want to delete this video? This action cannot be undone.
                </p>
              </div>

              <div className="p-6 flex gap-3 bg-neutral-800/20 border-t border-white/5">
                <button 
                  onClick={() => setDeletingVideoId(null)}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-white transition-all shadow-lg shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Playlist Section Mock */}
      <section className="mt-12">
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-6 flex items-center gap-2">
          <Bookmark size={16} />
          Your Playlists
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-video relative rounded-2xl overflow-hidden glass-edge group cursor-pointer active:scale-95 transition-transform">
             <img src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop" className="h-full w-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500" alt="Favorites" />
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black italic tracking-tighter uppercase">Favorites</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">12 Videos</span>
             </div>
          </div>
          <div className="aspect-video relative rounded-2xl overflow-hidden glass-edge group cursor-pointer active:scale-95 transition-transform">
             <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" className="h-full w-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500" alt="Watch Later" />
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black italic tracking-tighter uppercase">Watch Later</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">8 Videos</span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
