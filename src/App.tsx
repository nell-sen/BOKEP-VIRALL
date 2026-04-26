import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Upload, Play, Library, Search, User, ArrowLeft } from 'lucide-react';
import { cn } from './lib/utils';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import WatchPage from './pages/WatchPage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import UploadStatusOverlay from './components/UploadStatusOverlay';
import { Toaster, toast } from 'react-hot-toast';
import { db } from './services/firebase';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Calendar, Clock as ClockIcon } from 'lucide-react';

function NotificationOverlay() {
  const [notifications, setNotifications] = React.useState<any[]>([]);

  React.useEffect(() => {
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc'), 
      limit(5)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const changes = snapshot.docChanges();
      
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(newItems);

      // Only show toast for new documents added AFTER initial load
      if (!isInitialLoad) {
        changes.forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            toast.custom((t) => (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={cn(
                  "max-w-md w-full bg-neutral-900 border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden",
                  t.visible ? 'animate-enter' : 'animate-leave'
                )}
              >
                <div className="flex-1 w-0 p-5">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Bell size={20} />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-black uppercase tracking-tight text-white">
                        {data.title}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant font-medium">
                        {data.message}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-primary/60">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {data.timestamp?.split(',')[0]}
                        </span>
                        <span className="flex items-center gap-1 text-white/30">•</span>
                        <span className="flex items-center gap-1">
                          <ClockIcon size={10} /> {data.timestamp?.split(',')[1]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-white/5">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            ), { duration: 5000, position: 'top-right' });
          }
        });
      }
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, []);

  return null;
}

function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc'), 
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(newItems);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors group"
      >
        <Bell className={cn("text-on-surface transition-transform group-active:scale-95", isOpen && "text-primary")} size={22} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-[8px] font-black flex items-center justify-center rounded-full border-2 border-black animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Notifications</p>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex gap-4">
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          notif.type === 'system' ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          <Bell size={14} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase tracking-tight text-white leading-tight mb-1">{notif.title}</p>
                          <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">{notif.message}</p>
                          <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary/40">
                            <span>{notif.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = React.useState('home');
  const [photo, setPhoto] = React.useState('');
  const [isUploadEnabled, setIsUploadEnabled] = React.useState(true);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'app_settings', 'profile'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhoto(data.photoBase64 || '');
          setIsUploadEnabled(data.isUploadEnabled ?? true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');

  return (
    <div className="min-h-screen">
      <Toaster />
      <NotificationOverlay />
      <UploadStatusOverlay />
      
      {/* Top Header */}
      {!isAdminPage && (
        <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-black/40 px-5 font-bold tracking-tight text-primary backdrop-blur-[25px]">
          <div className="flex items-center gap-4">
            <Link to="/" onClick={() => setActiveTab('home')} className="active:scale-95 transition-transform">
              <ArrowLeft className="text-on-surface" />
            </Link>
            <Link to="/" onClick={() => setActiveTab('home')} className="text-xl font-black tracking-widest text-primary">
              STREAM
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationCenter />
            {isUploadEnabled ? (
              <Link to="/upload" className="active:scale-95 transition-opacity hover:opacity-80">
                <Upload className="text-on-surface" />
              </Link>
            ) : (
              <div title="Fitur upload ditutup" className="cursor-not-allowed opacity-30">
                <Upload className="text-on-surface" />
              </div>
            )}
            <Link to="/profile" className="h-8 w-8 overflow-hidden rounded-full border border-white/20">
              <img 
                src={photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuC4THCcmaY6-gPLYPBhTnxXkW1lb1qKXrYuLX1_xZzkosB3hFVx1-JIrorxZgjnphQF_pEuBgj2mL8mCs_05JCDezFVuETODN6yVaQrAp5tfPtUE5ueqKADjbRB7kNH7LV-wyW9b2lVUnYp-SnYm_vGWBEXOxnNdyrTiR42SRCZsx-aVcidOL7a9s6Z9bkhyGQQ00rwecu65NmrAami-mp-DmpgRa1Ns0bexfbCYR8sxW1M2--nPmyn7EIYIfr6oagL7OsU_SFn7HA"} 
                alt="Profile" 
                className="h-full w-full object-cover"
              />
            </Link>
          </div>
        </header>
      )}

      <main className={cn("pt-16 pb-32", isAdminPage && "pt-0 pb-0")}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      {!isAdminPage && (
        <nav className="fixed bottom-0 z-50 flex h-20 w-full items-center justify-around border-t border-white/15 bg-black/60 px-4 pb-5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-[25px]">
          <Link 
            to="/" 
            onClick={() => setActiveTab('home')}
            className={cn(
              "flex flex-col items-center justify-center transition-transform hover:text-primary/80 active:scale-90",
              activeTab === 'home' ? "text-primary" : "text-gray-500"
            )}
          >
            <Home size={24} />
            <span className="text-[10px] font-medium uppercase">Home</span>
          </Link>
          
          <Link 
            to="/library"
            onClick={() => setActiveTab('library')}
            className={cn(
              "flex flex-col items-center justify-center transition-transform hover:text-primary/80 active:scale-90",
              activeTab === 'library' ? "text-primary" : "text-gray-500"
            )}
          >
            <Library size={24} />
            <span className="text-[10px] font-medium uppercase">Library</span>
          </Link>

          <Link 
            to="/search"
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex flex-col items-center justify-center transition-transform hover:text-primary/80 active:scale-90",
              activeTab === 'search' ? "text-primary" : "text-gray-500"
            )}
          >
            <Search size={24} />
            <span className="text-[10px] font-medium uppercase">Search</span>
          </Link>

          <Link 
            to="/profile"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex flex-col items-center justify-center transition-transform hover:text-primary/80 active:scale-90",
              activeTab === 'profile' ? "text-primary" : "text-gray-500"
            )}
          >
            <User size={24} />
            <span className="text-[10px] font-medium uppercase">Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
