// ============ ЭКРАН СТАТИСТИКИ ============

// ============ АНИМАЦИЯ ЧИСЛА (набегание от 0 до target) ============
function animateNumber(el, target, duration = 1500) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Ease-out cubic — быстро в начале, плавно в конце
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (target - start) * eased);
    el.textContent = value.toLocaleString('ru-RU');
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString('ru-RU');
  }

  requestAnimationFrame(tick);
}

// ============ ОТКРЫТИЕ ЭКРАНА СТАТИСТИКИ ============
function openStats() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageStats');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');

  renderStats();
}

// ============ ЗАКРЫТИЕ ============
function backToMenuFromStats() {
  document.getElementById('stageStats').classList.add('hidden');
  backToMenu();
}

// ============ ГЛАВНЫЙ РЕНДЕР ============
function renderStats() {
  const st = window.TG_STATS;
  if (!st) {
    console.warn('TG_STATS не загружен');
    return;
  }

  const total = st.totalMessages;
  const mePercent = Math.round((st.myMessages / total) * 100);
  const herPercent = Math.round((st.herMessages / total) * 100);

  // ===== Главная цифра =====
  animateNumber(document.getElementById('statTotal'), total, 1800);
  setTimeout(() => animateNumber(document.getElementById('statDays'), st.daysSpan, 1200), 300);
  setTimeout(() => animateNumber(document.getElementById('statPerDay'), st.avgPerDay, 1200), 600);

  // ===== Баланс =====
  document.getElementById('legendMe').textContent = st.myName;
  document.getElementById('legendHer').textContent = st.herName;
  animateNumber(document.getElementById('countMe'), st.myMessages, 1500);
  animateNumber(document.getElementById('countHer'), st.herMessages, 1500);

  setTimeout(() => {
    const meBar = document.getElementById('balanceMe');
    const herBar = document.getElementById('balanceHer');
    if (meBar) {
      meBar.style.width = mePercent + '%';
      meBar.textContent = mePercent + '%';
    }
    if (herBar) {
      herBar.style.width = herPercent + '%';
      herBar.textContent = herPercent + '%';
    }
  }, 200);

  // ===== Средняя длина =====
  document.getElementById('statAvgMe').textContent = st.avgLengthMe;
  document.getElementById('statAvgHer').textContent = st.avgLengthHer;

  // ===== Самый активный день =====
  animateNumber(document.getElementById('statBestCount'), st.bestDayCount, 1500);
  document.getElementById('statBestDay').textContent = st.bestDay;

  // ===== Топ-5 дней =====
  const topDaysEl = document.getElementById('topDaysList');
  topDaysEl.innerHTML = '';
  st.topDays.slice(0, 5).forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'top-day-item' + (i === 0 ? ' first' : '');
    item.innerHTML = `
      <span class="rank">${i + 1}</span>
      <span class="day-date">${d.date}</span>
      <span class="day-count">${d.count.toLocaleString('ru-RU')}</span>
    `;
    topDaysEl.appendChild(item);
  });

  // ===== График часов (сумма обоих) =====
  const hoursEl = document.getElementById('hoursChart');
  hoursEl.innerHTML = '';
  const combinedHours = st.myHours.map((v, i) => v + st.herHours[i]);
  const maxHour = Math.max(...combinedHours);
  const peakIdx = combinedHours.indexOf(maxHour);

  combinedHours.forEach((val, h) => {
    const bar = document.createElement('div');
    bar.className = 'hour-bar';
    if (h === peakIdx) bar.classList.add('peak');
    const height = (val / maxHour) * 100;
    bar.style.height = '0%';
    bar.title = `${h}:00 — ${val} сообщений`;
    hoursEl.appendChild(bar);
    // Анимация роста с задержкой для эффекта «волны»
    setTimeout(() => { bar.style.height = height + '%'; }, 100 + h * 30);
  });

  document.getElementById('peakHour').textContent =
    String(peakIdx).padStart(2, '0') + ':00';

  // ===== Облако слов =====
  const cloud = document.getElementById('wordCloud');
  cloud.innerHTML = '';
  const maxWordCount = st.topWords[0].count;
  const minWordCount = st.topWords[st.topWords.length - 1].count;

  st.topWords.forEach((w) => {
    const span = document.createElement('span');
    span.className = 'word-tag';
    span.textContent = w.word;

    // Размер от 14px до 32px в зависимости от частоты
    const ratio = (w.count - minWordCount) / (maxWordCount - minWordCount || 1);
    const size = 14 + ratio * 18;
    span.style.fontSize = size + 'px';
    span.style.opacity = 0.6 + ratio * 0.4;

    cloud.appendChild(span);
  });

  // ===== Твои слова / Её слова =====
  const myList = document.getElementById('myWordsList');
  myList.innerHTML = st.topMyWords
    .slice(0, 8)
    .map(
      (w) =>
        `<div>${w.word} <span style="color:#c9a3ff; float:right;">${w.count}</span></div>`
    )
    .join('');

  const herList = document.getElementById('herWordsList');
  herList.innerHTML = st.topHerWords
    .slice(0, 8)
    .map(
      (w) =>
        `<div>${w.word} <span style="color:#c9a3ff; float:right;">${w.count}</span></div>`
    )
    .join('');

  // ===== Эмодзи =====
  const emojiEl = document.getElementById('emojiList');
  emojiEl.innerHTML = '';
  st.topEmoji.forEach((e) => {
    const div = document.createElement('div');
    div.className = 'emoji-item';
    div.innerHTML = `<span class="e">${e.emoji}</span><span class="c">${e.count}</span>`;
    emojiEl.appendChild(div);
  });

  // ===== Забавный факт =====
  const matsPerDay = Math.round(st.totalMats / st.daysSpan);
  document.getElementById('funFactText').innerHTML =
    `За всю переписку мы <strong>${st.totalMats.toLocaleString('ru-RU')}</strong> раз выругались друг другу. ` +
    `Это примерно <strong>${matsPerDay} раз в день</strong> — почти как «доброе утро».`;
}

// ============ ЭКСПОРТ ============
window.openStats = openStats;
window.backToMenuFromStats = backToMenuFromStats;
window.renderStats = renderStats;
window.animateNumber = animateNumber;