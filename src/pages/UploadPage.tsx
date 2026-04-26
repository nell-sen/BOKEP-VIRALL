import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Film, Type, AlertCircle, CheckCircle2, ShieldOff, Loader2, Tag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadService } from '../services/uploadService';
import { cn } from '../lib/utils';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CATEGORIES = [
  'Hiburan',
  'Musik',
  'Edukasi',
  'Gaming',
  'Teknologi',
  'Olahraga',
  'Kuliner',
  'Vlog',
  'Lainnya'
];

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hiburan');
  const [duration, setDuration] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadEnabled, setIsUploadEnabled] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUploadStatus = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'app_settings', 'profile'));
        if (docSnap.exists()) {
          setIsUploadEnabled(docSnap.data().isUploadEnabled ?? true);
        } else {
          setIsUploadEnabled(true);
        }
      } catch (err) {
        console.error(err);
        setIsUploadEnabled(true);
      }
    };
    checkUploadStatus();
  }, []);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      setError('Hanya file video yang diizinkan!');
      return;
    }
    
    if (selectedFile.size > 200 * 1024 * 1024) {
      setError('Ukuran file maksimal 200MB!');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create a temporary thumbnail preview and get duration
    const video = document.createElement('video');
    video.src = URL.createObjectURL(selectedFile);
    video.onloadedmetadata = () => {
      setDuration(Math.round(video.duration));
    };
    video.currentTime = 1; // Seek to 1 second
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL());
      URL.revokeObjectURL(video.src);
    };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError('Judul dan video wajib diisi!');
      return;
    }

    // Start background upload with category and duration
    uploadService.startUpload(title, file, preview || '', category, duration);
    
    // Trigger notification for new upload
    try {
      const now = new Date();
      await setDoc(doc(db, 'notifications', `upload_${now.getTime()}`), {
        title: 'Video Baru Tersedia! 🎬',
        message: `${title} telah diupload ke kategori ${category}.`,
        type: 'upload',
        createdAt: now,
        timestamp: now.toLocaleString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        })
      });
    } catch (err) {
      console.error("Failed to send upload notification:", err);
    }

    // Redirect to home immediately as requested
    navigate('/');
  };

  if (isUploadEnabled === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (isUploadEnabled === false) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-white/10 bg-neutral-900 p-12 shadow-2xl"
        >
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <ShieldOff size={48} />
          </div>
          <h1 className="mb-4 text-3xl font-black uppercase tracking-tighter">Fitur Ditutup</h1>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            Maaf, fitur upload sedang ditutup sementara oleh admin untuk pemeliharaan sistem. Silakan coba lagi nanti.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="h-14 px-10 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all border border-white/5"
          >
            Kembali ke Beranda
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {/* Notice for configuration */}
      <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-500 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold">Konfigurasi Backend Diperlukan</p>
            <p className="mt-1 text-amber-500/80 leading-relaxed">
              Pastikan Anda telah mengisi URL Backend yang valid. Anda dapat mengubah URL langsung melalui 
              <strong> ikon Settings (⚙️)</strong> di bar navigasi atas. URL akan disimpan ke Firebase secara permanen.
            </p>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/5 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-sm"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Upload size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upload Video</h1>
            <p className="text-sm text-neutral-400">Bagikan karyamu dengan dunia.</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Type size={16} className="text-primary" />
              Judul Video
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul yang menarik..."
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Tag size={16} className="text-primary" />
              Kategori
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-xl py-2 px-4 text-xs font-bold transition-all border",
                    category === cat 
                      ? "bg-primary border-primary text-white" 
                      : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Film size={16} className="text-primary" />
              File Video
            </label>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "relative flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : preview 
                    ? "border-transparent" 
                    : "border-white/10 bg-neutral-950/50 hover:border-white/20"
              )}
            >
              {preview ? (
                <div className="group relative h-full w-full overflow-hidden rounded-xl">
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="font-bold text-white">Ganti Video</p>
                  </div>
                  {duration > 0 && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      <Clock size={10} />
                      {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setDuration(0); }}
                    className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-primary"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-neutral-400">
                    <Upload size={32} />
                  </div>
                  <p className="text-center font-medium text-neutral-300">
                    Klik atau drop file video di sini
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    MP4, WebM atau MOV (Max 200MB)
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
              accept="video/*"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-500"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={!file || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            Mulai Upload
            <CheckCircle2 size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
