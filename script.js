/* =============================================================
   VARSHIL ARCADE — script.js
   Retro arcade CRT website JavaScript
   ============================================================= */

/* ---- Web Audio Context for beeps ---- */
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Play a short retro beep
 * @param {number} freq  - Frequency in Hz
 * @param {number} dur   - Duration in seconds
 * @param {'square'|'sawtooth'|'sine'} type - Oscillator type
 * @param {number} vol   - Volume 0-1
 */
function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.18) {
  try {
    const ctx = getAudio();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) { /* audio blocked — silent */ }
}

function coinBeep()   { beep(600, .07, 'square'); setTimeout(() => beep(900,.07,'square'), 80); }
function selectBeep() { beep(800, .06, 'square'); }
function hoverBeep()  { beep(500, .04, 'sine', .1); }
function playBeep()   { [300,500,700].forEach((f,i) => setTimeout(() => beep(f,.09,'sawtooth'), i*70)); }

/* ============================================================
   LOADING SCREEN
   ============================================================ */
(function initLoading() {
  const screen  = document.getElementById('loading-screen');
  const wrapper = document.getElementById('main-wrapper');
  const bar     = document.getElementById('load-bar');
  let progress  = 0;

  // Animate loading bar
  const tick = setInterval(() => {
    progress += Math.random() * 6 + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(tick);
    }
    bar.style.width = progress + '%';
  }, 60);

  function launch() {
    coinBeep();
    screen.style.transition = 'opacity .5s ease';
    screen.style.opacity = '0';
    setTimeout(() => {
      screen.style.display = 'none';
      wrapper.classList.remove('hidden');
      wrapper.style.animation = 'fadeUp .6s ease both';
    }, 500);
    // Remove listeners
    document.removeEventListener('keydown', launch);
    screen.removeEventListener('click', launch);
  }

  // Complete bar quickly on first interaction, else auto-launch after 3.5s
  screen.addEventListener('click', () => { bar.style.width = '100%'; setTimeout(launch, 200); });
  document.addEventListener('keydown', () => { bar.style.width = '100%'; setTimeout(launch, 200); });
  setTimeout(() => { if (progress < 100) { bar.style.width = '100%'; setTimeout(launch, 300); } }, 3500);
})();

/* ============================================================
   CRT FLICKER
   ============================================================ */
function startCrtEffects() {
  const frame = document.querySelector('.crt-frame');
  if (!frame) return;

  setInterval(() => {
    if (Math.random() > .97) {
      frame.style.opacity = (.88 + Math.random() * .1).toFixed(2);
      setTimeout(() => { frame.style.opacity = '1'; }, 40 + Math.random() * 60);
    }
  }, 150);

  // Occasional horizontal glitch line
  setInterval(() => {
    if (Math.random() > .93) {
      const line = document.createElement('div');
      line.style.cssText = `
        position:absolute; left:0; right:0;
        height:${1 + Math.floor(Math.random() * 2)}px;
        top:${Math.floor(Math.random() * 100)}%;
        background:rgba(0,255,255,${(.04 + Math.random() * .1).toFixed(2)});
        pointer-events:none; z-index:25;
        animation:none;
      `;
      frame.appendChild(line);
      setTimeout(() => line.remove(), 80 + Math.random() * 120);
    }
  }, 400);
}

/* ============================================================
   KEYBOARD NAVIGATION
   ============================================================ */
function initKeyboard() {
  const cards = Array.from(document.querySelectorAll('.game-card:not(.coming-soon)'));
  let idx = -1;

  function setFocus(i) {
    cards.forEach(c => c.classList.remove('kb-focus'));
    if (i >= 0 && i < cards.length) {
      cards[i].classList.add('kb-focus');
      cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      hoverBeep();
    }
    idx = i;
  }

  // Inject kb-focus style
  const s = document.createElement('style');
  s.textContent = `
    .game-card.kb-focus {
      border-color: var(--yellow) !important;
      box-shadow: 0 0 28px rgba(255,255,0,.7), 0 8px 24px rgba(0,0,0,.6) !important;
      transform: translateY(-4px) !important;
    }
  `;
  document.head.appendChild(s);

  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFocus((idx + 1) % cards.length);
        flashDpad('dp-down');
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFocus((idx - 1 + cards.length) % cards.length);
        flashDpad('dp-up');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (idx >= 0) {
          const btn = cards[idx].querySelector('.play-btn');
          if (btn && !btn.classList.contains('disabled')) {
            playBeep();
            spawnPixels(btn);
            setTimeout(() => btn.click(), 200);
          }
        }
        break;
    }
  });

  // D-pad button press feedback
  ['dp-up','dp-down','dp-left','dp-right'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      if (id === 'dp-up')    setFocus((idx - 1 + cards.length) % cards.length);
      if (id === 'dp-down')  setFocus((idx + 1) % cards.length);
    });
  });
}

function flashDpad(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('pressed');
  setTimeout(() => el.classList.remove('pressed'), 150);
}

/* ============================================================
   GAME CARD HOVER EFFECTS
   ============================================================ */
function initCardEffects() {
  document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
    card.addEventListener('mouseenter', () => hoverBeep());
  });

  // Play button click -> pixel burst + beep
  document.querySelectorAll('.play-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', e => {
      playBeep();
      spawnPixels(e.currentTarget);
      const name = btn.closest('.game-card').querySelector('.card-title').textContent;
      console.log(`%c▶ LOADING: ${name}`, 'color:#00ff00;font-family:monospace;font-size:14px;font-weight:bold;');
      incrementStat();
    });
  });
}

