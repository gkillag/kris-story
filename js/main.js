// ============ MAIN — НАВИГАЦИЯ И МЕНЮ ============

// ============ ЗАПУСК СЦЕН (было: технодемка) ============
function startDemo() {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  if (!window.musicPlaying && !window.audioSettings.muted) {
    if (typeof toggleMusic === 'function') toggleMusic();
  }

  // Останавливаем canvas меню
  window.menuActive = false;
  const menuCanvas = document.getElementById('menuCanvas');
  if (menuCanvas) {
    menuCanvas.style.transition = 'opacity 0.8s ease';
    menuCanvas.style.opacity = '0';
    setTimeout(() => { menuCanvas.style.display = 'none'; }, 800);
  }

  // Запускаем сцены
  if (typeof startScenes === 'function') {
    startScenes();
  }
}

// ============ НАСТРОЙКИ ============
function showSettings() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageSettings');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');
}

function hideSettings() {
  document.getElementById('stageSettings').classList.add('hidden');
  const m = document.getElementById('stageMenu');
  m.classList.remove('hidden');
  m.classList.add('stage-fade');
}

// ============ ВОЗВРАТ В МЕНЮ ============
function backToMenu() {
  // Скрываем все экраны
  ['stageStats', 'stageCredits', 'stageCalendar', 'stageSettings', 'stageDemo'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (typeof stopCredits === 'function') stopCredits();

  // Возвращаем canvas меню
  window.menuActive = true;
  const menuCanvas = document.getElementById('menuCanvas');
  if (menuCanvas) {
    menuCanvas.style.display = 'block';
    menuCanvas.style.opacity = '0';
    setTimeout(() => { menuCanvas.style.opacity = '1'; }, 50);
  }

  // Сбрасываем эффекты сцены
  document.getElementById('sceneBg').classList.remove('active');
  document.getElementById('effectsLayer').classList.remove('active');
  document.getElementById('vignette').classList.remove('active');

  // Показываем меню
  const m = document.getElementById('stageMenu');
  m.classList.remove('hidden');
  m.classList.add('stage-fade');
}

// ============ ТОСТ ============
function showToast(text) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  document.getElementById('toastText').textContent = text;
  toast.classList.add('show');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

// ============ СЧЁТЧИК ДНЕЙ ============
function calcDaysSince() {
  const now = new Date();
  const diffMs = now - window.START_DATE;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatStartDate() {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const d = window.START_DATE;
  return `с ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ============ ВЕРСИЯ ИГРЫ ============
function renderGameVersion() {
  const el = document.getElementById('gameVersion');
  if (!el) return;
  el.textContent = 'v' + (window.GAME_VERSION || '0.0');
  el.title = 'KRIS STORY · версия ' + (window.GAME_VERSION || '0.0');
}

// ============ СЧЁТЧИК ДНЕЙ В МЕНЮ ============
function renderMenuDays() {
  const numEl = document.getElementById('menuDaysNum');
  const sinceEl = document.getElementById('menuSince');
  if (!numEl || !sinceEl) return;
  const days = calcDaysSince();
  numEl.textContent = days.toLocaleString('ru-RU');
  sinceEl.textContent = formatStartDate();
}

// ============ ИСКРЫ ФОНА (меню, стиль «книга») ============
function spawnMenuMotes() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = window.innerWidth < 500 ? 10 : 18;
  for (let i = 0; i < count; i++) {
    const m = document.createElement('div');
    m.className = 'dust-mote';
    m.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
    m.style.setProperty('--dur', (12 + Math.random() * 14).toFixed(1) + 's');
    m.style.setProperty('--delay', (-Math.random() * 20).toFixed(1) + 's');
    m.style.setProperty('--drift', ((Math.random() - 0.5) * 120).toFixed(0) + 'px');
    document.body.appendChild(m);
  }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем настройки звука ещё раз (на случай, если audio.js не успел)
  if (typeof loadSettings === 'function') loadSettings();

  // Версия игры и дни вместе в меню
  renderGameVersion();
  renderMenuDays();
  spawnMenuMotes();

  // Приветствие в консоли — для тебя
  console.log('%c🎭 KRIS STORY v' + (window.GAME_VERSION || '?'), 'color: #c9a3ff; font-size: 20px; font-weight: bold;');
  console.log('%cДанных из TG: ' + (window.TG_STATS ? window.TG_STATS.totalMessages : '—') + ' сообщений',
              'color: #9d6ee8; font-size: 12px;');
});

// ============ ЭКСПОРТ ============
window.startDemo = startDemo;
window.showSettings = showSettings;
window.hideSettings = hideSettings;
window.backToMenu = backToMenu;
window.showToast = showToast;
window.calcDaysSince = calcDaysSince;
window.formatStartDate = formatStartDate;
window.renderGameVersion = renderGameVersion;
window.renderMenuDays = renderMenuDays;
