// Homepage logic: list videos with infinite scroll, lazy-load, animations,
// and resume in-progress uploads from localStorage.

const PAGE_SIZE = 6;
const PLACEHOLDER_THUMB =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="%23201f1f"/><text x="8" y="5.5" font-size="1.2" text-anchor="middle" fill="%23c0c6d6" font-family="sans-serif">No thumbnail</text></svg>';

const grid = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');
const sentinel = document.getElementById('loadMoreSentinel');

let lastDoc = null;
let isLoading = false;
let reachedEnd = false;
let totalLoaded = 0;

// IntersectionObserver for lazy-loading thumbnails
const lazyImgObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src) { img.src = src; img.removeAttribute('data-src'); }
      lazyImgObserver.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

// IntersectionObserver for fade-in animation
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

function clearSkeletons() {
  grid.querySelectorAll('.skeleton-card').forEach(n => n.remove());
}

function createCard({ id, title, thumbnail }) {
  const a = document.createElement('a');
  a.href = `/watch.html?v=${encodeURIComponent(id)}`;
  a.className = 'fade-in-card space-y-2 group';
  a.innerHTML = `
    <div class="aspect-video rounded-lg overflow-hidden glass-edge bg-surface-container relative group-active:scale-95 transition-transform">
      <img alt="${escapeHtml(title)}" class="w-full h-full object-cover"
           data-src="${thumbnail || PLACEHOLDER_THUMB}"
           src="${PLACEHOLDER_THUMB}" loading="lazy"/>
      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
        <span class="material-symbols-outlined text-white text-5xl" style="font-variation-settings:'FILL' 1;">play_circle</span>
      </div>
    </div>
    <h4 class="font-body-sm font-bold truncate px-1">${escapeHtml(title || 'Untitled')}</h4>
  `;
  const img = a.querySelector('img');
  lazyImgObserver.observe(img);
  animObserver.observe(a);
  return a;
}

function createUploadingCard(state) {
  const div = document.createElement('div');
  div.id = 'uploadingCard';
  div.className = 'fade-in-card space-y-2 col-span-2';
  div.innerHTML = `
    <div class="aspect-video rounded-lg overflow-hidden glass-edge bg-surface-container relative">
      <img class="w-full h-full object-cover opacity-70" src="${state.thumbnail || PLACEHOLDER_THUMB}" alt=""/>
      <div class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 gap-2">
        <span class="material-symbols-outlined text-[#0A84FF] text-4xl animate-pulse">cloud_upload</span>
        <p id="uploadCardStatus" class="text-white font-bold text-center">Video sedang diupload...</p>
        <div class="progress-track w-full max-w-xs"><div id="uploadCardFill" class="progress-fill" style="width:${state.progress||0}%"></div></div>
        <p id="uploadCardPct" class="text-label-caps text-white/80">${Math.round(state.progress||0)}%</p>
      </div>
    </div>
    <h4 class="font-body-sm font-bold truncate px-1">${escapeHtml(state.title || 'Untitled')}</h4>
  `;
  animObserver.observe(div);
  return div;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadMore() {
  if (isLoading || reachedEnd) return;
  isLoading = true;
  sentinel.textContent = 'Memuat...';
  try {
    const fb = window.__fb;
    const colRef = fb.collection(fb.db, 'videos');
    const q = lastDoc
      ? fb.query(colRef, fb.orderBy('createdAt','desc'), fb.startAfter(lastDoc), fb.limit(PAGE_SIZE))
      : fb.query(colRef, fb.orderBy('createdAt','desc'), fb.limit(PAGE_SIZE));
    const snap = await fb.getDocs(q);
    if (snap.empty && totalLoaded === 0) {
      clearSkeletons();
      emptyState.classList.remove('hidden');
      sentinel.textContent = '';
      reachedEnd = true;
      return;
    }
    clearSkeletons();
    snap.forEach(d => {
      const data = d.data();
      grid.appendChild(createCard({ id: d.id, title: data.title, thumbnail: data.thumbnail }));
      totalLoaded++;
    });
    lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
    if (snap.size < PAGE_SIZE) {
      reachedEnd = true;
      sentinel.textContent = totalLoaded > 0 ? '— Semua video telah dimuat —' : '';
    } else {
      sentinel.textContent = '';
    }
  } catch (err) {
    console.error('[home] loadMore error', err);
    sentinel.innerHTML = `<button id="retryLoad" class="text-[#0A84FF]">Gagal memuat. Coba lagi</button>`;
    document.getElementById('retryLoad')?.addEventListener('click', () => { sentinel.textContent=''; loadMore(); });
  } finally {
    isLoading = false;
  }
}

// Debounced infinite scroll via IntersectionObserver
const scrollObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: '300px' });

// ====== Resume in-progress upload from localStorage ======
function renderUploadingCardFromStorage() {
  try {
    const raw = localStorage.getItem('stream:upload');
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || state.status === 'done') return;
    let card = document.getElementById('uploadingCard');
    if (!card) {
      card = createUploadingCard(state);
      grid.prepend(card);
    } else {
      const fill = card.querySelector('#uploadCardFill');
      const pct = card.querySelector('#uploadCardPct');
      const status = card.querySelector('#uploadCardStatus');
      if (fill) fill.style.width = (state.progress||0) + '%';
      if (pct) pct.textContent = Math.round(state.progress||0) + '%';
      if (status) {
        if (state.status === 'error') status.textContent = 'Upload gagal — buka halaman upload untuk retry';
        else if (state.status === 'finalizing') status.textContent = 'Menyimpan ke database...';
        else status.textContent = 'Video sedang diupload...';
      }
    }
  } catch (e) { console.warn(e); }
}

// Listen for storage updates from upload tab
window.addEventListener('storage', (e) => {
  if (e.key === 'stream:upload') {
    if (!e.newValue) {
      // Upload selesai → hapus card sementara, refresh feed
      document.getElementById('uploadingCard')?.remove();
      lastDoc = null; reachedEnd = false; totalLoaded = 0;
      grid.innerHTML = '';
      loadMore();
    } else {
      renderUploadingCardFromStorage();
    }
  }
});

// Init
renderUploadingCardFromStorage();
loadMore().then(() => scrollObserver.observe(sentinel));

// Also poll localStorage in same tab (storage event tidak fire untuk same tab)
setInterval(renderUploadingCardFromStorage, 1000);
