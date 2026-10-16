// ============ ПАРСЕР СЦЕНАРИЯ ============
// Превращает текст из data/script.txt в массив сцен,
// с которым работает движок.
//
// СИНТАКСИС:
//   # комментарий
//   // комментарий
//   Пустая строка           — разделитель сцен (текст до/после — разные сцены)
//   Обычная строка          — реплика рассказчика
//   Имя: текст              — реплика персонажа
//   @ns                     — перенос строки в предыдущей реплике
//   @cont                   — присоединить следующую строку к предыдущей
//                             реплике через пробел (без новой сцены)
//   @char kriss-happy fade  — показать спрайт (left / right / fade)
//   @char none              — скрыть спрайт
//   @bg tent-dark           — сменить фон (.jpg из assets/bg/)
//   @fx fog flicker         — эффекты (fog / flicker / dust / rain)
//   @fx none                — убрать эффекты
//   @flash white            — вспышка (white / blood)
//   @wait 2000              — автопауза в мс перед продолжением
//   @music sad-theme        — музыка (.mp3 из assets/music/, none — стоп)
//   @sfx door-creak         — звук (.mp3 из assets/sfx/)
//   @var name = "текст"     — записать значение в переменную
//   @var counter += 1       — прибавить число к переменной
//   @var counter -= 1       — отнять число от переменной
//   ? Вариант               — вариант выбора
//   @if choice == "Вариант" — ветка по последнему выбору игрока
//   @if name == "текст"     — ветка по значению переменной
//   @if name != "текст"     — ветка «не равно»
//   @if name > 2 / >= 2 / < 2 / <= 2 — числовое сравнение
//   @else                   — иначе
//   @endif                  — конец ветвления
//   Ветки можно вкладывать друг в друга.
//   ! skip                    — сцена показывается мгновенно (без печати)
//   ! auto 2500               — продолжить автоматически через мс
//   ! speed 25                — скорость печати (мс на символ)
//   Текст внутри реплик поддерживает разметку:
//   *жирный*  ~курсив~  _подчёркнутый_
//   [red]цвет[/red] или [red]цвет[/]  [gold]...[/gold]
//   [k]имя[/k] — подставляется имя игрока из CONFIG.playerName
//   {name} — подстановка переменной сценария (@var), работает и в ? вариантах

// Переменные сценария (@var) — глобальны на время прогона
window.SCENE_VARS = {};

