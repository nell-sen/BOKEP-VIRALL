import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Clock, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { VideoMetadata } from '../types';

interface VideoCardProps {
  video: VideoMetadata;
  isUploading?: boolean;
  progress?: number;
  onEdit?: (video: VideoMetadata) => void;
  onDelete?: (id: string) => void;
}

export default function VideoCard({ video, isUploading, progress, onEdit, onDelete }: VideoCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative flex flex-col gap-3"
    >
      <Link to={isUploading ? '#' : `/watch/${video.id}`} className="relative aspect-video overflow-hidden rounded-lg bg-surface-container glass-edge transition-all group-active:scale-95">
        <img
          src={(video.thumbnail && video.thumbnail !== "") ? video.thumbnail : 'https://via.placeholder.com/640x360?text=Loading...'}
          alt={video.title}
          className={cn(
            "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
            !video.thumbnail && "animate-pulse brightness-50"
          )}
          loading="lazy"
        />
        
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="mb-2 h-1.5 w-3/4 overflow-hidden rounded-full bg-white/20">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
              {progress === 100 ? 'Finalizing...' : `Uploading ${progress}%`}
            </span>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl">
                <Play size={24} className="ml-1 fill-current" />
              </div>
            </div>

            {(onEdit || onDelete) && (
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {onEdit && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(video);
                    }}
                    className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-primary transition-colors border border-white/10"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(video.id!);
                    }}
                    className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-colors border border-white/10"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </Link>

      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 font-bold text-sm tracking-tight group-hover:text-primary">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium uppercase">
          <Clock size={10} />
          <span>
            {video.createdAt instanceof Date 
              ? formatDistanceToNow(video.createdAt, { addSuffix: true })
              : 'Just now'
            }
          </span>
        </div>
      </div>
    </motion.div>
  );
}
