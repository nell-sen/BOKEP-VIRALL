import React, { useState, useEffect } from 'react';
import { uploadService } from '../services/uploadService';
import { UploadState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export default function UploadStatusOverlay() {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    return uploadService.subscribe(() => {
      setUploads(uploadService.getUploads());
    });
  }, []);

  if (uploads.length === 0) return null;

  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/50"
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between bg-neutral-800 px-4 py-3 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {uploadingCount > 0 ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <CheckCircle2 size={16} className="text-green-500" />
              )}
              <span className="text-sm font-bold">
                {uploadingCount > 0 
                  ? `Mengunggah ${uploadingCount} Video...` 
                  : "Semua Selesai"}
              </span>
            </div>
            <button className="text-neutral-400 hover:text-white">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {/* List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="max-h-60 overflow-y-auto divide-y divide-white/5"
              >
                {uploads.map((upload) => (
                  <div key={upload.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-1 gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                          {upload.tempThumbnail && (
                            <img src={upload.tempThumbnail} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-bold leading-tight">{upload.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-widest font-black text-neutral-500">
                            {upload.status === 'uploading' ? `${upload.progress}% • Mengunggah` : 
                             upload.status === 'completed' ? 'Selesai' : 'Gagal'}
                          </p>
                        </div>
                      </div>
                      
                      {upload.status === 'error' && (
                        <button 
                          onClick={() => uploadService.removeUpload(upload.id)}
                          className="text-rose-500 hover:text-rose-400"
                        >
                          <X size={16} />
                        </button>
                      )}
                      {upload.status === 'completed' && (
                        <button 
                          onClick={() => uploadService.removeUpload(upload.id)}
                          className="text-green-500 hover:text-green-400"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>

                    {upload.status === 'uploading' && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                        <motion.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}

                    {upload.status === 'error' && upload.error && (
                      <p className="text-[10px] text-rose-500 leading-tight">
                        Error: {upload.error}
                      </p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
