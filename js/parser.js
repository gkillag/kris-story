// ============ ПАРСЕР СЦЕНАРИЯ ============
// Превращает текст из data/script.txt в массив сцен,
// с которым работает движок.
//
// СИНТАКСИС:
//   # комментарий
//   Обычная строка          — реплика рассказчика
//   Имя: текст              — реплика персонажа
//   @ns                     — перенос строки в предыдущей реплике
//   @char kriss-happy fade  — показать спрайт
//   @char none              — скрыть спрайт
//   @bg tent-dark           — сменить фон
//   @fx fog flicker         — эффекты
//   @fx none                — убрать эффекты
//   @flash white            — вспышка
//   @wait 2000              — пауза в мс
//   @music sad-theme        — музыка
//   @sfx door-creak         — звук
//   ? Вариант               — вариант выбора
//   @if choice == "Вариант" — начало ветки
//   @else                   — иначе
//   @endif                  — конец ветвления

// ============ ПАРСЕР ============
function parseScript(text) {
  const lines = text.split('\n');
  const scenes = [];

  let current = null;       // текущая сцена (объект)
  let lastScene = null;     // ссылка для @ns (перенос строки)
  let pendingChoices = [];  // накопленные варианты выбора

  // Начинаем новую сцену
  function newScene(init = {}) {
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
      choices: null,        // [{text, branch}]
      branch: null,         // 'if', 'else', null — какой блок
      branchId: null,       // номер ветвления
      ...init,
    };
    scenes.push(scene);
    current = scene;
    lastScene = scene;
    return scene;
  }

  // Применяет команду к текущей сцене
  function applyCommand(cmd, args) {
    // Если текущей сцены нет — создаём пустую (только с командой)
    if (!current) newScene();

    switch (cmd) {
      case 'char':
        if (args[0] === 'none') {
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
    }
  }

  for (let rawLine of lines) {
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

    // Комментарий
    if (line.startsWith('#')) {
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

    // Команда (начинается с @)
    if (line.startsWith('@')) {
      const parts = line.slice(1).split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      // Специальные команды ветвления
      if (cmd === 'if') {
        // @if choice == "Вариант"
        const match = line.match(/@if\s+choice\s*==\s*"([^"]+)"/);
        if (match) {
          const chosen = match[1];
          current = newScene({
            branch: 'if',
            branchChoice: chosen,
            branchId: scenes.length,
          });
        }
        continue;
      }

      if (cmd === 'else') {
        current = newScene({
          branch: 'else',
          branchId: scenes.length,
        });
        continue;
      }

      if (cmd === 'endif') {
        // Конец ветки — просто закрываем текущую сцену
        if (current) current = null;
        continue;
      }

      // Обычная команда
      applyCommand(cmd, args);
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

  // Фильтруем пустые сцены (только команды без текста)
  const cleaned = scenes.filter((s) => {
    return s.text || s.choices || s.character || s.bg || s.flash || s.wait;
  });

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