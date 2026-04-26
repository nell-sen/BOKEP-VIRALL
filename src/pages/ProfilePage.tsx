import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Zap, 
  Bell, 
  Edit3, 
  Camera,
  Instagram,
  MessageCircle,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const [user, setUser] = useState(auth.currentUser);
  const [appSettings, setAppSettings] = useState({
    username: 'User Stream',
    photoBase64: '',
    instagram: '',
    whatsapp: '',
    guide: 'Selamat datang di platform streaming kami. Gunakan menu di bawah untuk mulai menjelajah.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'app_settings', 'profile'));
        if (docSnap.exists()) {
          setAppSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Error fetching profile settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to logout');
    }
  };

  const profileDisplay = {
    name: appSettings.username || user?.displayName || 'User Stream',
    photo: appSettings.photoBase64 || user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuC4THCcmaY6-gPLYPBhTnxXkW1lb1qKXrYuLX1_xZzkosB3hFVx1-JIrorxZgjnphQF_pEuBgj2mL8mCs_05JCDezFVuETODN6yVaQrAp5tfPtUE5ueqKADjbRB7kNH7LV-wyW9b2lVUnYp-SnYm_vGWBEXOxnNdyrTiR42SRCZsx-aVcidOL7a9s6Z9bkhyGQQ00rwecu65NmrAami-mp-DmpgRa1Ns0bexfbCYR8sxW1M2--nPmyn7EIYIfr6oagL7OsU_SFn7HA",
  };

  return (
    <div className="w-full min-h-screen px-6 pt-24 pb-32 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6 group"
        >
          <div className="w-32 h-32 rounded-full border-4 border-primary/20 overflow-hidden shadow-2xl bg-neutral-900">
            <img 
               src={profileDisplay.photo} 
               alt="User Profile" 
               className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="absolute bottom-1 right-1 bg-primary text-black p-2 rounded-full shadow-lg">
            <ShieldCheck size={20} />
          </div>
        </motion.div>
        
        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1 }}
        >
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{profileDisplay.name}</h2>
          <p className="text-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] mt-1">{user?.email || 'guest@stream.io'}</p>
          
          <div className="flex items-center gap-3 justify-center mt-6">
            {appSettings.instagram && (
              <a 
                href={appSettings.instagram} 
                target="_blank" 
                rel="noreferrer"
                className="w-12 h-12 rounded-2xl bg-surface-container-high border border-white/5 flex items-center justify-center text-rose-400 hover:bg-rose-400 hover:text-white transition-all shadow-xl"
              >
                <Instagram size={24} />
              </a>
            )}
            {appSettings.whatsapp && (
              <a 
                href={appSettings.whatsapp} 
                target="_blank" 
                rel="noreferrer"
                className="w-12 h-12 rounded-2xl bg-surface-container-high border border-white/5 flex items-center justify-center text-emerald-400 hover:bg-emerald-400 hover:text-white transition-all shadow-xl"
              >
                <MessageCircle size={24} />
              </a>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Guide Box */}
        <motion.section 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 border border-white/10 rounded-3xl p-8"
        >
          <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6 flex items-center gap-2">
            <BookOpen size={16} /> Panduan & Deskripsi
          </h3>
          <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {appSettings.guide}
          </div>
        </motion.section>

        {/* Action Links */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <Link to="/library" className="group flex items-center justify-between p-6 bg-surface-container-high rounded-2xl glass-edge hover:bg-white/5 active:scale-[0.98] transition-all">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                   <PlayCircle size={20} />
                </div>
                <div className="text-left">
                   <p className="text-sm font-bold">Koleksi Video</p>
                   <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Library & History</p>
                </div>
             </div>
             <ChevronRight className="text-white/20 group-hover:text-primary transition-colors" size={20} />
          </Link>

          <Link to="/admin" className="group flex items-center justify-between p-6 bg-surface-container-high rounded-2xl glass-edge hover:bg-white/5 active:scale-[0.98] transition-all">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                   <Shield size={20} />
                </div>
                <div className="text-left">
                   <p className="text-sm font-bold">Admin Panel</p>
                   <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Akses Pengelola</p>
                </div>
             </div>
             <ChevronRight className="text-white/20 group-hover:text-orange-500 transition-colors" size={20} />
          </Link>

          <button 
            onClick={handleLogout}
            className="w-full group flex items-center justify-between p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:bg-rose-500/10 active:scale-[0.98] transition-all"
          >
             <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                   <LogOut size={20} />
                </div>
                <div className="text-left">
                   <p className="text-sm font-bold text-rose-500">Sign Out</p>
                   <p className="text-[10px] text-rose-500/60 font-medium uppercase tracking-widest">Keluar Sesi</p>
                </div>
             </div>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
