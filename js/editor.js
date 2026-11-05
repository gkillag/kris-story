// ============ РЕДАКТОР СЦЕН (v1.4, упрощённый визуальный конструктор) ============
// Никакого ручного написания кода: сцена собирается кнопками.
// Каждый блок — готовый «кирпичик» с понятными полями (текст, имя, персонаж, фон...).
// Готовый текст сохраняется в localStorage и скачивается как script.txt —
// тот же формат, что читает движок новеллы (data/script.txt).

const EDITOR_STORAGE_KEY = 'krisStoryScript';
const EDITOR_DEFAULT_NAME = 'script.txt';

let editorBlocks = [];      // [{ id, kind, data }]
let editorBlockSeq = 0;     // счётчик для id блоков
let editorFileName = EDITOR_DEFAULT_NAME;

// ---- типы блоков (kind -> метка для списка/фильтра) ----
const KIND_LABELS = {
  narrator: 'Текст', dialogue: 'Реплика', char: 'Персонаж', bg: 'Фон',
  fx: 'Эффекты', flash: 'Вспышка', sfx: 'Звук', music: 'Музыка',
  wait: 'Пауза', blank: 'Разделитель', comment: 'Комментарий', raw: 'Другое',
};

// ---- данные для выпадающих списков (совпадают с ассетами и движком) ----
const CHAR_OPTIONS = [
  ['none', 'Убрать всех'],
  ['danya-neutral', 'Даня — спокойный'],
  ['danya-smile', 'Даня — улыбается'],
  ['danya-sad', 'Даня — грустный'],
  ['kriss-neutral', 'Крисс — спокойная'],
  ['kriss-happy', 'Крисс — счастливая'],
  ['kriss-sad', 'Крисс — грустная'],
];
const BG_OPTIONS = [
  ['tent-dark', 'Палатка (ночь)'],
  ['camp-fire', 'Костёр'],
  ['forest', 'Лес'],
  ['sky', 'Небо'],
  ['city', 'Город'],
  ['none', 'Без фона (градиент)'],
];
const FX_OPTIONS = [
  ['none', 'Выключить эффекты'],
  ['fog', 'Туман'],
  ['flicker', 'Мерцание'],
  ['dust', 'Пылинки'],
  ['rain', 'Дождь'],
];
const FLASH_OPTIONS = [['white', 'Белая'], ['blood', 'Кровавая'], ['none', 'Выключить']];
const SFX_OPTIONS = [['door-creak', 'Скрип двери'], ['lock-click', 'Щелчок замка'], ['chime', 'Колокольчик'], ['heartbeat', 'Сердцебиение']];
const MUSIC_OPTIONS = [['music-box', 'Музыкальная шкатулка'], ['sad-theme', 'Грустная тема'], ['none', 'Стоп музыка']];
const WAIT_OPTIONS = [['800', 'Короткая (0.8 сек)'], ['2000', 'Средняя (2 сек)'], ['4000', 'Длинная (4 сек)']];

// ---- мини-гайд: что делает каждая кнопка/функция ----
const EDITOR_GUIDE = [
  { t: '✎ Текст', d: 'Строка рассказчика — обычный текст без имени. Появляется над репликами, курсивом не выделяется.' },
  { t: '💬 Реплика', d: 'Реплика персонажа: поле «Имя» + поле «Текст». В файле сохранится как «Имя: текст». Имя показывается над окном диалога.' },
  { t: '👤 Персонаж', d: 'Показать спрайт на экране или убрать всех. Выбираете из списка (Даня / Крисс / убрать). Если PNG-файла ещё нет — движок покажет подстановочный силуэт 🎭.' },
  { t: '🏞 Фон', d: 'Меняет задний план сцены. Файлы лежат в assets/bg/. Пока файла нет — показывается красивый градиент по названию.' },
  { t: '✨ Эффекты', d: 'Атмосферные частицы поверх фона: туман, мерцание, пылинки, дождь. Можно выбрать сразу несколько. «Выключить» — остановить все.' },
  { t: '⚡ Вспышка', d: 'Мгновенная вспышка на весь экран: белая (используется при переходах между сценами) или кровавая (драма).' },
  { t: '🔊 Звук', d: 'Один короткий звук: скрип двери, щелчок замка, колокольчик, сердцебиение. Все звуки синтезируются игрой — файлы не нужны.' },
  { t: '🎵 Музыка', d: 'Фоновая музыка зацикленно: «музыкальная шкатулка» или грустная тема. «Стоп» — выключить. Тоже синтезируется, mp3 не требуются.' },
  { t: '⏸ Пауза', d: 'Задержка перед следующим блоком (0.8 / 2 / 4 секунды). Драматичные моменты лучше играть с паузой.' },
  { t: '· · · Разделитель', d: 'Пустая строка. Означает конец одной сцены и начало новой: окно диалога очищается, эффект печати начинается заново.' },
  { t: '❓ Выбор', d: 'Вопрос игроку с вариантами ответа. Добавьте блок «Выбор», затем под ним варианты вида «? Да», «? Нет» (кнопкой Другое → шаблон). Дальше можно добавить ветку «Если ответ...».' },
  { t: '⑂ Если ответ...', d: 'Ветка: что показать, если игрок выбрал конкретный вариант. Внутри ветки — обычные блоки; закрыть её кнопкой «Конец ветки».' },
  { t: '# Комментарий', d: 'Заметка для себя — игра её полностью игнорирует. Полезно размечать главы.' },
  { t: '⚙ Другое', d: 'Любая команда синтаксиса вручную, если нужной кнопки нет (например ? Да, @var trust += 1, ! auto 2500). При выборе подсказки список вариантов меняется.' },
];

