// ============ КАЛЕНДАРЬ ============

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
const DAY_LETTERS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const EMOJI_SET = ['💞','🎂','💑','🎄','☀️','🎉','✈️','🏖️','🌸','🎁','💐','🍕','🎬','🎵','⭐','❤️','💍','🥳','🎓','🏠','🌙','🍰','🐶','✨'];

const MIN_YEAR = 2026;
const MAX_YEAR = 2027;

let currentCalendarYear = 2026;
let selectedMonth = null;
let selectedDay = null;
let editorState = null;

// ============ ХРАНИЛИЩЕ СОБЫТИЙ ============
function loadEvents() {
  try {
    const saved = localStorage.getItem('krisStoryEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  // Fallback — из data/events.js
  return window.BASE_EVENTS ? [...window.BASE_EVENTS] : [];
}

function saveEvents(events) {
  try {
    localStorage.setItem('krisStoryEvents', JSON.stringify(events));
  } catch (e) {}
}

// Работаем с локальной копией, синхронизированной с localStorage
let CUSTOM_EVENTS = loadEvents();

// ============ ОТКРЫТИЕ / ЗАКРЫТИЕ ============
function openCalendar() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageCalendar');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');

  // Обновляем события на случай, если их меняли в другой вкладке
  CUSTOM_EVENTS = loadEvents();

  const nowYear = new Date().getFullYear();
  currentCalendarYear = Math.min(MAX_YEAR, Math.max(MIN_YEAR, nowYear));

  selectedMonth = null;
  selectedDay = null;
  renderYearNav();
  renderMonthsGrid();
  document.getElementById('calendarDetailContainer').innerHTML = '';
}

function backToMenuFromCalendar() {
  document.getElementById('stageCalendar').classList.add('hidden');
  backToMenu();
}

// ============ НАВИГАЦИЯ ПО ГОДАМ ============
function changeYear(delta) {
  const newYear = currentCalendarYear + delta;
  if (newYear < MIN_YEAR || newYear > MAX_YEAR) return;
  currentCalendarYear = newYear;
  selectedMonth = null;
  selectedDay = null;
  renderYearNav();
  renderMonthsGrid();
  document.getElementById('calendarDetailContainer').innerHTML = '';
}

function renderYearNav() {
  document.getElementById('yearDisplay').textContent = currentCalendarYear;
  document.getElementById('yearPrev').disabled = (currentCalendarYear <= MIN_YEAR);
  document.getElementById('yearNext').disabled = (currentCalendarYear >= MAX_YEAR);
}

// ============ ПОЛУЧИТЬ СОБЫТИЯ МЕСЯЦА ============
// Возвращает объект { день: [событие, ...] }
function getEventsForMonth(year, month) {
  const eventsByDay = {};
  CUSTOM_EVENTS.forEach((ev, index) => {
    const [y, m, d] = ev.date.split('-').map(Number);
    if (ev.cycle) {
      // Ежегодное — не важно, какой год в дате
      if (m === month) {
        if (!eventsByDay[d]) eventsByDay[d] = [];
        eventsByDay[d].push({ ...ev, index });
      }
    } else {
      // Разовое — только для указанного года
      if (y === year && m === month) {
        if (!eventsByDay[d]) eventsByDay[d] = [];
        eventsByDay[d].push({ ...ev, index });
      }
    }
  });
  return eventsByDay;
}

