import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { fetchConfiguredBackendUrl, setBackendUrl } from '../services/uploadService';
import { cn } from '../lib/utils';

export default function BackendSettings() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUrl = async () => {
      const currentUrl = await fetchConfiguredBackendUrl();
      setUrl(currentUrl);
    };
    loadUrl();
  }, []);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('http')) {
      setError('URL harus diawali dengan http:// atau https://');
      return;
    }

    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      await setDoc(doc(db, 'config', 'settings'), {
        backendUrl: url,
        updatedAt: new Date()
      }, { merge: true });

      setBackendUrl(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving config:", err);
      setError('Gagal menyimpan ke Firebase. Cek koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-neutral-900 border border-white/10 rounded-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
          <Settings size={16} /> Infrastruktur Backend
        </h2>
        {saved && (
          <motion.span 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"
          >
            <CheckCircle2 size={12} /> Tersimpan
          </motion.span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1 flex items-center gap-2">
            <LinkIcon size={12} /> Endpoint API Upload (Cloudflare / Ngrok)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={cn(
                  "w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 focus:outline-none transition-all text-sm font-mono",
                  error ? "border-rose-500/50" : "focus:border-primary"
                )}
                placeholder="https://your-backend-url.cloudflare.com"
              />
              {error && <p className="absolute -bottom-5 left-1 text-[9px] text-rose-500 font-bold uppercase">{error}</p>}
            </div>
            <button 
              onClick={handleSaveUrl}
              disabled={loading}
              className={cn(
                "h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px]",
                saved ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 size={16} />
                  Sudah Update
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update URL
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium mt-4 ml-1 italic opacity-60">
            ⚠️ Perubahan URL backend akan berdampak langsung pada seluruh proses upload user. Pastikan URL aktif.
          </p>
        </div>
      </div>
    </section>
  );
}