function editorMakeId() { return ++editorBlockSeq; }

// ============ ОТКРЫТЬ / ЗАКРЫТЬ ============
function openEditor() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageEditor');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');

  editorInitShell();
  editorLoadFromStorage();
}

function backToMenuFromEditor() {
  document.getElementById('stageEditor').classList.add('hidden');
  const m = document.getElementById('stageMenu');
  m.classList.remove('hidden');
  m.classList.add('stage-fade');
}

// ============ РАЗМЕТКА ЭКРАНА (один раз) ============
function editorInitShell() {
  const s = document.getElementById('stageEditor');
  if (s.dataset.shellReady) return;
  s.dataset.shellReady = '1';

  s.innerHTML = `
    <div class="editor-wrap">
      <div class="editor-header">
        <div class="editor-title">Редактор сцен</div>
        <div class="editor-header-actions">
          <button class="secondary ed-btn" onclick="editorToggleGuide()" id="edGuideBtn" title="Как работает каждая кнопка">? Справочник</button>
          <button class="secondary editor-close" onclick="backToMenuFromEditor()">✕ В меню</button>
        </div>
      </div>

      <!-- мини-гайд (справочник), скрыт по умолчанию -->
      <div class="editor-guide hidden" id="edGuide">
        <div class="ed-guide-inner">
          ${EDITOR_GUIDE.map((g) => `<div class="ed-guide-item"><b>${g.t}</b><span>${g.d}</span></div>`).join('')}
        </div>
      </div>

      <!-- панель добавления: просто нажимаете кнопку нужного элемента -->
      <div class="editor-addbar" id="edAddBar">
        <button class="ed-add" onclick="editorQuickAdd('narrator')" title="Обычная строка текста">✎ Текст</button>
        <button class="ed-add" onclick="editorQuickAdd('dialogue')" title="Реплика: имя + текст">💬 Реплика</button>
        <button class="ed-add" onclick="editorQuickAdd('char')" title="Показать/убрать персонажа">👤 Персонаж</button>
        <button class="ed-add" onclick="editorQuickAdd('bg')" title="Сменить фон">🏞 Фон</button>
        <button class="ed-add" onclick="editorQuickAdd('fx')" title="Туман / дождь / пылинки">✨ Эффекты</button>
        <button class="ed-add" onclick="editorQuickAdd('flash')" title="Белая или кровавая вспышка">⚡ Вспышка</button>
        <button class="ed-add" onclick="editorQuickAdd('sfx')" title="Короткий звук">🔊 Звук</button>
        <button class="ed-add" onclick="editorQuickAdd('music')" title="Фоновая музыка">🎵 Музыка</button>
        <button class="ed-add" onclick="editorQuickAdd('wait')" title="Пауза перед следующим блоком">⏸ Пауза</button>
        <button class="ed-add" onclick="editorQuickAdd('blank')" title="Конец сцены — новая сцена">· · · Разделитель</button>
        <button class="ed-add" onclick="editorQuickAdd('comment')" title="Заметка для себя, игра её не показывает"># Комментарий</button>
        <button class="ed-add ed-add-more" onclick="editorShowMore()" id="edMoreBtn" title="Выбор, ветвление и другие команды">⚙ Другое ▾</button>
      </div>

      <!-- расширенная панель: выбор, ветки, переменные -->
      <div class="editor-more hidden" id="edMorePanel">
        <div class="ed-more-group">
          <span class="ed-more-label">Ветвление сюжета:</span>
          <button class="ed-mini2" onclick="editorQuickAdd('choice')" title="Вопрос игроку — текст вопроса">❓ Вопрос с выбором</button>
          <button class="ed-mini2" onclick="editorQuickAdd('option')" title="Вариант ответа «? Да»">▸ Вариант ответа</button>
          <button class="ed-mini2" onclick="editorQuickAdd('ifblock')" title="Показать блоки, если игрок выбрал этот вариант">⑂ Если ответ…</button>
          <button class="ed-mini2" onclick="editorQuickAdd('endif')" title="Закрыть ветку">⑃ Конец ветки</button>
        </div>
        <div class="ed-more-group">
          <span class="ed-more-label">Прочее:</span>
          <button class="ed-mini2" onclick="editorQuickAdd('raw')" title="Любая команда синтаксиса вручную">⚙ Команда вручную</button>
          <button class="ed-mini2" onclick="editorInsertPreset('@var trust += 1')" title="Изменить скрытый счётчик доверия">Σ Переменная ±</button>
          <button class="ed-mini2" onclick="editorInsertPreset('! auto 2500')" title="Автопрокрутка сцен">▶ Auto</button>
          <button class="ed-mini2" onclick="editorInsertPreset('! skip')" title="Игрок может пропустить печать кликом">≫ Skip</button>
        </div>
      </div>

      <!-- действия с файлом -->
      <div class="editor-toolbar">
        <button class="primary ed-btn" onclick="editorPlayPreview()" title="Сразу проиграть то, что собрали">▶ Играть</button>
        <button class="secondary ed-btn" onclick="editorDownloadScript()" title="Скачать script.txt">⬇ Сохранить файл</button>
        <button class="secondary ed-btn" onclick="editorOpenFileInput()" title="Загрузить ранее сохранённый .txt">⬆ Открыть файл</button>
        <button class="secondary ed-btn" onclick="editorResetDefault()" title="Вернуть встроенную демо-главу">⟲ Демо</button>
        <input type="file" id="edFileInput" accept=".txt,text/plain" style="display:none" onchange="editorHandleFile(event)">
      </div>

      <div class="editor-blocks" id="edBlocks"></div>

      <details class="ed-preview-details">
        <summary>📄 Предпросмотр готового текста (script.txt)</summary>
        <textarea id="edPreview" class="ed-preview" readonly spellcheck="false"></textarea>
      </details>

      <div class="editor-footer">
        <span id="edStatus" class="ed-status">—</span>
        <span class="ed-hint">Подсказка: нажмите «? Справочник» — там объяснение каждой кнопки</span>
      </div>
    </div>
  `;
}

