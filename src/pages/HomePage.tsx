import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  startAfter, 
  QueryDocumentSnapshot, 
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadService } from '../services/uploadService';
import { VideoMetadata, UploadState } from '../types';
import VideoCard from '../components/VideoCard';
import { Loader2, Film, Star, Play as PlayIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = ['ALL', 'ACTION', 'SCI-FI', 'DRAMA', 'THRILLER', 'HORROR'];

export default function HomePage() {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [localUploads, setLocalUploads] = useState<UploadState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  
  const observer = useRef<IntersectionObserver | null>(null);
  
  // Auto-slide hero banner
  useEffect(() => {
    if (videos.length > 0) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % Math.min(5, videos.length));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [videos.length]);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Load initial videos with real-time sync
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'videos'),
      orderBy('createdAt', 'desc'),
      limit(24)
    );
    
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const fetchedVideos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
      })) as VideoMetadata[];
      
      setVideos(fetchedVideos);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 24);
      setLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setLoading(false);
    });
    
    // Subscribe to upload service for local UI state
    const unsubscribeUploads = uploadService.subscribe(() => {
      setLocalUploads(uploadService.getUploads());
    });
    setLocalUploads(uploadService.getUploads());
    
    return () => {
      unsubscribeSnapshot();
      unsubscribeUploads();
    };
  }, []);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const q = query(
        collection(db, 'videos'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(24)
      );
      
      const snapshot = await getDocs(q);
      const moreVideos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
      })) as VideoMetadata[];
      
      setVideos(prev => [...prev, ...moreVideos]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 24);
    } catch (error) {
      console.error("Error loading more videos:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-neutral-400">Loading your feed...</p>
      </div>
    );
  }

  const heroVideo = videos[currentHeroIndex] || videos[0];

  return (
    <div className="w-full">
      {/* Hero Banner Part */}
      <section className="relative h-[650px] w-full overflow-hidden flex flex-col justify-end">
        <AnimatePresence mode="wait">
          <motion.div 
            key={heroVideo?.id || 'static'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={heroVideo?.thumbnail && heroVideo.thumbnail !== "" ? heroVideo.thumbnail : 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} 
              alt={heroVideo?.title || "Hero Banner"} 
              className="h-full w-full object-cover" 
            />
            <div className="absolute inset-0 hero-gradient"></div>
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 px-6 pb-12 space-y-4 max-w-2xl">
          <motion.div 
            key={`meta-${heroVideo?.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="glass-edge rounded-full bg-primary/20 text-primary border border-primary/30 px-3 py-1 text-[10px] font-bold tracking-widest backdrop-blur-md">
              {heroVideo ? 'PREMIUM ACCESS' : 'FEATURED CONTENT'}
            </span>
            <span className="text-white/70 text-xs font-bold tracking-tight">SCI-FI • ACTION • DRAMA</span>
          </motion.div>
          
          <motion.h1 
            key={`title-${heroVideo?.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black uppercase tracking-tighter text-white sm:text-6xl md:text-7xl leading-[0.9]"
          >
            {heroVideo?.title || 'NEON DRIFT'}
          </motion.h1>
          
          <motion.div 
            key={`info-${heroVideo?.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-4 text-sm font-medium text-on-surface-variant"
          >
            <span>{heroVideo?.createdAt instanceof Date ? heroVideo.createdAt.getFullYear() : '2024'}</span>
            <span className="h-1 w-1 rounded-full bg-on-surface-variant"></span>
            <span>18+</span>
            <span className="h-1 w-1 rounded-full bg-on-surface-variant"></span>
            <div className="flex items-center gap-1">
              <Star size={16} className="fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-on-surface">9.2</span>
            </div>
          </motion.div>
          
          <motion.p 
            key={`desc-${heroVideo?.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-on-surface-variant leading-relaxed line-clamp-3 text-lg font-medium"
          >
            {heroVideo ? 'Experience this masterpiece in stunning 4K. A story about courage, betrayal, and the cost of power in a dying world.' : 'In a future where consciousness can be digitized, a renegade street racer discovers a conspiracy that threatens the fabric of reality itself.'}
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 pt-4"
          >
            {heroVideo ? (
              <Link 
                to={`/watch/${heroVideo.id}`}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white transition-transform active:scale-95 shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                <PlayIcon size={20} className="fill-current" />
                Play Now
              </Link>
            ) : (
              <button className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-800 font-bold text-white transition-opacity cursor-not-allowed opacity-50">
                <PlayIcon size={20} className="fill-current" />
                Loading...
              </button>
            )}
            <button className="glass-edge flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95">
              <Film size={20} />
            </button>
          </motion.div>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-6 right-6 z-20 flex gap-2">
          {videos.slice(0, 5).map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentHeroIndex(idx)}
              className={cn(
                "h-1 transition-all duration-500 rounded-full",
                currentHeroIndex === idx ? "w-8 bg-primary" : "w-2 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
        
        {/* Navigation Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full px-6 flex justify-between pointer-events-none">
          <button 
            onClick={() => setCurrentHeroIndex(prev => (prev - 1 + Math.min(5, videos.length)) % Math.min(5, videos.length))}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-all pointer-events-auto active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => setCurrentHeroIndex(prev => (prev + 1) % Math.min(5, videos.length))}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-all pointer-events-auto active:scale-90"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </section>

      {/* Search Section */}
      <section className="px-6 mt-8">
        <Link to="/search" className="relative w-full block">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-on-surface-variant" size={20} />
          </div>
          <div 
            className="w-full h-12 pl-12 pr-4 bg-surface-container-high border-none rounded-full flex items-center text-sm text-on-surface-variant glass-edge transition-all outline-none"
          >
            Movies, Shows, and more
          </div>
        </Link>
      </section>

      {/* Categories */}
      <section className="px-6 mt-8">
        <h2 className="text-xl font-bold mb-4">Trending Categories</h2>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "glass-edge flex-none rounded-full px-6 py-2 text-xs font-bold transition-all active:scale-95",
                activeCategory === cat 
                  ? "bg-primary text-white border-primary" 
                  : "bg-surface-container-high text-on-surface hover:bg-white/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Discover</h2>
        </div>

        {(videos.length === 0 && localUploads.length === 0) ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02]">
            <Film className="mb-4 h-12 w-12 text-neutral-600" />
            <p className="text-lg font-semibold text-neutral-500">Belum ada video</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {/* Active Uploads */}
            {localUploads.map((upload) => (
              <div key={upload.id}>
                <VideoCard 
                  video={{
                    title: upload.title,
                    thumbnail: upload.tempThumbnail || '',
                    url: '',
                    createdAt: new Date(),
                  }}
                  isUploading={upload.status === 'uploading'}
                  progress={upload.progress}
                />
              </div>
            ))}

            {/* Published Videos */}
            {videos.map((video, index) => (
              <div key={video.id} ref={index === videos.length - 1 ? lastElementRef : null}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </section>
    </div>
  );
}
