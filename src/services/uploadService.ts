import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UploadState } from '../types';
import toast from 'react-hot-toast';

// Default fallback URL - Menggunakan URL yang Anda berikan
let dynamicBackendUrl = 'https://accounts-snake-downloadable-his.trycloudflare.com';

// Function to update the URL globally
export const setBackendUrl = (url: string) => {
  // Pastikan URL bersih dari trailing slash
  dynamicBackendUrl = url.replace(/\/$/, "");
};

// Function to fetch the URL from Firebase
export const fetchConfiguredBackendUrl = async () => {
  try {
    const docRef = doc(db, 'config', 'settings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().backendUrl) {
      dynamicBackendUrl = docSnap.data().backendUrl.replace(/\/$/, "");
      return dynamicBackendUrl;
    }
  } catch (e) {
    console.error("Error fetching config:", e);
  }
  return dynamicBackendUrl;
};

class UploadService {
  private activeUploads: Map<string, { xhr: XMLHttpRequest; state: UploadState }> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.restoreFromStorage();
    fetchConfiguredBackendUrl();
  }

  private restoreFromStorage() {
    const saved = localStorage.getItem('active_uploads');
    if (saved) {
      try {
        localStorage.removeItem('active_uploads');
      } catch (e) {
        localStorage.removeItem('active_uploads');
      }
    }
  }

  private notify() {
    this.listeners.forEach(l => l());
    this.syncToStorage();
  }

  private syncToStorage() {
    const states = Array.from(this.activeUploads.values()).map(u => u.state);
    localStorage.setItem('active_uploads', JSON.stringify(states));
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getUploads() {
    return Array.from(this.activeUploads.values()).map(u => u.state);
  }

  removeUpload(id: string) {
    const current = this.activeUploads.get(id);
    if (current && current.state.status !== 'uploading') {
      this.activeUploads.delete(id);
      this.notify();
    }
  }

  async startUpload(title: string, file: File, tempThumbnail: string, category: string = 'Hiburan', duration: number = 0) {
    if (dynamicBackendUrl.includes('YOUR-TUNNEL-URL')) {
      const id = Math.random().toString(36).substring(7);
      const errState: UploadState = {
        id, title, progress: 0, status: 'error', tempThumbnail
      };
      this.activeUploads.set(id, { xhr: new XMLHttpRequest(), state: errState });
      this.notify();
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const xhr = new XMLHttpRequest();
    
    const uploadState: UploadState = {
      id,
      title,
      progress: 0,
      status: 'uploading',
      tempThumbnail
    };

    this.activeUploads.set(id, { xhr, state: uploadState });
    this.notify();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        const current = this.activeUploads.get(id);
        if (current) {
          current.state.progress = progress;
          this.notify();
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            await addDoc(collection(db, 'videos'), {
              title,
              titleLower: title.toLowerCase(),
              url: response.url,
              thumbnail: response.thumbnails[0] || tempThumbnail,
              createdAt: serverTimestamp(),
              category,
              duration
            });

            const current = this.activeUploads.get(id);
            if (current) {
              current.state.status = 'completed';
              current.state.progress = 100;
              this.notify();
              
              toast.success(`Video "${title}" berhasil diupload!`, {
                position: 'bottom-right',
                duration: 4000,
                style: {
                  background: '#171717',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)'
                }
              });

              setTimeout(() => {
                // Only auto-remove if successful, keep errors
                this.activeUploads.delete(id);
                this.notify();
              }, 10000);
            }
          } else {
            this.handleError(id, response.error || 'Upload failed');
          }
        } catch (e) {
          this.handleError(id, 'Invalid response from server');
        }
      } else {
        this.handleError(id, `Server error: ${xhr.status} (Endpoint mungkin salah)`);
      }
    };

    xhr.onerror = () => {
      this.handleError(id, 'Network error: Backend tidak aktif atau URL salah. Pastikan tunnel Anda berjalan.');
    };

    xhr.ontimeout = () => {
      this.handleError(id, 'Request timed out');
    };

    const formData = new FormData();
    formData.append('video', file);

    // Endpoint yang benar berdasarkan struktur Express backend Anda
    const finalUrl = dynamicBackendUrl.endsWith('/api/upload') 
      ? dynamicBackendUrl 
      : `${dynamicBackendUrl}/api/upload`;
    
    xhr.open('POST', finalUrl);
    xhr.send(formData);
  }

  private handleError(id: string, message: string) {
    const current = this.activeUploads.get(id);
    if (current) {
      current.state.status = 'error';
      current.state.error = message;
      current.state.progress = 0;
      console.error(`Upload ${id} error: ${message}`);
      this.notify();
      
      // We don't auto-delete errors to let user read them
    }
  }
}

export const uploadService = new UploadService();
