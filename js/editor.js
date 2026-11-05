// ============ РЕДАКТОР СЦЕН (v1.3, базовая версия) ============
// Блочный редактор сценария в стиле «тёмной книги».
// Каждый блок — одна строка синтаксиса (реплика, @команда, !директива).
// Готовый текст сохраняется в localStorage и скачивается как script.txt —
// тот же формат, что читает движок новеллы (data/script.txt).

const EDITOR_STORAGE_KEY = 'krisStoryScript';
const EDITOR_DEFAULT_NAME = 'script.txt';

let editorBlocks = [];      // [{ id, kind, data }]
let editorBlockSeq = 0;     // счётчик для id блоков
let editorFileName = EDITOR_DEFAULT_NAME;

// ---- справочник типов блоков (для <select>) ----
const EDITOR_KINDS = [
  ['narrator', 'Рассказчик (обычная строка)'],
  ['dialogue', 'Реплика персонажа (Имя: текст)'],
  ['comment',  'Комментарий (# / //)'],
  ['blank',    'Пустая строка (разделитель сцен)'],
  ['raw',      'Другое (@char, @bg, @fx, @if, ? выбор...)'],
];

// Подсказки-примеры для поля raw
const RAW_HINTS = [
  '@char kriss-happy fade', '@char none',
  '@bg tent-dark', '@fx fog flicker', '@fx none',
  '@flash white', '@wait 2000', '@music sad-theme', '@sfx door-creak',
  '@var trust += 1', '? Да', '? Нет',
  '@if choice == "Да"', '@if trust >= 1', '@else', '@endif',
  '! skip', '! auto 2500', '! speed 25', '@ns', '@cont',
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
        <button class="secondary editor-close" onclick="backToMenuFromEditor()">✕ В меню</button>
      </div>

      <div class="editor-toolbar">
        <select id="edKindSelect" class="ed-select"></select>
        <button class="primary ed-btn" onclick="editorAddBlock()" title="Добавить блок">＋ Добавить</button>
        <button class="secondary ed-btn" onclick="editorOpenFileInput()" title="Загрузить .txt">⬆ Открыть файл</button>
        <button class="secondary ed-btn" onclick="editorDownloadScript()" title="Скачать script.txt">⬇ Сохранить файл</button>
        <button class="secondary ed-btn" onclick="editorPlayPreview()" title="Проиграть в новелле">▶ Играть</button>
        <input type="file" id="edFileInput" accept=".txt,text/plain" style="display:none" onchange="editorHandleFile(event)">
      </div>

      <div class="editor-preview-bar">
        <span class="ed-preview-label">Предпросмотр текста:</span>
        <textarea id="edPreview" class="ed-preview" readonly spellcheck="false"></textarea>
      </div>

      <div class="editor-blocks" id="edBlocks"></div>

      <div class="editor-footer">
        <span id="edStatus" class="ed-status">—</span>
        <button class="secondary ed-btn" onclick="editorResetDefault()" title="Вернуть встроенную демо-главу">⟲ Демо-сценарий</button>
      </div>
    </div>
  `;

  const sel = document.getElementById('edKindSelect');
  sel.innerHTML = EDITOR_KINDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}

// ============ МОДЕЛЬ: блок -> строка текста ============
function blockToLine(b) {
  switch (b.kind) {
    case 'narrator': return b.data.text || '';
    case 'dialogue': return (b.data.speaker || '').trim() ? `${(b.data.speaker || '').trim()}: ${b.data.text || ''}` : (b.data.text || '');
    case 'comment':  return b.data.line !== undefined ? b.data.line : `# ${b.data.text || ''}`;
    case 'blank':    return '';
    case 'raw':      return b.data.line || '';
    default:         return '';
  }
}

// Строка текста -> блок модели
function lineToBlock(raw) {
  const b = { id: editorMakeId(), kind: 'raw', data: {} };
  const t = raw.trim();

  if (t === '') { b.kind = 'blank'; return b; }
  // комментарии храним в исходном виде (kind='comment' + data.line),
  // чтобы round-trip «текст -> блоки -> текст» был потерь-free
  if (/^(#|\/\/)/.test(t)) { b.kind = 'comment'; b.data.line = raw; return b; }

  const m = t.match(/^([^:@!?\/#][^:]*?):\s(.+)$/);
  if (m && !t.startsWith('@')) { b.kind = 'dialogue'; b.data.speaker = m[1].trim(); b.data.text = m[2]; return b; }

  b.kind = 'raw'; b.data.line = raw; return b;
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
    } else if (b.kind === 'comment') {
      inner = `<input class="ed-input ed-mono" data-id="${b.id}" data-field="line" value="${esc(b.data.line !== undefined ? b.data.line : '# ' + (b.data.text || ''))}" placeholder="# комментарий…">`;
    } else if (b.kind === 'blank') {
      inner = `<span class="ed-blank-label">· · · пустая строка (новая сцена) · · ·</span>`;
    } else {
      inner = `<input class="ed-input ed-mono" data-id="${b.id}" data-field="line" value="${esc(b.data.line)}" list="edRawHints" placeholder="@char kriss-happy fade">`;
    }

    return `
      <div class="ed-block ed-kind-${b.kind}">
        <span class="ed-num">${i + 1}</span>
        <div class="ed-fields">${inner}</div>
        <div class="ed-actions">
          <button class="ed-mini" onclick="editorMoveBlock(${b.id},-1)" title="Выше">↑</button>
          <button class="ed-mini" onclick="editorMoveBlock(${b.id},1)" title="Ниже">↓</button>
          <button class="ed-mini" onclick="editorDuplicateBlock(${b.id})" title="Дублировать">⧉</button>
          <button class="ed-mini ed-del" onclick="editorDeleteBlock(${b.id})" title="Удалить">✕</button>
        </div>
      </div>`;
  }).join('') + `<datalist id="edRawHints">${RAW_HINTS.map((h) => `<option value="${esc(h)}"></option>`).join('')}</datalist>`;

  // live-обновление модели при вводе
  wrap.querySelectorAll('.ed-input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const idx = editorFindIndex(Number(inp.dataset.id));
      if (idx < 0) return;
      editorBlocks[idx].data[inp.dataset.field] = inp.value;
      editorUpdatePreview();
    });
  });
}

function editorUpdatePreview() {
  const p = document.getElementById('edPreview');
  if (p) p.value = editorGetText();
}

// ============ ОПЕРАЦИИ НАД БЛОКАМИ ============
function editorAddBlock() {
  const kind = document.getElementById('edKindSelect').value;
  const b = { id: editorMakeId(), kind, data: {} };
  if (kind === 'dialogue') b.data = { speaker: '', text: '' };
  else if (kind === 'raw' || kind === 'comment') b.data = { line: kind === 'comment' ? '# ' : '' };
  else b.data = { text: '' };
  editorBlocks.push(b);
  editorRenderBlocks();
  editorUpdatePreview();
  const wrap = document.getElementById('edBlocks');
  const last = wrap.querySelector('.ed-block:last-of-type .ed-input');
  if (last) last.focus();
}

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