// ============ СЕТКА МЕСЯЦЕВ ============
function renderMonthsGrid() {
  const grid = document.getElementById('monthsGrid');
  grid.innerHTML = '';

  MONTH_NAMES.forEach((name, i) => {
    const month = i + 1;
    const events = getEventsForMonth(currentCalendarYear, month);
    const eventsCount = Object.keys(events).length;

    const tile = document.createElement('div');
    tile.className = 'month-tile';
    if (selectedMonth === month) tile.classList.add('active');

    // Собираем эмодзи всех событий месяца (макс 3)
    let emojis = [];
    Object.values(events).forEach((arr) => {
      arr.forEach((ev) => emojis.push(ev.emoji));
    });
    emojis = emojis.slice(0, 3);

    tile.innerHTML = `
      <div class="month-name">${name}</div>
      <div class="month-events">${emojis.map((e) => `<span>${e}</span>`).join('')}</div>
      ${eventsCount > 0 ? `<div class="month-badge">${eventsCount}</div>` : ''}
    `;

    tile.onclick = () => selectMonth(month);
    grid.appendChild(tile);
  });
}

function selectMonth(month) {
  selectedMonth = month;
  selectedDay = null;
  renderMonthsGrid();
  renderCalendarDetail(month);
}

// ============ ДЕТАЛЬНЫЙ ВИД МЕСЯЦА ============
function renderCalendarDetail(month) {
  const container = document.getElementById('calendarDetailContainer');
  const now = new Date();
  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();

  const events = getEventsForMonth(currentCalendarYear, month);
  const isCurrentMonth = (month === todayMonth && currentCalendarYear === todayYear);

  // Первый день недели (0=Вс, 1=Пн...). Приводим к Пн=0
  const firstDay = new Date(currentCalendarYear, month - 1, 1).getDay();
  const firstDayIdx = (firstDay + 6) % 7;

  const daysInMonth = MONTH_DAYS[month - 1] +
    (month === 2 && isLeapYear(currentCalendarYear) ? 1 : 0);

  let html = `
    <div class="calendar-detail">
      <div class="calendar-detail-title">${MONTH_NAMES[month - 1]} ${currentCalendarYear}</div>
      <div class="day-grid">
  `;

  // Заголовки дней недели
  DAY_LETTERS.forEach((l) => {
    html += `<div class="day-header">${l}</div>`;
  });

  // Пустые клетки до первого дня
  for (let i = 0; i < firstDayIdx; i++) {
    html += `<div class="day-cell empty"></div>`;
  }

  // Дни месяца
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayDay;
    const dayEvents = events[d] || [];
    const hasEvent = dayEvents.length > 0;

    const classes = ['day-cell'];
    if (isToday) classes.push('today');
    if (hasEvent) classes.push('event');
    if (selectedDay === d) classes.push('selected');

    const emojiAttr = hasEvent ? `data-emoji="${dayEvents[0].emoji}"` : '';
    html += `<div class="${classes.join(' ')}" ${emojiAttr} onclick="selectDay(${d}, ${month})">${d}</div>`;
  }

  html += `</div>`;

  // Инфо о выбранном дне
  if (selectedDay) {
    const dayEvents = events[selectedDay] || [];

    if (dayEvents.length > 0) {
      const ev = dayEvents[0];
      html += renderEventInfo(selectedDay, month, ev);
      html += `
        <div class="event-actions">
          <button class="secondary" onclick="openEventEditor(${selectedDay}, ${month}, ${ev.index})">✏️ Редактировать</button>
          <button class="secondary" onclick="openEventEditor(${selectedDay}, ${month}, -1)">➕ Добавить</button>
        </div>
      `;
    } else {
      html += `
        <div class="event-info" style="text-align:center;">
          <div style="color: #b896e8; font-size: 13px; margin-bottom: 10px;">
            ${selectedDay} ${MONTH_NAMES[month-1].toLowerCase()} ${currentCalendarYear} — просто день 😊
          </div>
        </div>
        <div class="event-actions">
          <button onclick="openEventEditor(${selectedDay}, ${month}, -1)">➕ Добавить событие</button>
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}

function selectDay(day, month) {
  selectedDay = day;
  renderCalendarDetail(month);
}

// ============ ИНФО О СОБЫТИИ ============
function renderEventInfo(day, month, event) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Год записи в дате события (YYYY-MM-DD)
  const eventYear = Number(String(event.date).split('-')[0]) || null;

  // Считаем от даты события в том году, который сейчас открыт в календаре.
  // Исключения (событие уже НЕ наступит — показываем «произошло ... назад»):
  //  - разовые (не cycle): всегда по своей реальной дате;
  //  - ежегодные (cycle), если дата записана будущим годом относительно
  //    сегодняшнего (например, событие добавлено в 2026 как '2027-04-05'):
  //    в просмотре 2026 такой день уже прошёл и повториться не может.
  let viewYear = currentCalendarYear;
  if (!event.cycle || (eventYear && eventYear > now.getFullYear())) {
    if (eventYear) viewYear = eventYear;
  }
  const viewDate = new Date(viewYear, month - 1, day);

  const pluralDays = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'день';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
    return 'дней';
  };

  const daysDiff = Math.round((viewDate - today) / (1000 * 60 * 60 * 24));

  // Прошедшее событие — показываем статус и «N дней/месяцев/лет назад»
  if (daysDiff < 0) {
    const passed = Math.abs(daysDiff);
    let agoText;
    if (passed < 30) {
      agoText = `${passed} ${pluralDays(passed)} назад`;
    } else if (passed < 365) {
      const months = Math.floor(passed / 30);
      agoText = `${months} ${months === 1 ? 'месяц' : (months < 5 ? 'месяца' : 'месяцев')} назад`;
    } else {
      const years = Math.floor(passed / 365);
      agoText = `${years} ${years === 1 ? 'год' : (years < 5 ? 'года' : 'лет')} назад`;
    }
    return `
      <div class="event-info">
        <div class="event-info-title">${event.emoji} ${event.label}</div>
        <div class="event-info-days past">${passed}</div>
        <div class="event-info-sub">✅ событие уже произошло · ${agoText}</div>
      </div>
    `;
  }

  if (daysDiff === 0) {
    return `
      <div class="event-info">
        <div class="event-info-title">${event.emoji} ${event.label}</div>
        <div class="event-info-days" style="color:#fff8b3;">🎉 Сегодня!</div>
        <div class="event-info-sub">празднуем 🎊</div>
      </div>
    `;
  }

  // Разовое событие из будущего года или ежегодное — обратный отсчёт
  const daysLeft = daysDiff;
  return `
    <div class="event-info">
      <div class="event-info-title">${event.emoji} ${event.label}</div>
      <div class="event-info-days">${daysLeft}</div>
      <div class="event-info-sub">${pluralDays(daysLeft)} до события</div>
    </div>
  `;
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ============ РЕДАКТОР СОБЫТИЯ ============
function openEventEditor(day, month, eventIndex) {
  let existing = null;
  if (eventIndex >= 0) {
    existing = CUSTOM_EVENTS[eventIndex];
  }

  editorState = {
    day: day,
    month: month,
    year: currentCalendarYear,
    eventIndex: eventIndex,
    emoji: existing ? existing.emoji : '💞',
    label: existing ? existing.label : '',
    cycle: existing ? existing.cycle : true,
  };

  renderEventEditor();
}

function renderEventEditor() {
  // Убираем старый, если есть
  const old = document.getElementById('eventEditorOverlay');
  if (old) old.remove();

  const st = editorState;
  const isEdit = st.eventIndex >= 0;

  const overlay = document.createElement('div');
  overlay.className = 'event-editor-overlay';
  overlay.id = 'eventEditorOverlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeEventEditor();
  };

  const editor = document.createElement('div');
  editor.className = 'event-editor';

  editor.innerHTML = `
    <div class="editor-title">${isEdit ? 'Редактировать' : 'Новое событие'}</div>
    <div class="editor-date">${st.day} ${MONTH_NAMES[st.month - 1].toLowerCase()} ${st.year}</div>

    <label class="editor-label">Эмодзи</label>
    <div class="editor-emoji-row">
      ${EMOJI_SET.map((e) =>
        `<div class="emoji-choice ${e === st.emoji ? 'selected' : ''}" onclick="selectEmoji('${e}')">${e}</div>`
      ).join('')}
    </div>

    <label class="editor-label">Название</label>
    <input type="text" class="editor-input" id="editorLabelInput"
           placeholder="Например: Первое свидание" maxlength="40"
           value="${escapeHtml(st.label)}">

    <div class="editor-toggle-row">
      <span class="editor-toggle-label">🔁 Повторять каждый год</span>
      <div class="toggle-switch ${st.cycle ? 'on' : ''}" id="cycleToggle" onclick="toggleCycle()"></div>
    </div>

    <div class="editor-actions">
      <div class="row">
        <button class="secondary" onclick="closeEventEditor()">Отмена</button>
        <button onclick="saveEvent()">💾 Сохранить</button>
      </div>
      ${isEdit ? `<button class="danger" onclick="deleteEvent()">🗑 Удалить событие</button>` : ''}
    </div>
  `;

  overlay.appendChild(editor);
  document.body.appendChild(overlay);

  // Автофокус + хоткеи
  setTimeout(() => {
    const input = document.getElementById('editorLabelInput');
    if (input) {
      input.focus();
      input.addEventListener('input', (e) => { editorState.label = e.target.value; });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEvent();
        if (e.key === 'Escape') closeEventEditor();
      });
    }
  }, 100);
}

function selectEmoji(emoji) {
  editorState.emoji = emoji;
  document.querySelectorAll('.emoji-choice').forEach((el) => {
    el.classList.toggle('selected', el.textContent === emoji);
  });
}

function toggleCycle() {
  editorState.cycle = !editorState.cycle;
  document.getElementById('cycleToggle').classList.toggle('on', editorState.cycle);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function closeEventEditor() {
  const overlay = document.getElementById('eventEditorOverlay');
  if (overlay) overlay.remove();
  editorState = null;
}

// ============ СОХРАНЕНИЕ ============
function saveEvent() {
  const st = editorState;
  if (!st) return;

  const label = (st.label || '').trim();
  if (!label) {
    showToast('Введи название события');
    return;
  }

  const dateStr = `${st.year}-${String(st.month).padStart(2, '0')}-${String(st.day).padStart(2, '0')}`;

  if (st.eventIndex >= 0) {
    // Редактирование
    CUSTOM_EVENTS[st.eventIndex] = {
      emoji: st.emoji,
      label: label,
      date: dateStr,
      cycle: st.cycle,
    };
  } else {
    // Новое
    CUSTOM_EVENTS.push({
      emoji: st.emoji,
      label: label,
      date: dateStr,
      cycle: st.cycle,
    });
  }

  saveEvents(CUSTOM_EVENTS);
  closeEventEditor();
  renderMonthsGrid();
  renderCalendarDetail(st.month);
  showToast('Событие сохранено ✨');
}

// ============ УДАЛЕНИЕ ============
function deleteEvent() {
  const st = editorState;
  if (!st || st.eventIndex < 0) return;

  if (!confirm('Удалить это событие?')) return;

  CUSTOM_EVENTS.splice(st.eventIndex, 1);
  saveEvents(CUSTOM_EVENTS);
  closeEventEditor();
  renderMonthsGrid();
  renderCalendarDetail(st.month);
  showToast('Событие удалено');
}

// ============ ЭКСПОРТ ============
window.openCalendar = openCalendar;
window.backToMenuFromCalendar = backToMenuFromCalendar;
window.changeYear = changeYear;
window.selectMonth = selectMonth;
window.selectDay = selectDay;
window.openEventEditor = openEventEditor;
window.selectEmoji = selectEmoji;
window.toggleCycle = toggleCycle;
window.closeEventEditor = closeEventEditor;
window.saveEvent = saveEvent;
window.deleteEvent = deleteEvent;