function editorToggleGuide() {
  const g = document.getElementById('edGuide');
  if (!g) return;
  g.classList.toggle('hidden');
  document.getElementById('edGuideBtn').textContent = g.classList.contains('hidden') ? '? Справочник' : '✕ Закрыть справочник';
}

function editorShowMore() {
  const p = document.getElementById('edMorePanel');
  if (!p) return;
  p.classList.toggle('hidden');
  document.getElementById('edMoreBtn').textContent = p.classList.contains('hidden') ? '⚙ Другое ▾' : '⚙ Другое ▴';
}

// ============ МОДЕЛЬ: блок -> строка текста ============
function blockToLine(b) {
  switch (b.kind) {
    case 'narrator': return b.data.text || '';
    case 'dialogue': return (b.data.speaker || '').trim() ? `${(b.data.speaker || '').trim()}: ${b.data.text || ''}` : (b.data.text || '');
    case 'comment':  return b.data.line !== undefined ? b.data.line : `# ${b.data.text || ''}`;
    case 'blank':    return '';
    case 'char':     return `@char ${b.data.char || 'none'}${b.data.anim ? ' ' + b.data.anim : ''}`;
    case 'bg':       return `@bg ${b.data.bg || 'none'}`;
    case 'fx':       return `@fx ${(b.data.fx || []).join(' ') || 'none'}`;
    case 'flash':    return `@flash ${b.data.flash || 'white'}`;
    case 'sfx':      return `@sfx ${b.data.sfx || ''}`;
    case 'music':    return `@music ${b.data.music || 'none'}`;
    case 'wait':     return `@wait ${b.data.ms || 1500}`;
    case 'choice':   return b.data.text || 'Что выберешь?';
    case 'option':   return `? ${b.data.text || 'Да'}`;
    case 'ifblock':  return `@if choice == "${b.data.value || 'Да'}"`;
    case 'endif':    return '@endif';
    case 'raw':      return b.data.line || '';
    default:         return '';
  }
}