/* ============================================================
   PIXEL EXPLOSION EFFECT
   ============================================================ */
function spawnPixels(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const colors = ['#ff00ff','#00ffff','#ffff00','#00ff00','#ff4400'];

  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (Math.PI * 2 / 14) * i + (Math.random() - .5) * .5;
    const speed = 55 + Math.random() * 55;
    const size  = 3 + Math.floor(Math.random() * 4);

    p.style.cssText = `
      position:fixed; width:${size}px; height:${size}px;
      background:${color}; border-radius:1px;
      box-shadow:0 0 6px ${color};
      left:${cx}px; top:${cy}px;
      pointer-events:none; z-index:9999;
      transform:translate(-50%,-50%);
    `;
    document.body.appendChild(p);

    let frame = 0;
    const anim = setInterval(() => {
      frame++;
      const progress = frame / 28;
      p.style.left    = (cx + Math.cos(angle) * speed * progress) + 'px';
      p.style.top     = (cy + Math.sin(angle) * speed * progress + 30 * progress * progress) + 'px';
      p.style.opacity = (1 - progress).toFixed(2);
      if (frame >= 28) { clearInterval(anim); p.remove(); }
    }, 16);
  }
}

/* ============================================================
   ARCADE BUTTON FLASH (called from HTML onclick)
   ============================================================ */
function flashBtn(el) {
  selectBeep();
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 200);
}

/* ============================================================
   STATS TRACKING
   ============================================================ */
let gamesPlayed = parseInt(localStorage.getItem('va_played') || '0');

function incrementStat() {
  gamesPlayed++;
  localStorage.setItem('va_played', gamesPlayed);
  const el = document.getElementById('stat-played');
  if (el) el.textContent = String(gamesPlayed).padStart(2, '0');
}

function updateHiScore() {
  const stored = localStorage.getItem('va_hiscore') || '012600';
  const el1 = document.getElementById('hi-score-val');
  const el2 = document.getElementById('stat-score');
  if (el1) el1.textContent = stored;
  if (el2) el2.textContent = stored;
}

/* ============================================================
   ATTRACT MODE
   ============================================================ */
function initAttractMode() {
  const cards = Array.from(document.querySelectorAll('.game-card'));
  let timer, activeIdx = 0;

  function cycle() {
    cards.forEach(c => { c.style.borderColor = ''; c.style.boxShadow = ''; });
    const card = cards[activeIdx % cards.length];
    card.style.borderColor = 'var(--yellow)';
    card.style.boxShadow   = '0 0 22px rgba(255,255,0,.5)';
    activeIdx++;
    timer = setTimeout(cycle, 1800);
  }

  function resetAttract() {
    clearTimeout(timer);
    cards.forEach(c => { c.style.borderColor = ''; c.style.boxShadow = ''; });
    timer = setTimeout(cycle, 20000); // Start after 20s inactivity
  }

  document.addEventListener('mousemove',  resetAttract, { passive: true });
  document.addEventListener('keydown',    resetAttract, { passive: true });
  document.addEventListener('touchstart', resetAttract, { passive: true });
  resetAttract();
}

/* ============================================================
   GAME SELECT MODAL
   ============================================================ */
function initGameSelectModal() {
  const modal    = document.getElementById('game-select-modal');
  const closeBtn = document.getElementById('gs-close-btn');
  if (!modal) return;

  function openModal() {
    selectBeep();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    beep(300, .08, 'square');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // Expose open function globally
  window._openGameSelectModal = openModal;
}

window.gsLaunch = function(url) {
  playBeep();
  setTimeout(() => window.open(url, '_blank'), 200);
};

/* ============================================================
   SMOOTH SCROLL / START GAME button → open modal
   ============================================================ */
function initStartBtn() {
  const btn = document.getElementById('start-btn');
  if (!btn) return;
  btn.addEventListener('click', e => {
    e.preventDefault();
    if (window._openGameSelectModal) window._openGameSelectModal();
  });
}

/* ============================================================
   RETRO CONSOLE BANNER
   ============================================================ */
function printConsoleBanner() {
  const s = 'color:#00ffff;font-family:monospace;font-weight:bold;font-size:13px;';
  console.log('%c╔══════════════════════════════════════╗', s);
  console.log('%c║        🕹  VARSHIL ARCADE  🕹         ║', 'color:#ff00ff;font-family:monospace;font-weight:bold;font-size:13px;');
  console.log('%c╚══════════════════════════════════════╝', s);
  console.log('%c>>> System boot complete ✔', 'color:#00ff00;font-family:monospace;');
  console.log('%c>>> 2 games available', 'color:#ffff00;font-family:monospace;');
  console.log('%c>>> Use ↑↓ keys to navigate, ENTER to launch', 'color:#00ffff;font-family:monospace;');
}

/* ============================================================
   BOOT — Run everything when DOM is ready
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  startCrtEffects();
  initKeyboard();
  initCardEffects();
  initStartBtn();
  initGameSelectModal();
  initAttractMode();
  updateHiScore();

  // Restore played count display
  const sp = document.getElementById('stat-played');
  if (sp) sp.textContent = String(gamesPlayed).padStart(2, '0');

  printConsoleBanner();
});
