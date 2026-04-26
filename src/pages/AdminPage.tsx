import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Lock, 
  User, 
  Instagram, 
  MessageCircle, 
  BookOpen, 
  Camera, 
  Save, 
  Loader2,
  ShieldCheck,
  Shield,
  LogOut,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import BackendSettings from '../components/BackendSettings';

const ADMIN_PASSWORD = 'Ishnelsen060906';

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    username: '',
    photoBase64: '',
    instagram: '',
    whatsapp: '',
    guide: '',
    isUploadEnabled: true
  });

  useEffect(() => {
    if (isAuthorized) {
      fetchSettings();
    }
  }, [isAuthorized]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'app_settings', 'profile'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          username: data.username || '',
          photoBase64: data.photoBase64 || '',
          instagram: data.instagram || '',
          whatsapp: data.whatsapp || '',
          guide: data.guide || '',
          isUploadEnabled: data.isUploadEnabled ?? true
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      fetchSettings();
      toast.success('Akses Diberikan');
    } else {
      toast.error('Password Salah');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, photoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'profile'), settings);
      toast.success('Pengaturan Berhasil Disimpan');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleUpload = async (enabled: boolean) => {
    const newSettings = { ...settings, isUploadEnabled: enabled };
    setSettings(newSettings);
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'profile'), newSettings);
      
      // Send Notification
      const now = new Date();
      await setDoc(doc(db, 'notifications', `sys_${now.getTime()}`), {
        title: enabled ? 'Fitur Upload Dibuka! 🔓' : 'Fitur Upload Ditutup! 🔒',
        message: enabled ? 'Kini Anda bisa kembali membagikan video favorit Anda.' : 'Kami sedang melakukan pemeliharaan pada sistem upload.',
        type: 'system',
        createdAt: now,
        timestamp: now.toLocaleString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        })
      });

      toast.success(`Fitur Upload ${enabled ? 'DIBUKA' : 'DITUTUP'}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui status upload');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPassword('');
    toast.success('Berhasil keluar dari Admin Panel');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Admin Panel</h1>
            <p className="text-on-surface-variant text-sm mt-2">Masukkan password untuk melanjutkan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 focus:outline-none focus:border-primary transition-all font-mono"
                placeholder="••••••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Masuk
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="text-primary" size={14} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Authorized Admin</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Panel Pengelola</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="group flex items-center gap-2 h-10 px-5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <LogOut size={14} />
            Keluar Panel
          </button>
        </div>
      </header>

      <main className="pt-24 p-6 md:p-12 lg:p-16 max-w-4xl mx-auto pb-48 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="font-black uppercase tracking-widest text-xs">Singkronisasi Data...</p>
          </div>
        ) : (
          <>
            {/* System Status Section */}
            <section className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Shield size={16} /> Kontrol Akses Sistem
              </h2>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white/[0.02] rounded-2xl border border-white/5 gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-sm">Status Fitur Upload Video</p>
                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                    {settings.isUploadEnabled ? '✅ Pengguna dapat mengunggah video' : '❌ Pengguna dilarang mengunggah'}
                  </p>
                </div>
                <button 
                  onClick={() => toggleUpload(!settings.isUploadEnabled)}
                  disabled={saving}
                  className={cn(
                    "w-full sm:w-32 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50",
                    settings.isUploadEnabled ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-white border border-white/10"
                  )}
                >
                  {settings.isUploadEnabled ? 'Mode: Aktif' : 'Mode: Non-aktif'}
                </button>
              </div>
            </section>

            {/* Profile Section */}
            <section className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <User size={16} /> Branding Creator
              </h2>
              
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group w-36 h-36 shrink-0">
                    <div className="w-full h-full rounded-full border-4 border-primary/20 overflow-hidden bg-black shadow-2xl transition-transform group-hover:scale-[1.02]">
                      {settings.photoBase64 ? (
                        <img src={settings.photoBase64} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <Camera size={40} />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-full cursor-pointer">
                      <div className="text-center">
                        <Camera className="text-white mx-auto mb-1" size={20} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Ganti Foto</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Profile Picture 1:1</span>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Stream Alias / Nama User</label>
                    <input 
                      type="text" 
                      value={settings.username}
                      onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 focus:outline-none focus:border-primary transition-all font-bold"
                      placeholder="Masukkan nama tampilan..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Social Media Section */}
            <section className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Instagram size={16} /> Koneksi Platform
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-rose-400 ml-1">Profil Instagram (URL)</label>
                  <div className="relative group">
                    <Instagram className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-400 group-focus-within:scale-110 transition-transform" size={18} />
                    <input 
                      type="text" 
                      value={settings.instagram}
                      onChange={(e) => setSettings(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 focus:outline-none focus:border-rose-400 transition-all text-sm"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-1">Nomor WhatsApp (API/URL)</label>
                  <div className="relative group">
                    <MessageCircle className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:scale-110 transition-transform" size={18} />
                    <input 
                      type="text" 
                      value={settings.whatsapp}
                      onChange={(e) => setSettings(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                      placeholder="https://wa.me/628..."
                    />
                  </div>
                </div>
              </div>
            </section>
            
            <BackendSettings />

            {/* Guide Section */}
            <section className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <BookOpen size={16} /> Panduan & Deskripsi Layanan
              </h2>
              <div className="space-y-2">
                <textarea 
                  value={settings.guide}
                  onChange={(e) => setSettings(prev => ({ ...prev, guide: e.target.value }))}
                  className="w-full min-h-[200px] bg-white/[0.03] border border-white/10 rounded-2xl p-6 focus:outline-none focus:border-primary transition-all resize-none text-sm leading-relaxed"
                  placeholder="Berikan instruksi atau deskripsi untuk user di profil..."
                />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 z-[70] pointer-events-none">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="pointer-events-auto group h-16 pl-8 pr-10 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-[10px]"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
            {saving ? 'Sedang Menyimpan...' : 'Simpan Seluruh Perubahan'}
          </button>
        </div>
      </footer>
    </div>
  );
}
