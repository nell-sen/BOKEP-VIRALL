// Upload page logic: validate file, generate thumbnail, upload via XHR (proxy to Catbox),
// realtime progress, persist state to localStorage, save metadata to Firestore.

const MAX_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime'];
const PLACEHOLDER_THUMB =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="%23201f1f"/><text x="8" y="5.5" font-size="1.2" text-anchor="middle" fill="%23c0c6d6" font-family="sans-serif">No thumbnail</text></svg>';

const $ = (id) => document.getElementById(id);
const titleInput = $('titleInput');
const fileInput = $('fileInput');
const dropzone = $('dropzone');
const fileLabel = $('fileLabel');
const previewSection = $('previewSection');
const thumbPreview = $('thumbPreview');
const fileMeta = $('fileMeta');
const errorBox = $('errorBox');
const errorText = $('errorText');
const uploadBtn = $('uploadBtn');
const thumbCanvas = $('thumbCanvas');
const thumbExtractor = $('thumbExtractor');

let selectedFile = null;
let thumbnailDataUrl = null;
let xhr = null;

function showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.remove('hidden');
}
function clearError() { errorBox.classList.add('hidden'); errorText.textContent = ''; }

function updateButton() {
  uploadBtn.disabled = !selectedFile || !titleInput.value.trim();
}

function fmtSize(bytes) {
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

async function generateThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    thumbExtractor.src = url;
    thumbExtractor.muted = true;

    const tries = [1, 2, 3, 0.5];
    let attempt = 0;

    const cleanup = () => { URL.revokeObjectURL(url); };

    const tryCapture = () => {
      if (attempt >= tries.length) { cleanup(); return resolve(null); }
      try { thumbExtractor.currentTime = tries[attempt++]; }
      catch { cleanup(); return resolve(null); }
    };

    thumbExtractor.addEventListener('loadeddata', tryCapture, { once: false });

    thumbExtractor.addEventListener('seeked', () => {
      try {
        const w = thumbExtractor.videoWidth;
        const h = thumbExtractor.videoHeight;
        if (!w || !h) { tryCapture(); return; }
        // Resize to max 640px wide (keep aspect)
        const maxW = 640;
        const scale = Math.min(1, maxW / w);
        thumbCanvas.width = Math.round(w * scale);
        thumbCanvas.height = Math.round(h * scale);
        const ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(thumbExtractor, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
        if (dataUrl && dataUrl.length > 1000) { cleanup(); resolve(dataUrl); }
        else tryCapture();
      } catch (e) {
        console.warn('Thumbnail capture failed', e);
        tryCapture();
      }
    });

    thumbExtractor.addEventListener('error', () => { cleanup(); resolve(null); }, { once: true });
  });
}

async function handleFile(file) {
  clearError();
  if (!file) return;
  // Validate type — accept by MIME or extension
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const validExt = ['mp4','webm','mov'].includes(ext);
  if (!ALLOWED.includes(file.type) && !validExt) {
    return showError('Format tidak didukung. Gunakan MP4, WEBM, atau MOV.');
  }
  if (file.size > MAX_SIZE) {
    return showError(`File terlalu besar (${fmtSize(file.size)}). Maksimal 200MB.`);
  }

  selectedFile = file;
  fileLabel.textContent = file.name;
  fileMeta.textContent = `${fmtSize(file.size)} • ${file.type || ext.toUpperCase()}`;
  previewSection.classList.remove('hidden');
  thumbPreview.src = PLACEHOLDER_THUMB;

  // Auto-fill title from filename if empty
  if (!titleInput.value.trim()) {
    titleInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 100);
  }

  thumbnailDataUrl = await generateThumbnail(file);
  thumbPreview.src = thumbnailDataUrl || PLACEHOLDER_THUMB;
  updateButton();
}

// === DOM events ===
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
titleInput.addEventListener('input', updateButton);

['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => {
  e.preventDefault(); dropzone.classList.add('drag-over');
}));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, (e) => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
}));
dropzone.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files[0];
  if (f) { fileInput.files = e.dataTransfer.files; handleFile(f); }
});

// === Upload flow ===
function persistState(state) {
  try { localStorage.setItem('stream:upload', JSON.stringify(state)); } catch { }
}
function clearState() { try { localStorage.removeItem('stream:upload'); } catch { } }

