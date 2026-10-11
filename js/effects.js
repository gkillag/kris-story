// ============ CANVAS ФОН МЕНЮ ============
// Рисует звёзды, магические частицы и парящие руны

const menuCanvas = document.getElementById('menuCanvas');
const mctx = menuCanvas ? menuCanvas.getContext('2d') : null;
let mW, mH;

function resizeMenuCanvas() {
  if (!menuCanvas) return;
  mW = menuCanvas.width = window.innerWidth;
  mH = menuCanvas.height = window.innerHeight;
}

if (menuCanvas) {
  resizeMenuCanvas();
  window.addEventListener('resize', resizeMenuCanvas);
}

// ============ ЗВЁЗДЫ ============
const stars = [];
for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * mW,
    y: Math.random() * mH,
    size: Math.random() * 1.8 + 0.3,
    phase: Math.random() * Math.PI * 2,
    hue: 260 + Math.random() * 40,
  });
}

// ============ МАГИЧЕСКИЕ ЧАСТИЦЫ ============
const magicParticles = [];
for (let i = 0; i < 40; i++) {
  magicParticles.push({
    x: Math.random() * mW,
    y: Math.random() * mH,
    size: Math.random() * 3 + 1,
    speedY: Math.random() * 0.5 + 0.2,
    speedX: (Math.random() - 0.5) * 0.3,
    phase: Math.random() * Math.PI * 2,
    hue: 270 + Math.random() * 40,
  });
}

// ============ ПАРЯЩИЕ РУНЫ ============
const runes = ['✦', '✧', '❈', '✺', '☾', '✵', '❋', '✹'];
const floatingRunes = [];
for (let i = 0; i < 8; i++) {
  floatingRunes.push({
    x: Math.random() * mW,
    y: Math.random() * mH,
    char: runes[Math.floor(Math.random() * runes.length)],
    size: Math.random() * 14 + 10,
    speedY: -(Math.random() * 0.15 + 0.05),
    phase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.005,
    alpha: Math.random() * 0.3 + 0.15,
  });
}

// ============ ОСНОВНОЙ ЦИКЛ РИСОВАНИЯ ============
let menuTime = 0;
let menuActive = true;

function drawMenu() {
  if (!menuActive) {
    requestAnimationFrame(drawMenu);
    return;
  }
  if (!mctx) return;

  menuTime += 0.016;

  // Фон — радиальный градиент
  const bg = mctx.createRadialGradient(mW / 2, mH / 2, 0, mW / 2, mH / 2, Math.max(mW, mH));
  bg.addColorStop(0, '#1a0a2e');
  bg.addColorStop(0.5, '#120620');
  bg.addColorStop(1, '#08020f');
  mctx.fillStyle = bg;
  mctx.fillRect(0, 0, mW, mH);

  // Пульсирующее свечение в центре
  const pulseRadius = 200 + Math.sin(menuTime * 0.8) * 40;
  const glow = mctx.createRadialGradient(mW / 2, mH / 2, 0, mW / 2, mH / 2, pulseRadius);
  glow.addColorStop(0, `rgba(160, 100, 255, ${0.08 + Math.sin(menuTime) * 0.03})`);
  glow.addColorStop(0.5, 'rgba(120, 60, 200, 0.04)');
  glow.addColorStop(1, 'transparent');
  mctx.fillStyle = glow;
  mctx.fillRect(0, 0, mW, mH);

  // Звёзды (мерцают)
  stars.forEach((s) => {
    const twinkle = 0.4 + Math.sin(menuTime * 2 + s.phase) * 0.6;
    mctx.beginPath();
    mctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    mctx.fillStyle = `hsla(${s.hue}, 80%, 80%, ${twinkle * 0.7})`;
    mctx.shadowBlur = 8;
    mctx.shadowColor = `hsla(${s.hue}, 90%, 70%, 0.8)`;
    mctx.fill();
  });
  mctx.shadowBlur = 0;

  // Магические частицы (летят вверх)
  magicParticles.forEach((p) => {
    p.y -= p.speedY;
    p.x += Math.sin(menuTime + p.phase) * 0.3 + p.speedX;
    if (p.y < -10) {
      p.y = mH + 10;
      p.x = Math.random() * mW;
    }
    const pulse = 0.6 + Math.sin(menuTime * 3 + p.phase) * 0.4;
    mctx.beginPath();
    mctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
    mctx.fillStyle = `hsla(${p.hue}, 85%, 75%, ${0.7 * pulse})`;
    mctx.shadowBlur = 15;
    mctx.shadowColor = `hsla(${p.hue}, 95%, 70%, 0.9)`;
    mctx.fill();
  });
  mctx.shadowBlur = 0;

  // Парящие руны (крутятся, всплывают)
  floatingRunes.forEach((r) => {
    r.y += r.speedY;
    r.rotation += r.rotSpeed;
    if (r.y < -30) {
      r.y = mH + 30;
      r.x = Math.random() * mW;
      r.char = runes[Math.floor(Math.random() * runes.length)];
    }
    const float = Math.sin(menuTime * 1.5 + r.phase) * 5;
    const twinkle = 0.5 + Math.sin(menuTime * 2 + r.phase) * 0.5;

    mctx.save();
    mctx.translate(r.x, r.y + float);
    mctx.rotate(r.rotation);
    mctx.font = `${r.size}px 'Georgia', serif`;
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillStyle = `hsla(270, 90%, 85%, ${r.alpha * twinkle})`;
    mctx.shadowBlur = 20;
    mctx.shadowColor = `hsla(270, 100%, 80%, ${r.alpha * twinkle})`;
    mctx.fillText(r.char, 0, 0);
    mctx.restore();
  });
  mctx.shadowBlur = 0;

  requestAnimationFrame(drawMenu);
}

