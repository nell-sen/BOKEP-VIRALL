import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { Search, Loader2, Film, X, TrendingUp, Filter, SlidersHorizontal, ChevronDown, Clock, Calendar, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORIES = ['All', 'Hiburan', 'Musik', 'Edukasi', 'Gaming', 'Teknologi', 'Olahraga', 'Kuliner', 'Vlog', 'Lainnya'];
const DATE_FILTERS = ['Any time', 'Today', 'This Week', 'This Month'];
const DURATION_FILTERS = ['Any duration', 'Short (< 4m)', 'Medium (4-20m)', 'Long (> 20m)'];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<VideoMetadata[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDate, setActiveDate] = useState('Any time');
  const [activeDuration, setActiveDuration] = useState('Any duration');

  useEffect(() => {
    // Load trending or recent videos by default
    const loadTrending = async () => {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
      } as VideoMetadata));
      setTrending(data);
    };
    loadTrending();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [videos, activeCategory, activeDate, activeDuration, trending, searchQuery]);

  const applyFilters = () => {
    let source = searchQuery ? videos : trending;
    let filtered = [...source];

    // 1. Category Filter
    if (activeCategory !== 'All') {
      filtered = filtered.filter(v => v.category === activeCategory);
    }

    // 2. Date Filter
    const now = new Date();
    if (activeDate === 'Today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(v => {
        const d = v.createdAt instanceof Date ? v.createdAt : (v.createdAt as any).toDate?.() || new Date(v.createdAt as any);
        return d >= today;
      });
    } else if (activeDate === 'This Week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(v => {
        const d = v.createdAt instanceof Date ? v.createdAt : (v.createdAt as any).toDate?.() || new Date(v.createdAt as any);
        return d >= lastWeek;
      });
    } else if (activeDate === 'This Month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter(v => {
        const d = v.createdAt instanceof Date ? v.createdAt : (v.createdAt as any).toDate?.() || new Date(v.createdAt as any);
        return d >= lastMonth;
      });
    }

    // 3. Duration Filter
    if (activeDuration === 'Short (< 4m)') {
      filtered = filtered.filter(v => v.duration && v.duration < 240);
    } else if (activeDuration === 'Medium (4-20m)') {
      filtered = filtered.filter(v => v.duration && v.duration >= 240 && v.duration <= 1200);
    } else if (activeDuration === 'Long (> 20m)') {
      filtered = filtered.filter(v => v.duration && v.duration > 1200);
    }

    setFilteredVideos(filtered);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const queryStr = searchQuery.trim().toLowerCase();
    if (!queryStr) {
      setVideos([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Search using titleLower for case-insensitive prefix search
      const q = query(
        collection(db, 'videos'),
        where('titleLower', '>=', queryStr),
        where('titleLower', '<=', queryStr + '\uf8ff'),
        limit(50) // Increased limit to allow better filtering
      );
      
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
      } as VideoMetadata));

      // 2. Fallback for older videos without titleLower
      if (results.length === 0) {
        const qOriginal = query(
          collection(db, 'videos'),
          where('title', '>=', searchQuery.trim()),
          where('title', '<=', searchQuery.trim() + '\uf8ff'),
          limit(50)
        );
        const snapOriginal = await getDocs(qOriginal);
        results = snapOriginal.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
        } as VideoMetadata));
      }

      setVideos(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen px-6 pt-24 pb-32">
      {/* Search Header */}
      <div className="mb-0">
        <div className="flex items-end justify-between mb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Discovery</h1>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              showFilters ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-white/5"
            )}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full mb-4">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-on-surface-variant" size={20} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, creators, topics..."
            className="w-full h-14 pl-12 pr-12 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary text-base placeholder-on-surface-variant glass-edge transition-all outline-none"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => {setSearchQuery(''); setVideos([]);}}
              className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </form>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mb-8 p-6 bg-surface-container rounded-3xl border border-white/5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Category Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Tag size={12} /> Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        activeCategory === cat 
                          ? "bg-primary border-primary text-white" 
                          : "bg-black/20 border-white/5 text-on-surface-variant hover:bg-white/5"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Calendar size={12} /> Upload Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {DATE_FILTERS.map(date => (
                    <button
                      key={date}
                      onClick={() => setActiveDate(date)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        activeDate === date 
                          ? "bg-primary border-primary text-white" 
                          : "bg-black/20 border-white/5 text-on-surface-variant hover:bg-white/5"
                      )}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <Clock size={12} /> Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_FILTERS.map(dur => (
                    <button
                      key={dur}
                      onClick={() => setActiveDuration(dur)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        activeDuration === dur 
                          ? "bg-primary border-primary text-white" 
                          : "bg-black/20 border-white/5 text-on-surface-variant hover:bg-white/5"
                      )}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] text-on-surface-variant font-medium">
                Tip: Mixed filters will be applied together.
              </p>
              <button 
                onClick={() => {
                  setActiveCategory('All');
                  setActiveDate('Any time');
                  setActiveDuration('Any duration');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-primary" size={48} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-on-surface-variant font-black tracking-widest uppercase text-[10px]">Processing Results...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Film className="text-neutral-800 mb-6 opacity-20" size={80} />
          <h3 className="text-2xl font-black uppercase tracking-tighter">No videos Match</h3>
          <p className="text-on-surface-variant max-w-xs mt-3 text-sm leading-relaxed">
            We couldn't find any content matching your current filters. Try broadening your search or resetting filters.
          </p>
          <button 
            onClick={() => {
              setActiveCategory('All');
              setActiveDate('Any time');
              setActiveDuration('Any duration');
              setSearchQuery('');
              setVideos([]);
            }}
            className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/10"
          >
            Clear everything
          </button>
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              {searchQuery ? <Search size={16} /> : <TrendingUp size={16} />}
              {searchQuery ? `Search Results (${filteredVideos.length})` : 'Recommended for you'}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filteredVideos.map(video => (
              <div key={video.id} className="group">
                <VideoCard video={video} />
                {(video.category || video.duration) && (
                  <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {video.category && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                        {video.category}
                      </span>
                    )}
                    {video.duration && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 text-on-surface-variant px-2 py-0.5 rounded-md border border-white/10">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