// Оценка условия @if: левая часть — 'choice' (последний выбор игрока)
// или имя переменной из @var; правая — строка в кавычках или число.
// Выполняется В РАНТАЙМЕ движком (после того как игрок сделал выбор).
function evalCondition(left, op, right) {
  let actual;
  if (left === 'choice') {
    actual = window.playerChoice !== undefined ? String(window.playerChoice) : '';
  } else {
    const v = window.SCENE_VARS[left];
    actual = v === undefined || v === null ? '' : String(v);
  }

  const literal = right.trim().replace(/^(['"])(.*)\1$/, '$2');

  switch (op) {
    case '==':
      return actual === literal;
    case '!=':
      return actual !== literal;
    default: {
      // Числовые сравнения: >=, <=, >, <
      const a = parseFloat(actual);
      const b = parseFloat(literal);
      if (isNaN(a) || isNaN(b)) return false;
      if (op === '>=') return a >= b;
      if (op === '<=') return a <= b;
      if (op === '>') return a > b;
      if (op === '<') return a < b;
    }
  }
  return false;
}
window.evalCondition = evalCondition;

// ============ ПАРСЕР ============
function parseScript(text) {
  const lines = text.split('\n');
  const scenes = [];

  let current = null;       // текущая сцена (объект)
  let lastScene = null;     // ссылка для @ns / @cont
  let errors = [];          // синтаксические ошибки (выводятся в консоль)
  let lineNo = 0;

  // Контекст ветвления: стек открытых блоков if/else.
  // Ветки НЕ вырезаются на этапе парсинга — вместо этого каждая сцена
  // получает branchId, а движок выполняет их лениво (условия зависят
  // от выбора игрока и переменных, известных только во время прогона).
  const blockStack = [];
  let blockCounter = 0;

  // Текущий блок (или null)
  function topBlock() {
    return blockStack.length ? blockStack[blockStack.length - 1] : null;
  }

  // Начинаем новую сцену
  function newScene(init = {}) {
    const blk = topBlock();
    const scene = {
      speaker: '',
      text: '',
      character: '',
      charEnter: 'fade',
      bg: '',
      effects: null,        // null = не менять
      flash: null,
      wait: null,
      music: null,
      sfx: null,
      choices: null,        // [{text}]
      skip: false,          // мгновенный показ (! skip)
      auto: null,           // автопродолжение через N мс (! auto)
      speed: null,          // скорость печати, мс/символ (! speed)
      blockId: blk ? blk.id : null,   // id блока ветвления
      blockType: blk ? blk.type : null, // 'if' | 'else' | null
      ...init,
    };
    scenes.push(scene);
    current = scene;
    lastScene = scene;
    return scene;
  }

  // Применяет команду к текущей сцене
  function applyCommand(cmd, args, rawLine) {
    // Если текущей сцены нет — создаём пустую (только с командой)
    if (!current) newScene();

    switch (cmd) {
      case 'char':
        if (args[0] === 'none' || args.length === 0) {
          current.character = '';
          current.charEnter = '';
        } else {
          current.character = 'assets/sprites/' + args[0] + '.png';
          current.charEnter = args[1] || 'fade';
        }
        break;

      case 'bg':
        current.bg = 'url(assets/bg/' + args[0] + '.jpg)';
        break;

      case 'fx':
        if (args[0] === 'none') {
          current.effects = [];
        } else {
          current.effects = args;
        }
        break;

      case 'flash':
        current.flash = args[0] || 'white';
        break;

      case 'wait':
        current.wait = parseInt(args[0]) || 1000;
        break;

      case 'music':
        if (args[0] === 'none') {
          current.music = 'stop';
        } else {
          current.music = 'assets/music/' + args[0] + '.mp3';
        }
        break;

      case 'sfx':
        current.sfx = 'assets/sfx/' + args[0] + '.mp3';
        break;

      // @var name = "текст" | @var name += 1 | @var name -= 1
      case 'var': {
        const m = rawLine.match(
          /^@var\s+([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)\s*(\+|-)?=\s*(.+)$/
        );
        if (!m) {
          errors.push(`строка ${lineNo}: неверный синтаксис @var → "${rawLine}"`);
          break;
        }
        // Внутри ветки команда выполняется лениво движком — сохраняем как step
        const blk = topBlock();
        if (blk) {
          current.steps = current.steps || [];
          current.steps.push({ type: 'var', name: m[1], op: m[2] || '=', value: m[3].trim() });
          break;
        }
        let value = m[3].trim().replace(/^(['"])(.*)\1$/, '$2');
        if (m[2] === '+' || m[2] === '-') {
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push(`строка ${lineNo}: @var ${m[2]}= ожидает число, получено "${value}"`);
            break;
          }
          const prev = parseFloat(window.SCENE_VARS[m[1]]) || 0;
          value = m[2] === '+' ? prev + num : prev - num;
        }
        window.SCENE_VARS[m[1]] = value;
        break;
      }

      default:
        errors.push(`строка ${lineNo}: неизвестная команда "@${cmd}"`);
    }
  }

  // Разбор условия @if без вычисления (вычислит движок в рантайме)
  function parseIfCondition(line) {
    return line.match(
      /^@if\s+([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)\s*(>=|<=|!=|==|>|<)\s*(.+)$/
    );
  }

  for (let rawLine of lines) {
    lineNo++;
    const line = rawLine.trim();

    // Пустая строка — разделитель сцен
    if (line === '') {
      // Если была сцена с текстом — закрываем её
      // (следующая строка начнёт новую)
      if (current && current.text) {
        current = null;
      }
      continue;
    }

    // Комментарий (# или //)
    if (line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Перенос строки в предыдущей реплике
    if (line === '@ns') {
      if (lastScene) {
        lastScene.text += '\n';
        // Следующая строка будет добавлена в ту же сцену
        current = lastScene;
      }
      continue;
    }

    // Присоединить следующую строку к предыдущей реплике через пробел
    if (line === '@cont') {
      if (lastScene) {
        lastScene._joinNextWithSpace = true;
        current = lastScene;
      }
      continue;
    }

    // Команда (начинается с @)
    if (line.startsWith('@')) {
      const parts = line.slice(1).split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      // ---- ВЕТВЛЕНИЕ (стек блоков, поддержка вложенности) ----
      if (cmd === 'if') {
        // @if choice == "Да" | @if trust >= 2 | @if name != "Крисс"
        const m = parseIfCondition(line);
        if (!m) {
          errors.push(`строка ${lineNo}: неверный синтаксис @if → "${line}"`);
          continue;
        }
        const id = ++blockCounter;
        const cond = { left: m[1], op: m[2], right: m[3] };
        blockStack.push({ id, type: 'if', cond, openElse: false });
        // Маркер начала блока — движок оценит условие в рантайме
        newScene({ marker: '@if', origBlockId: id, cond });
        current = null;
        continue;
      }

      if (cmd === 'else') {
        const top = topBlock();
        if (!top || top.openElse) {
          errors.push(`строка ${lineNo}: @else без открытого @if (или повторный)`);
          continue;
        }
        top.type = 'else';
        top.openElse = true;
        // Маркер @else (принадлежит тому же блоку)
        newScene({ marker: '@else', origBlockId: top.id });
        current = null;
        continue;
      }

      if (cmd === 'endif') {
        if (blockStack.length === 0) {
          errors.push(`строка ${lineNo}: @endif без открытого @if`);
          continue;
        }
        const closed = blockStack.pop();
        // Маркер конца блока — при пропуске ветки движок идёт на afterIdx
        newScene({ marker: '@endif', origBlockId: closed.id });
        current = null;
        continue;
      }

      // Обычная команда
      applyCommand(cmd, args, line);
      continue;
    }

    // Inline-директивы (! skip / ! auto 2000 / ! speed 25)
    if (line.startsWith('!')) {
      const parts = line.slice(1).trim().split(/\s+/);
      const dir = parts[0];
      if (dir === 'skip' || dir === 'auto' || dir === 'speed') {
        if (!current) newScene();
        if (dir === 'skip') current.skip = true;
        if (dir === 'auto') current.auto = parseInt(parts[1]) || 1500;
        if (dir === 'speed') current.speed = parseInt(parts[1]) || 40;
      } else {
        errors.push(`строка ${lineNo}: неизвестная директива "!${dir}"`);
      }
      continue;
    }

    // Вариант выбора (? текст)
    if (line.startsWith('?')) {
      const choiceText = line.slice(1).trim();
      if (!current) newScene();
      if (!current.choices) current.choices = [];
      current.choices.push({ text: choiceText });
      continue;
    }

    // Строка после @cont — присоединяем к предыдущей сцене через пробел
    if (lastScene && lastScene._joinNextWithSpace) {
      lastScene.text = (lastScene.text ? lastScene.text + ' ' : '') + line;
      lastScene._joinNextWithSpace = false;
      current = lastScene;
      continue;
    }

    // Реплика персонажа (Имя: текст)
    // Проверяем: есть ли двоеточие в начале (до 30 символов от начала)
    const colonIdx = line.indexOf(':');
    const isCharacterLine = colonIdx > 0 && colonIdx < 30;

    if (isCharacterLine) {
      const speaker = line.slice(0, colonIdx).trim();
      const text = line.slice(colonIdx + 1).trim();
      newScene({ speaker, text });
    } else {
      // Реплика рассказчика
      if (current && current.text && !current.speaker) {
        // Продолжаем предыдущую реплику (если она была без спикера)
        current.text += ' ' + line;
        lastScene = current;
      } else {
        newScene({ speaker: '', text: line });
      }
    }
  }

  if (blockStack.length > 0) {
    errors.push(`не закрыт блок @if (${blockStack.length} шт.) — добавьте @endif`);
  }

  if (errors.length) {
    console.warn('[parser] Синтаксические ошибки сценария:\n' + errors.join('\n'));
  }

  // Фильтруем пустые сцены (только команды без текста).
  // Маркерные сцены (@if/@else/@endif) всегда сохраняем — на них прыгает движок.
  const cleaned = scenes.filter((s) => {
    return (
      s.marker ||
      s.text || s.choices || s.character || s.bg || s.flash || s.wait ||
      s.music || s.sfx || s.effects !== null || s.skip || s.auto !== null ||
      (s.steps && s.steps.length)
    );
  });

  // Собираем «карту» ветвлений для движка (индексы — в массиве cleaned).
  // Маркерные сцены задают границы блоков;
  // afterIdx — индекс первой сцены ПОСЛЕ блока (куда прыгать при пропуске).
  const branchMap = {};
  let nextId = 1;
  cleaned.forEach((s, i) => {
    if (s.marker === '@if') {
      s.blockId = nextId;               // нормализуем id маркера по порядку
      branchMap[nextId] = {
        id: nextId, cond: s.cond, startIdx: i, elseIdx: null, endIdx: i,
      };
      nextId++;
    } else if (s.marker === '@else') {
      const blk = branchMap[s.origBlockId];
      if (blk) {
        s.blockId = blk.id;
        blk.elseIdx = i;
      }
    } else if (s.marker === '@endif') {
      const blk = branchMap[s.origBlockId];
      if (blk) {
        s.blockId = blk.id;
        blk.endIdx = i;
      }
    }
  });

  Object.values(branchMap).forEach((blk) => {
    blk.afterIdx = Math.min(blk.endIdx + 1, cleaned.length);
  });

  window.SCENE_BRANCHES = branchMap;
  return cleaned;
}

// ============ ЗАГРУЗКА ФАЙЛА ============
// Через fetch — работает на localhost и GitHub Pages.
// На file:// не работает (CORS).
async function loadScript(url = 'data/script.txt') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось загрузить script.txt: ' + response.status);
  }
  const text = await response.text();
  return parseScript(text);
}

// ============ ЭКСПОРТ ============
window.parseScript = parseScript;
window.loadScript = loadScript;