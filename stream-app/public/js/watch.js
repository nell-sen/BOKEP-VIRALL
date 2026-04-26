// Watch page logic: load video by ?v=<docId> from Firestore, real player controls.

const params = new URLSearchParams(location.search);
const videoId = params.get('v');

const player = document.getElementById('player');
const titleEl = document.getElementById('videoTitle');
const metaEl = document.getElementById('videoMeta');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const seekBar = document.getElementById('seekBar');
const seekFill = document.getElementById('seekFill');
const seekThumb = document.getElementById('seekThumb');
const curTime = document.getElementById('curTime');
const remTime = document.getElementById('remTime');
const volSlider = document.getElementById('volSlider');
const fsBtn = document.getElementById('fsBtn');
const errorOverlay = document.getElementById('errorOverlay');
const errorMsg = document.getElementById('errorMsg');

function showError(msg) {
  errorMsg.textContent = msg;
  errorOverlay.classList.remove('hidden');
}

function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${m}:${String(sec).padStart(2,'0')}`;
}

async function init() {
  if (!videoId) return showError('Video ID tidak ditemukan.');
  try {
    const fb = window.__fb;
    const snap = await fb.getDoc(fb.doc(fb.db, 'videos', videoId));
    if (!snap.exists()) return showError('Video tidak ditemukan.');
    const data = snap.data();
    titleEl.textContent = data.title || 'Untitled';
    metaEl.textContent = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'Streaming';
    document.title = `${data.title || 'Video'} — STREAM`;

    if (!data.url) return showError('URL video kosong.');
    player.src = data.url;
    if (data.thumbnail) player.poster = data.thumbnail;
  } catch (e) {
    console.error(e);
    showError('Gagal memuat video: ' + e.message);
  }
}

// === Player controls ===
function togglePlay() {
  if (player.paused) player.play().catch(e => console.warn(e));
  else player.pause();
}
playBtn.addEventListener('click', togglePlay);
player.addEventListener('click', togglePlay);

player.addEventListener('play', () => playIcon.textContent = 'pause');
player.addEventListener('pause', () => playIcon.textContent = 'play_arrow');
player.addEventListener('ended', () => playIcon.textContent = 'replay');

rewindBtn.addEventListener('click', () => { player.currentTime = Math.max(0, player.currentTime - 10); });
forwardBtn.addEventListener('click', () => { player.currentTime = Math.min(player.duration||0, player.currentTime + 10); });

player.addEventListener('timeupdate', () => {
  const d = player.duration || 0;
  const c = player.currentTime || 0;
  const pct = d > 0 ? (c/d)*100 : 0;
  seekFill.style.width = pct + '%';
  seekThumb.style.left = pct + '%';
  curTime.textContent = fmtTime(c);
  remTime.textContent = '-' + fmtTime(d - c);
});

// Seek
let isDragging = false;
function seekFromEvent(e) {
  const rect = seekBar.getBoundingClientRect();
  const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  if (player.duration) player.currentTime = pct * player.duration;
}
seekBar.addEventListener('pointerdown', (e) => { isDragging = true; seekBar.setPointerCapture(e.pointerId); seekFromEvent(e); });
seekBar.addEventListener('pointermove', (e) => { if (isDragging) seekFromEvent(e); });
seekBar.addEventListener('pointerup', (e) => { isDragging = false; seekBar.releasePointerCapture(e.pointerId); });

// Volume
volSlider.addEventListener('input', () => { player.volume = volSlider.value / 100; });

// Fullscreen
fsBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    (player.requestFullscreen || player.webkitEnterFullscreen)?.call(player);
  } else {
    document.exitFullscreen();
  }
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowLeft') player.currentTime = Math.max(0, player.currentTime - 5);
  else if (e.key === 'ArrowRight') player.currentTime = Math.min(player.duration||0, player.currentTime + 5);
  else if (e.key === 'f') fsBtn.click();
});

player.addEventListener('error', () => showError('Video gagal dimuat dari sumber.'));

init();