uploadBtn.addEventListener('click', () => startUpload());

function startUpload() {
  if (!selectedFile || !titleInput.value.trim()) return;
  clearError();
  uploadBtn.disabled = true;

  const title = titleInput.value.trim();
  const state = {
    title,
    thumbnail: thumbnailDataUrl || '',
    progress: 0,
    status: 'uploading',
    startedAt: Date.now()
  };
  persistState(state);

  // Redirect ke homepage agar user lihat card "sedang upload"
  // Tapi karena upload harus tetap jalan, kita TIDAK redirect.
  // Instead, render in-page progress UI dan biarkan upload selesai.
  renderInPageProgress(state);

  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', selectedFile, selectedFile.name);

  xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload', true);

  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = (e.loaded / e.total) * 100;
    state.progress = pct;
    persistState({ ...state, progress: pct });
    updateInPageProgress(pct, 'Mengupload...');
  };

  xhr.onload = async () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const url = (xhr.responseText || '').trim();
      if (!/^https?:\/\//.test(url)) {
        return failUpload('Catbox merespons tidak valid: ' + url.slice(0,200));
      }
      updateInPageProgress(100, 'Menyimpan ke database...');
      persistState({ ...state, progress: 100, status: 'finalizing' });
      try {
        const fb = window.__fb;
        await fb.addDoc(fb.collection(fb.db, 'videos'), {
          title,
          url,
          thumbnail: thumbnailDataUrl || '',
          createdAt: fb.serverTimestamp()
        });
        clearState();
        updateInPageProgress(100, 'Selesai! Mengarahkan...');
        setTimeout(() => { window.location.href = '/index.html'; }, 800);
      } catch (e) {
        console.error(e);
        failUpload('Gagal menyimpan metadata ke Firestore: ' + e.message);
      }
    } else {
      failUpload(`Upload gagal (HTTP ${xhr.status}): ${xhr.responseText?.slice(0,200) || 'unknown error'}`);
    }
  };

  xhr.onerror = () => failUpload('Network error. Periksa koneksi internet Anda.');
  xhr.ontimeout = () => failUpload('Upload timeout. File mungkin terlalu besar.');
  xhr.send(formData);
}

function failUpload(msg) {
  showError(msg);
  persistState({
    title: titleInput.value.trim(),
    thumbnail: thumbnailDataUrl || '',
    progress: 0,
    status: 'error',
    error: msg
  });
  renderRetryUI(msg);
}

// === In-page progress UI ===
let progressEl = null;
function renderInPageProgress(state) {
  if (progressEl) progressEl.remove();
  progressEl = document.createElement('div');
  progressEl.className = 'space-y-2 p-4 rounded-lg bg-surface-container glass-edge';
  progressEl.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-bold" id="upStatus">Memulai...</span>
      <span class="text-label-caps text-on-surface-variant" id="upPct">0%</span>
    </div>
    <div class="progress-track"><div class="progress-fill" id="upFill"></div></div>
  `;
  uploadBtn.parentNode.insertBefore(progressEl, uploadBtn);
  uploadBtn.classList.add('hidden');
}
function updateInPageProgress(pct, status) {
  if (!progressEl) return;
  progressEl.querySelector('#upFill').style.width = pct + '%';
  progressEl.querySelector('#upPct').textContent = Math.round(pct) + '%';
  progressEl.querySelector('#upStatus').textContent = status;
}
function renderRetryUI(msg) {
  if (progressEl) {
    progressEl.querySelector('#upStatus').textContent = 'Gagal';
    progressEl.querySelector('#upStatus').classList.add('text-error');
  }
  uploadBtn.classList.remove('hidden');
  uploadBtn.disabled = false;
  uploadBtn.querySelector('span:last-child').textContent = 'Retry Upload';
}

// On load: kalau ada upload tertinggal yang error, tampilkan retry
(function restoreState() {
  try {
    const raw = localStorage.getItem('stream:upload');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.status === 'error') {
      titleInput.value = s.title || '';
      thumbnailDataUrl = s.thumbnail || null;
      if (thumbnailDataUrl) { thumbPreview.src = thumbnailDataUrl; previewSection.classList.remove('hidden'); }
      showError('Upload sebelumnya gagal: ' + (s.error || 'unknown'));
    }
  } catch { }
})();