if (menuCanvas) drawMenu();

// ============ ФОН СЦЕНЫ ============
function setBackground(bg) {
  const el = document.getElementById('sceneBg');
  if (!el) return;
  el.style.background = bg;
  el.style.backgroundSize = '400% 400%';
  el.classList.add('active');
}

// ============ ЭФФЕКТЫ (туман, мерцание, пыль, дождь) ============
function setEffects(effects) {
  const layer = document.getElementById('effectsLayer');
  const vignette = document.getElementById('vignette');
  if (!layer || !vignette) return;

  layer.classList.add('active');
  vignette.classList.add('active');

  // Сброс
  document.getElementById('fogEffect').classList.remove('on');
  document.getElementById('flickerEffect').classList.remove('on');
  document.getElementById('dustEffect').classList.remove('on');
  document.getElementById('rainEffect').classList.remove('on');

  effects.forEach((e) => {
    if (e === 'fog') document.getElementById('fogEffect').classList.add('on');
    if (e === 'flicker') document.getElementById('flickerEffect').classList.add('on');
    if (e === 'dust') {
      document.getElementById('dustEffect').classList.add('on');
      startDust();
    }
    if (e === 'rain') {
      document.getElementById('rainEffect').classList.add('on');
      startRain();
    }
  });
}

// ============ ПЫЛЬ (генерируется один раз) ============
let dustStarted = false;
function startDust() {
  if (dustStarted) return;
  dustStarted = true;
  const container = document.getElementById('dustEffect');
  for (let i = 0; i < 25; i++) {
    const d = document.createElement('div');
    d.className = 'dust';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.animationDuration = (Math.random() * 15 + 15) + 's';
    d.style.animationDelay = Math.random() * 10 + 's';
    container.appendChild(d);
  }
}

// ============ ДОЖДЬ ============
let rainStarted = false;
function startRain() {
  if (rainStarted) return;
  rainStarted = true;
  const container = document.getElementById('rainEffect');
  for (let i = 0; i < 40; i++) {
    const r = document.createElement('div');
    r.className = 'raindrop';
    r.style.left = Math.random() * 100 + 'vw';
    r.style.animationDuration = (Math.random() * 0.6 + 0.6) + 's';
    r.style.animationDelay = Math.random() * 2 + 's';
    r.style.opacity = Math.random() * 0.5 + 0.3;
    container.appendChild(r);
  }
}

// ============ ВСПЫШКИ ============
function triggerFlash(type) {
  const el = type === 'blood'
    ? document.getElementById('bloodFlash')
    : document.getElementById('flashOverlay');
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
}

// ============ САЛЮТ (частицы на canvas места не нужны — рисуем div-ами) ============
function firework(x, y) {
  const colors = ['#c9a3ff', '#f0d0ff', '#fff', '#9d6ee8', '#d0a8ff'];
  for (let i = 0; i < 50; i++) {
    const dot = document.createElement('div');
    dot.className = 'pulse-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];
    dot.style.boxShadow = `0 0 10px ${dot.style.background}`;
    document.body.appendChild(dot);

    const angle = (i / 50) * Math.PI * 2;
    const dist = Math.random() * 120 + 60;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    dot.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
      ],
      {
        duration: 900 + Math.random() * 400,
        easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)',
      }
    );

    setTimeout(() => dot.remove(), 1400);
  }
}

// ============ ЭКСПОРТ ============
window.menuActive = menuActive; // управляется из main.js
window.setBackground = setBackground;
window.setEffects = setEffects;
window.triggerFlash = triggerFlash;
window.firework = firework;