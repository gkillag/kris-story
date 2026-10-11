// ============ ТИТРЫ (автопрокрутка) ============

let creditsAnimId = null;
let creditsOffset = 0;
let creditsMaxOffset = 0;
let creditsSpeed = 1;
let creditsPlaying = true;
let creditsLastTime = 0;
let creditsInitialized = false;

// ============ ОТКРЫТИЕ ЭКРАНА ТИТРОВ ============
function openCredits() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageCredits');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');

  renderCreditsContent();

  // Сброс состояния
  creditsInitialized = false;
  creditsOffset = 0;
  creditsSpeed = 1;
  creditsPlaying = true;

  const speedBtn = document.getElementById('speedBtn');
  speedBtn.textContent = '1×';
  speedBtn.classList.remove('active');

  const playBtn = document.getElementById('playPauseBtn');
  playBtn.textContent = '⏸';
  playBtn.classList.remove('active');

  // Ждём отрисовки, потом считаем высоту и стартуем
  setTimeout(() => {
    const viewport = document.getElementById('creditsViewport');
    const scroll = document.getElementById('creditsScroll');

    const viewportH = viewport.clientHeight;
    const scrollH = scroll.scrollHeight;

    // Максимум — высота контента + немного запаса
    creditsMaxOffset = scrollH + viewportH * 0.15;

    scroll.style.transform = `translateY(0px)`;
    creditsOffset = 0;
    creditsInitialized = true;
    creditsLastTime = 0;

    updateCreditsUI();

    if (!creditsAnimId) {
      creditsAnimId = requestAnimationFrame(creditsTick);
    }
  }, 100);
}

// ============ ЗАПОЛНЕНИЕ КОНТЕНТА ============
function renderCreditsContent() {
  const st = window.TG_STATS;
  if (!st) return;

  document.getElementById('creditsTotal').textContent = st.totalMessages.toLocaleString('ru-RU');
  document.getElementById('creditsDays').textContent = st.daysSpan;
  document.getElementById('creditsPerDay').textContent = st.avgPerDay;
  document.getElementById('creditsBestCount').textContent = st.bestDayCount.toLocaleString('ru-RU');
  document.getElementById('creditsBestDay').textContent = st.bestDay;

  // Топ-слова через разделитель «·»
  document.getElementById('creditsTopWords').textContent =
    st.topWords.slice(0, 8).map((w) => w.word).join(' · ');

  // Топ эмодзи
  document.getElementById('creditsTopEmoji').textContent =
    st.topEmoji.slice(0, 6).map((e) => e.emoji).join(' ');
}

// ============ ОСНОВНОЙ ЦИКЛ ПРОКРУТКИ ============
function creditsTick(now) {
  if (!creditsInitialized) {
    creditsAnimId = null;
    return;
  }

  if (!creditsLastTime) creditsLastTime = now;

  // Ограничиваем dt (при лагах не дёргаем резко)
  const dt = Math.min(50, now - creditsLastTime) / 1000;
  creditsLastTime = now;

  if (creditsPlaying) {
    // Базовая скорость: 25 px/сек
    creditsOffset += dt * 25 * creditsSpeed;

    if (creditsOffset >= creditsMaxOffset) {
      creditsOffset = creditsMaxOffset;
      creditsPlaying = false;
      document.getElementById('playPauseBtn').textContent = '▶';
      updateCreditsUI();
      creditsAnimId = null;
      return;
    }

    updateCreditsUI();
  }

  creditsAnimId = requestAnimationFrame(creditsTick);
}

// ============ ОБНОВЛЕНИЕ ВИДА ============
function updateCreditsUI() {
  const scroll = document.getElementById('creditsScroll');
  const progressFill = document.getElementById('creditsProgressFill');
  const progressThumb = document.getElementById('creditsProgressThumb');

  scroll.style.transform = `translateY(-${creditsOffset}px)`;

  const progress = creditsMaxOffset > 0 ? (creditsOffset / creditsMaxOffset) * 100 : 0;
  progressFill.style.height = progress + '%';
  progressThumb.style.top = progress + '%';
}

// ============ УПРАВЛЕНИЕ ============
function toggleCreditsPlay() {
  creditsPlaying = !creditsPlaying;
  const btn = document.getElementById('playPauseBtn');

  if (creditsPlaying) {
    btn.textContent = '⏸';
    btn.classList.remove('active');
    creditsLastTime = 0;
    if (!creditsAnimId) creditsAnimId = requestAnimationFrame(creditsTick);
  } else {
    btn.textContent = '▶';
    btn.classList.add('active');
  }
}

function toggleCreditsSpeed() {
  const btn = document.getElementById('speedBtn');

  if (creditsSpeed === 1) {
    creditsSpeed = 2;
    btn.textContent = '2×';
    btn.classList.add('active');
  } else if (creditsSpeed === 2) {
    creditsSpeed = 4;
    btn.textContent = '4×';
    btn.classList.add('active');
  } else {
    creditsSpeed = 1;
    btn.textContent = '1×';
    btn.classList.remove('active');
  }
}

function restartCredits() {
  creditsOffset = 0;
  creditsPlaying = true;

  const playBtn = document.getElementById('playPauseBtn');
  playBtn.textContent = '⏸';
  playBtn.classList.remove('active');

  creditsLastTime = 0;
  updateCreditsUI();

  if (!creditsAnimId) creditsAnimId = requestAnimationFrame(creditsTick);
}

// ============ SEEK ПО ПОЛЗУНКУ ============
function seekCredits(relY) {
  creditsOffset = relY * creditsMaxOffset;
  updateCreditsUI();
}

// ============ ОСТАНОВКА ============
function stopCredits() {
  if (creditsAnimId) {
    cancelAnimationFrame(creditsAnimId);
    creditsAnimId = null;
  }
}

// ============ ЗАКРЫТИЕ ============
function backToMenuFromCredits() {
  stopCredits();
  creditsInitialized = false;
  document.getElementById('stageCredits').classList.add('hidden');
  backToMenu();
}

// ============ ПОЛЗУНОК ПРОГРЕССА (drag) ============
document.addEventListener('DOMContentLoaded', () => {
  const progressBar = document.getElementById('creditsProgress');
  if (!progressBar) return;

  let dragging = false;

  const handleDrag = (clientY) => {
    const rect = progressBar.getBoundingClientRect();
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    seekCredits(relY);
  };

  progressBar.addEventListener('pointerdown', (e) => {
    dragging = true;
    progressBar.setPointerCapture(e.pointerId);
    handleDrag(e.clientY);
  });

  progressBar.addEventListener('pointermove', (e) => {
    if (dragging) handleDrag(e.clientY);
  });

  progressBar.addEventListener('pointerup', () => { dragging = false; });
  progressBar.addEventListener('pointercancel', () => { dragging = false; });
});

// ============ ЭКСПОРТ ============
window.openCredits = openCredits;
window.backToMenuFromCredits = backToMenuFromCredits;
window.toggleCreditsPlay = toggleCreditsPlay;
window.toggleCreditsSpeed = toggleCreditsSpeed;
window.restartCredits = restartCredits;
window.stopCredits = stopCredits;