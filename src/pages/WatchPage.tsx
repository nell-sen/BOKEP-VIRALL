import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { VideoMetadata } from '../types';
import { 
  Loader2, ArrowLeft, Calendar, Share2, MoreHorizontal, Star, 
  Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, FastForward,
  Clock, Info, Subtitles, Settings as SettingsIcon, Volume1, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchVideo(id);
    }
  }, [id]);

  const fetchVideo = async (videoId: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'videos', videoId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const videoData = {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date()
        } as VideoMetadata;
        setVideo(videoData);

        // Add to history
        try {
          const localHistory = localStorage.getItem('watch_history');
          let historyArray = localHistory ? JSON.parse(localHistory) : [];
          // Remove if already exists to move to end
          historyArray = historyArray.filter((v: any) => v.id !== videoId);
          // Limit history to 20 items
          if (historyArray.length >= 20) historyArray.shift();
          historyArray.push({
            id: videoData.id,
            title: videoData.title,
            thumbnail: videoData.thumbnail,
            createdAt: videoData.createdAt
          });
          localStorage.setItem('watch_history', JSON.stringify(historyArray));
        } catch (e) {
          console.error("History saving failed", e);
        }
      } else {
        setError('Video tidak ditemukan');
      }
    } catch (err) {
      console.error("Error fetching video:", err);
      setError('Gagal memuat video. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          setIsPlaying(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Playback failed:", err);
        }
      }
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      videoRef.current.muted = nextMuted;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current && video) {
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          setIsPlaying(true);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error("Autoplay failed:", err);
          }
          setIsPlaying(false);
        }
      }
    };
    
    // Attempt play when video source is ready
    if (!loading && video) {
      playVideo();
    }
  }, [loading, video]);

  const [showDetails, setShowDetails] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: video?.title || 'Tonton Video di STREAM',
      text: 'Lihat video keren ini di STREAM!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err: any) {
      // Don't show error if user cancelled the share
      if (err.name === 'AbortError') {
        return;
      }
      
      // Fallback to clipboard for other errors or if not supported
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link disalin ke clipboard!', {
        style: { background: '#131313', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      });
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-neutral-400">Memuat video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-primary/10 p-6 text-primary">
          <ArrowLeft size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{error}</h2>
          <p className="mt-2 text-neutral-400">Silakan kembali ke beranda dan coba lagi.</p>
        </div>
        <Link to="/" className="rounded-xl bg-neutral-800 px-6 py-3 font-bold transition-colors hover:bg-neutral-700">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black overflow-hidden flex flex-col items-center justify-center group"
      onMouseMove={handleMouseMove}
    >
      {/* Top App Bar overlay */}
      <header className={cn(
        "absolute top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/10 bg-black/40 px-5 backdrop-blur-[25px] transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center gap-4">
          <Link to="/" className="active:scale-95 transition-opacity hover:opacity-80">
            <ArrowLeft className="text-on-surface" />
          </Link>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-on-surface text-lg leading-tight line-clamp-1">{video.title}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Clock size={10} />
              Streaming Now • Chapter {Math.floor(currentTime/300) + 1}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
           <button onClick={handleShare} className="active:scale-90 transition-transform">
             <Share2 size={24} className="text-on-surface cursor-pointer hover:text-primary transition-colors" />
           </button>
           <Subtitles size={24} className="text-on-surface cursor-pointer hover:text-primary transition-colors" />
           <SettingsIcon size={24} className="text-on-surface cursor-pointer hover:text-primary transition-colors" />
        </div>
      </header>

      {/* Actual Video */}
      <video 
        ref={videoRef}
        src={video.url || undefined} 
        className="h-full w-full object-contain"
        poster={video.thumbnail || undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handlePlayPause}
      />

      {/* Centered Controls */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-12 pointer-events-auto">
          <button 
            onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
            className="text-white/80 hover:text-white transition-all active:scale-90"
          >
            <RotateCcw size={40} />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="w-20 h-20 bg-black/40 backdrop-blur-[25px] border border-white/10 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {isPlaying ? (
              <Pause size={40} className="fill-current" />
            ) : (
              <Play size={48} className="ml-2 fill-current" />
            )}
          </button>
          
          <button 
            onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
            className="text-white/80 hover:text-white transition-all active:scale-90"
          >
            <FastForward size={40} />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-6 z-20 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-[25px] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
          {/* Seek Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[11px] font-bold tracking-widest text-on-surface-variant uppercase">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="relative group/seeker h-6 flex items-center">
              <input 
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_8px_rgba(10,132,255,0.8)]" 
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <div 
                className={cn(
                  "absolute w-4 h-4 bg-white rounded-full border-2 border-primary shadow-lg transition-transform",
                  "left-[var(--seek-pos)] -translate-x-1/2 scale-0 group-hover/seeker:scale-100"
                )}
                style={{ "--seek-pos": `${(currentTime / (duration || 1)) * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 group/volume">
                <button onClick={toggleMute} className="text-on-surface hover:text-primary transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="relative w-24 h-6 flex items-center">
                  <div className="w-full h-1 bg-white/20 rounded-full group-hover/volume:bg-white/30 transition-colors">
                    <div 
                      className="h-full bg-white rounded-full" 
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setShowDetails(true)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                <Info size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest sm:inline hidden">Details</span>
              </button>
              <button 
                onClick={handleFullscreen}
                className="text-on-surface hover:text-primary transition-colors active:scale-95"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Details Overlay */}
      <AnimatePresence>
        {showDetails && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-3xl flex items-center justify-center p-6 sm:p-12 overflow-y-auto"
          >
            <button 
              onClick={() => setShowDetails(false)}
              className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors active:scale-90"
            >
              <X size={32} />
            </button>
            <div className="max-w-2xl w-full space-y-8">
              <div>
                <div className="flex gap-2 mb-4">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold border border-primary/30">SCI-FI</span>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold border border-primary/30">ACTION</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-white mb-2">{video.title}</h2>
                <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                  <span>{video.createdAt instanceof Date ? format(video.createdAt, 'yyyy') : '2024'}</span>
                  <span className="w-1 h-1 bg-on-surface-variant rounded-full"></span>
                  <span>16+</span>
                  <span className="w-1 h-1 bg-on-surface-variant rounded-full"></span>
                  <div className="flex items-center gap-1 text-on-surface">
                    <Star size={16} className="fill-yellow-500 text-yellow-500" />
                    <span className="font-bold">8.9</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight">Synopsis</h3>
                <p className="text-lg text-on-surface-variant leading-relaxed font-medium">
                  In a world where light is currency, one outcast discovers the secret to an infinite darkness that could change everything. 
                  To save the city he loves, he must win the ultimate high-stakes race through the neon-soaked underworld.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 py-8 border-t border-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Director</p>
                  <p className="font-bold text-lg">Denis Villeneuve</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Cast</p>
                  <p className="font-bold text-lg">Ryan Gosling, Harrison Ford</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Badge */}
      <div className={cn(
        "absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full flex items-center gap-2 pointer-events-none border border-white/10 transition-opacity duration-500",
        showControls ? "opacity-70" : "opacity-0"
      )}>
        <Star size={14} className="text-primary fill-current" />
        <span className="text-xs font-medium text-white/90">HDR10+ Content Detected</span>
      </div>
    </div>
  );
}