// Строка текста -> блок модели (для загрузки файлов и демо-сценария)
function lineToBlock(raw) {
  const b = { id: editorMakeId(), kind: 'raw', data: {} };
  const t = raw.trim();

  if (t === '') { b.kind = 'blank'; return b; }
  // комментарии храним в исходном виде, чтобы round-trip был без потерь
  if (/^(#|\/\/)/.test(t)) { b.kind = 'comment'; b.data.line = raw; return b; }

  // @команды — распознаём и превращаем в понятные блоки со списками
  let m;
  if ((m = t.match(/^@char\s+(\S+)(?:\s+(\S+))?$/))) {
    b.kind = 'char'; b.data = { char: m[1], anim: m[2] || 'fade' }; return b;
  }
  if ((m = t.match(/^@bg\s+(\S+)$/))) { b.kind = 'bg'; b.data = { bg: m[1] }; return b; }
  if ((m = t.match(/^@fx\s+(.+)$/))) { b.kind = 'fx'; b.data = { fx: m[1].trim().split(/\s+/) }; return b; }
  if ((m = t.match(/^@flash\s+(\S+)$/))) { b.kind = 'flash'; b.data = { flash: m[1] }; return b; }
  if ((m = t.match(/^@sfx\s+(\S+)$/))) { b.kind = 'sfx'; b.data = { sfx: m[1] }; return b; }
  if ((m = t.match(/^@music\s+(\S+)$/))) { b.kind = 'music'; b.data = { music: m[1] }; return b; }
  if ((m = t.match(/^@wait\s+(\d+)$/))) { b.kind = 'wait'; b.data = { ms: m[1] }; return b; }
  if ((m = t.match(/^@if\s+choice\s*==\s*"([^"]*)"$/))) { b.kind = 'ifblock'; b.data = { value: m[1] }; return b; }
  if (/^@endif$/.test(t)) { b.kind = 'endif'; return b; }
  if ((m = t.match(/^\?\s*(.+)$/))) { b.kind = 'option'; b.data = { text: m[1] }; return b; }

  // реплика "Имя: текст"
  if ((m = t.match(/^([^:@!?\/#][^:]*?):\s(.+)$/)) && !t.startsWith('@')) {
    b.kind = 'dialogue'; b.data = { speaker: m[1].trim(), text: m[2] }; return b;
  }
  // обычная строка без знаков — рассказчик
  if (!/^[@?!]/.test(t) && !t.includes(':')) { b.kind = 'narrator'; b.data = { text: raw }; return b; }

  b.kind = 'raw'; b.data = { line: raw }; return b;
}

function editorGetText() {
  return editorBlocks.map(blockToLine).join('\n');
}

function editorSetText(text) {
  editorBlocks = String(text).split(/\r?\n/).map(lineToBlock);
  editorRenderBlocks();
  editorUpdatePreview();
}

// ============ UI: список блоков ============
function editorFindIndex(id) {
  return editorBlocks.findIndex((b) => b.id === id);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function editorRenderBlocks() {
  const wrap = document.getElementById('edBlocks');
  if (!wrap) return;

  if (editorBlocks.length === 0) {
    wrap.innerHTML = '<div class="ed-empty">Список пуст — добавьте первый блок через панель выше.</div>';
    return;
  }

  wrap.innerHTML = editorBlocks.map((b, i) => {
    let inner = '';
    if (b.kind === 'narrator') {
      inner = `<input class="ed-input" data-id="${b.id}" data-field="text" value="${esc(b.data.text)}" placeholder="Текст рассказчика…">`;
    } else if (b.kind === 'dialogue') {
      inner = `<input class="ed-input ed-speaker" data-id="${b.id}" data-field="speaker" value="${esc(b.data.speaker)}" placeholder="Имя">` +
              `<input class="ed-input" data-id="${b.id}" data-field="text" value="${esc(b.data.text)}" placeholder="Реплика…">`;
    } else if (b.kind === 'char') {
      inner = selectHtml('char', CHAR_OPTIONS, b.data.char || 'kriss-happy', 'Персонаж:') +
              selectHtml('anim', [['fade', 'Плавный вход'], ['left', 'Слева'], ['right', 'Справа'], ['pop', 'Выпрыгивает']], b.data.anim || 'fade', 'Как появляется:');
    } else if (b.kind === 'bg') {
      inner = selectHtml('bg', BG_OPTIONS, b.data.bg || 'tent-dark', 'Фон:');
    } else if (b.kind === 'fx') {
      inner = `<span class="ed-fx-label">Эффекты:</span>` + FX_OPTIONS.map(([v, l]) =>
        `<label class="ed-check"><input type="checkbox" data-id="${b.id}" data-fx="${v}" ${(b.data.fx || []).includes(v) ? 'checked' : ''}> ${l}</label>`).join('');
    } else if (b.kind === 'flash') {
      inner = selectHtml('flash', FLASH_OPTIONS, b.data.flash || 'white', 'Вспышка:');
    } else if (b.kind === 'sfx') {
      inner = selectHtml('sfx', SFX_OPTIONS, b.data.sfx || 'door-creak', 'Звук:');
    } else if (b.kind === 'music') {
      inner = selectHtml('music', MUSIC_OPTIONS, b.data.music || 'music-box', 'Музыка:');
    } else if (b.kind === 'wait') {
      inner = selectHtml('ms', WAIT_OPTIONS, String(b.data.ms || '2000'), 'Длительность паузы:');
    } else if (b.kind === 'choice') {
      inner = `<input class="ed-input" data-id="${b.id}" data-field="text" value="${esc(b.data.text)}" placeholder="Вопрос игроку, например: «Ты поцелуешь меня?»">`;
    } else if (b.kind === 'option') {
      inner = `<span class="ed-opt-sign">?</span><input class="ed-input" data-id="${b.id}" data-field="text" value="${esc(b.data.text)}" placeholder="Текст варианта (например: Да)">`;
    } else if (b.kind === 'ifblock') {
      inner = `<span class="ed-if-label">Если игрок выбрал:</span><input class="ed-input ed-mono" data-id="${b.id}" data-field="value" value="${esc(b.data.value)}" placeholder="Да">`;
    } else if (b.kind === 'endif') {
      inner = `<span class="ed-blank-label">⑃ конец ветки «если»</span>`;
    } else if (b.kind === 'comment') {
      inner = `<input class="ed-input ed-mono" data-id="${b.id}" data-field="line" value="${esc(b.data.line !== undefined ? b.data.line : '# ' + (b.data.text || ''))}" placeholder="# комментарий…">`;
    } else if (b.kind === 'blank') {
      inner = `<span class="ed-blank-label">· · · разделитель сцен · · ·</span>`;
    } else {
      inner = `<input class="ed-input ed-mono" data-id="${b.id}" data-field="line" value="${esc(b.data.line)}" list="edRawHints" placeholder="@var trust += 1">`;
    }

    return `
      <div class="ed-block ed-kind-${b.kind}">
        <span class="ed-num">${i + 1}</span>
        <span class="ed-kind-tag">${KIND_LABELS[b.kind] || b.kind}</span>
        <div class="ed-fields">${inner}</div>
        <div class="ed-actions">
          <button class="ed-mini" onclick="editorMoveBlock(${b.id},-1)" title="Выше">↑</button>
          <button class="ed-mini" onclick="editorMoveBlock(${b.id},1)" title="Ниже">↓</button>
          <button class="ed-mini" onclick="editorDuplicateBlock(${b.id})" title="Дублировать">⧉</button>
          <button class="ed-mini ed-del" onclick="editorDeleteBlock(${b.id})" title="Удалить">✕</button>
        </div>
      </div>`;
  }).join('') + `<datalist id="edRawHints">${['@var trust += 1', '? Да', '? Нет', '@ns', '@cont', '! speed 25'].map((h) => `<option value="${esc(h)}"></option>`).join('')}</datalist>`;

  // live-обновление модели при вводе
  wrap.querySelectorAll('.ed-input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const idx = editorFindIndex(Number(inp.dataset.id));
      if (idx < 0) return;
      editorBlocks[idx].data[inp.dataset.field] = inp.value;
      editorUpdatePreview();
    });
  });
  // выпадающие списки (id блока берём из родительской строки .ed-block)
  wrap.querySelectorAll('.ed-select-in').forEach((selEl) => {
    selEl.addEventListener('change', () => {
      const blockEl = selEl.closest('.ed-block');
      const numEl = blockEl && blockEl.querySelector('.ed-num');
      const idx = Number(numEl ? numEl.textContent : 0) - 1;
      if (idx < 0 || idx >= editorBlocks.length) return;
      editorBlocks[idx].data[selEl.dataset.field] = selEl.value;
      editorUpdatePreview();
    });
  });
  // чекбоксы эффектов
  wrap.querySelectorAll('input[data-fx]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const idx = editorFindIndex(Number(cb.dataset.id));
      if (idx < 0) return;
      const blk = editorBlocks[idx];
      let list = (blk.data.fx || []).slice();
      const v = cb.dataset.fx;
      if (v === 'none') { list = cb.checked ? ['none'] : []; }
      else {
        list = list.filter((x) => x !== 'none');
        if (cb.checked) list.push(v); else list = list.filter((x) => x !== v);
      }
      blk.data.fx = list;
      editorUpdatePreview();
    });
  });
}

// helper: выпадающий список внутри блока
// (data-id подставляется в шаблоне блока через замену заглушки)
function selectHtml(field, options, current, label) {
  return `<label class="ed-sel-wrap"><span class="ed-sel-label">${label}</span>` +
    `<select class="ed-select-in" data-field="${field}">` +
    options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(current) ? ' selected' : ''}>${l}</option>`).join('') +
    `</select></label>`;
}

function editorUpdatePreview() {
  const p = document.getElementById('edPreview');
  if (p) p.value = editorGetText();
}

// ============ ОПЕРАЦИИ НАД БЛОКАМИ ============
// Добавление блока по типу — просто нажимаете кнопку на панели.
function editorQuickAdd(kind) {
  let data;
  switch (kind) {
    case 'narrator': data = { text: '' }; break;
    case 'dialogue': data = { speaker: '', text: '' }; break;
    case 'char':     data = { char: 'kriss-happy', anim: 'fade' }; break;
    case 'bg':       data = { bg: 'tent-dark' }; break;
    case 'fx':       data = { fx: ['fog'] }; break;
    case 'flash':    data = { flash: 'white' }; break;
    case 'sfx':      data = { sfx: 'door-creak' }; break;
    case 'music':    data = { music: 'music-box' }; break;
    case 'wait':     data = { ms: '2000' }; break;
    case 'blank':    data = {}; break;
    case 'comment':  data = { line: '# ' }; break;
    case 'choice':   data = { text: '' }; break;
    case 'option':   data = { text: 'Да' }; break;
    case 'ifblock':  data = { value: 'Да' }; break;
    case 'endif':    data = {}; break;
    default:         kind = 'raw'; data = { line: '' };
  }
  const b = { id: editorMakeId(), kind, data };
  // новые блоки вставляем после последнего выделенного? пока — в конец
  editorBlocks.push(b);
  editorRenderBlocks();
  editorUpdatePreview();
  const wrap = document.getElementById('edBlocks');
  const blocks = wrap.querySelectorAll('.ed-block');
  const lastEl = blocks[blocks.length - 1];
  if (lastEl) {
    lastEl.classList.add('ed-new');
    setTimeout(() => lastEl.classList.remove('ed-new'), 700);
    const inp = lastEl.querySelector('input.ed-input');
    if (inp) { inp.focus(); inp.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else lastEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Вставить готовый пресет командой вручную (для продвинутых кнопок)
function editorInsertPreset(line) {
  editorBlocks.push({ id: editorMakeId(), kind: 'raw', data: { line } });
  editorRenderBlocks();
  editorUpdatePreview();
}

// Совместимость: старый вызов editorAddBlock() -> quick add narrator
function editorAddBlock() { editorQuickAdd('narrator'); }

function editorDeleteBlock(id) {
  const i = editorFindIndex(id);
  if (i < 0) return;
  editorBlocks.splice(i, 1);
  editorRenderBlocks();
  editorUpdatePreview();
}

function editorDuplicateBlock(id) {
  const i = editorFindIndex(id);
  if (i < 0) return;
  const copy = JSON.parse(JSON.stringify(editorBlocks[i]));
  copy.id = editorMakeId();
  editorBlocks.splice(i + 1, 0, copy);
  editorRenderBlocks();
  editorUpdatePreview();
}

function editorMoveBlock(id, dir) {
  const i = editorFindIndex(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= editorBlocks.length) return;
  [editorBlocks[i], editorBlocks[j]] = [editorBlocks[j], editorBlocks[i]];
  editorRenderBlocks();
  editorUpdatePreview();
}

// ============ СОХРАНЕНИЕ ============
// 1) В localStorage — мгновенно, переживает перезагрузку страницы.
function editorSave() {
  try {
    localStorage.setItem(EDITOR_STORAGE_KEY, editorGetText());
    editorSetStatus('Сохранено в браузере ✓');
    return true;
  } catch (e) {
    editorSetStatus('Не удалось сохранить: ' + e.message);
    return false;
  }
}

function editorLoadFromStorage() {
  let saved = null;
  try { saved = localStorage.getItem(EDITOR_STORAGE_KEY); } catch (e) {}
  if (saved !== null && saved.trim() !== '') {
    editorSetText(saved);
    editorSetStatus('Загружено из браузера ✓');
  } else {
    editorLoadDefaultDemo();
    editorSetStatus('Показан демо-сценарий');
  }
}

function editorResetDefault() {
  editorLoadDefaultDemo();
  editorSave();
  editorSetStatus('Восстановлен демо-сценарий ✓');
}

async function editorLoadDefaultDemo() {
  try {
    const r = await fetch('data/script.txt');
    if (r.ok) { editorSetText(await r.text()); return; }
  } catch (e) {}
  editorSetText('# Пустой сценарий\nНапиши первую реплику.\n');
}

// 2) Скачивание файла script.txt — его можно положить в data/ или открыть здесь позже.
function editorDownloadScript() {
  editorSave(); // дублируем в localStorage на всякий случай
  const text = editorGetText() + '\n';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = editorFileName || EDITOR_DEFAULT_NAME;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  editorSetStatus('Файл ' + a.download + ' сохранён ⬇');
}

// 3) Загрузка файла с диска обратно в редактор
function editorOpenFileInput() {
  document.getElementById('edFileInput').click();
}

function editorHandleFile(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    editorFileName = f.name || EDITOR_DEFAULT_NAME;
    editorSetText(String(reader.result));
    editorSave();
    editorSetStatus('Открыт файл: ' + f.name + ' ✓');
  };
  reader.onerror = () => editorSetStatus('Ошибка чтения файла');
  reader.readAsText(f, 'utf-8');
  ev.target.value = ''; // чтобы один и тот же файл можно было открыть дважды
}

// ============ ИГРАТЬ (предпросмотр) ============
// Прогоняем текущий текст редактора тем же парсером и движком.
function editorPlayPreview() {
  editorSave();
  const text = editorGetText();
  window.CUSTOM_SCRIPT_TEXT = text; // scenes.js подхватит его вместо fetch
  document.getElementById('stageEditor').classList.add('hidden');
  if (typeof startDemo === 'function') startDemo();
  else if (typeof startScenes === 'function') startScenes();
}

function editorSetStatus(msg) {
  const el = document.getElementById('edStatus');
  if (el) el.textContent = msg;
}

// Автосохранение раз в 5 секунд, если есть несохранённые изменения
setInterval(() => {
  const s = document.getElementById('stageEditor');
  if (!s || s.classList.contains('hidden')) return;
  editorSave();
}, 5000);

// ============ ЭКСПОРТ ============
window.openEditor = openEditor;
window.backToMenuFromEditor = backToMenuFromEditor;
window.editorQuickAdd = editorQuickAdd;
window.editorInsertPreset = editorInsertPreset;
window.editorToggleGuide = editorToggleGuide;
window.editorShowMore = editorShowMore;
window.editorAddBlock = editorAddBlock;
window.editorDeleteBlock = editorDeleteBlock;
window.editorDuplicateBlock = editorDuplicateBlock;
window.editorMoveBlock = editorMoveBlock;
window.editorSave = editorSave;
window.editorDownloadScript = editorDownloadScript;
window.editorOpenFileInput = editorOpenFileInput;
window.editorHandleFile = editorHandleFile;
window.editorPlayPreview = editorPlayPreview;
window.editorResetDefault = editorResetDefault;
window.editorSetText = editorSetText;
window.editorGetText = editorGetText;
