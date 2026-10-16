// ============ ДВИЖОК СЦЕН (работает через парсер) ============

let SCENES = [];
let currentSceneIndex = 0;
let typingInterval = null;
let isTyping = false;
let currentFullText = '';
let typeSpeed = 40;

// Таймер автопродолжения (! auto / @wait)
let autoTimer = null;
function clearAutoTimer() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

// Ожидание выбора игрока
let awaitingChoice = false;
let currentChoiceScene = null;

// ============ РАЗМЕТКА И ПОДСТАНОВКИ В ТЕКСТЕ ============
// *жирный*  ~курсив_~  _подчёркнутый_  [red]...[/red] или [red]...[/]
// [gold]...[/gold]  [k]...[/k] — имя игрока
// {имя} — подстановка переменной сценария (@var name)
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Подстановка переменных: {trust}, {name} и т.п.
// (внутри строк выбора ? тоже поддерживается)
function interpolateVars(s) {
  return s.replace(/\{([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)\}/g, (_, name) => {
    const v = window.SCENE_VARS[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

function formatInline(s) {
  let out = escapeHtml(interpolateVars(s));
  // закрывающий тег можно писать как [/] или как [red]
  const playerName = (window.CONFIG && window.CONFIG.herName) || 'Крисс';
  out = out.replace(/\[k\]([\s\S]*?)\[\/(k)?\]/g, playerName); // [k]...[/k] — имя игрока
  out = out.replace(/\[red\]([\s\S]*?)\[\/(red)?\]/g, '<span class="txt-red">$1</span>');
  out = out.replace(/\[gold\]([\s\S]*?)\[\/(gold)?\]/g, '<span class="txt-gold">$1</span>');
  out = out.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  out = out.replace(/~([^~\n]+)~/g, '<em>$1</em>');
  out = out.replace(/_([^_\n]+)_/g, '<u>$1</u>');
  return out;
}

// Разбивает текст на «сегменты»: обычный посимвольный и HTML-фрагменты.
// Возвращает [{html:'<strong>'}, {ch:'т'}, ...] — для печати без поломки тегов.
function buildSegments(text) {
  const parts = text.split('\n');
  const segs = [];
  parts.forEach((part, i) => {
    if (i > 0) segs.push({ html: '<br>' });
    const fmt = formatInline(part);
    // Режем на теги и обычный текст
    const tokens = fmt.split(/(<[^>]+>)/g);
    for (const tok of tokens) {
      if (!tok) continue;
      if (tok.startsWith('<')) {
        segs.push({ html: tok });
      } else {
        for (const ch of tok) segs.push({ ch });
      }
    }
  });
  return segs;
}

// ============ ЗАПУСК ============
async function startScenes() {
  document.getElementById('stageMenu').classList.add('hidden');
  const s = document.getElementById('stageDemo');
  s.classList.remove('hidden');
  s.classList.add('stage-fade');

  // Загружаем сценарий через парсер
  try {
    SCENES = await loadScript('data/script.txt');
  } catch (err) {
    console.error('Ошибка загрузки script.txt:', err);
    s.innerHTML = `
      <div class="novel-scene">
        <div class="demo-text">
          <span class="highlight">Ошибка загрузки script.txt</span>
          <br><br>
          <small style="font-size: 13px; opacity: 0.7;">
            ${err.message}<br>
            Открой через Live Server или GitHub Pages.
          </small>
        </div>
      </div>
    `;
    return;
  }

  if (SCENES.length === 0) {
    console.error('script.txt пуст или не распарсился');
    return;
  }

  // Создаём разметку сцены
  s.innerHTML = `
    <div class="novel-scene">
      <img id="character" class="character" src="" alt="" onerror="onCharError()">
      <div id="characterEmoji" class="character-emoji" style="display: none;"></div>
      <div class="dialogue-box" id="dialogueBox" onclick="advanceScene()">
        <div class="speaker-name" id="speakerName"></div>
        <div class="dialogue-text" id="dialogueText"></div>
        <div class="continue-hint" id="continueHint">▼</div>
      </div>
      <div class="playback-bar">
        <button class="pb-btn" id="btnPause" onclick="togglePause()" title="Пауза">⏸</button>
        <button class="pb-btn" id="btnAuto" onclick="toggleAuto()" title="Автопрокрутка">▶▶</button>
        <button class="pb-btn" onclick="backToMenu()" title="Выйти в меню">✕</button>
      </div>
      <div id="choicesOverlay" class="choices-overlay" style="display: none;"></div>
    </div>
  `;

  // Сброс переменных и выбора при старте прогона
  window.SCENE_VARS = {};
  window.playerChoice = undefined;
  resetPlaybackState();

  currentSceneIndex = 0;
  showScene(SCENES[0]);
}

// ============ ПОКАЗ СЦЕНЫ ============
function showScene(scene) {
  if (!scene) return;

  clearAutoTimer();

  // Фон — если указан
  if (scene.bg) {
    setBackground(scene.bg);
  }

  // Эффекты — если указаны
  if (scene.effects !== null && scene.effects !== undefined) {
    setEffects(scene.effects);
  }

  // Вспышка
  if (scene.flash) {
    setTimeout(() => triggerFlash(scene.flash), 100);
  }

  // Музыка
  if (scene.music) {
    if (typeof playMusic === 'function') playMusic(scene.music);
  }

  // SFX
  if (scene.sfx) {
    if (typeof playSfx === 'function') playSfx(scene.sfx);
  }

  // Персонаж
  updateCharacter(scene.character, scene.charEnter);

  // Спикер
  const speakerName = scene.speaker
    ? formatInline(scene.speaker)
        .replace(/<\/?span[^>]*>/g, '')
        .replace(/<\/?(strong|em)[^>]*>/g, '')
    : '';
  document.getElementById('speakerName').innerHTML = speakerName;

  // Текст — с эффектом печати
  const textEl = document.getElementById('dialogueText');
  textEl.innerHTML = '';
  document.getElementById('continueHint').classList.remove('show');

  // Если есть выбор — покажем после печати текста
  currentChoiceScene = scene.choices ? scene : null;
  awaitingChoice = false;

  if (scene.text) {
    currentFullText = scene.text;
    const segments = buildSegments(scene.text);

    const textSpan = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    textEl.appendChild(textSpan);
    textEl.appendChild(cursor);

    clearInterval(typingInterval);

    // ! skip — мгновенный показ без печати
    if (scene.skip) {
      renderSegments(segments, textSpan);
      cursor.remove();
      isTyping = false;
      onTypingComplete(scene);
      return;
    }

    isTyping = true;
    let segIndex = 0;
    const speed = scene.speed || typeSpeed;

    typingInterval = setInterval(() => {
      if (segIndex < segments.length) {
        appendSegment(textSpan, segments[segIndex]);
        segIndex++;
        if (segments[segIndex - 1].ch && typeof playTypingSound === 'function') {
          playTypingSound();
        }
      } else {
        clearInterval(typingInterval);
        cursor.remove();
        isTyping = false;
        onTypingComplete(scene);
      }
    }, speed);
  } else {
    // Сцена без текста (например, только выбор)
    onTypingComplete(scene);
  }
}

// Добавление сегмента (символ или готовый HTML-тег) в контейнер
function appendSegment(container, seg) {
  if (seg.html !== undefined) {
    const tmp = document.createElement('span');
    tmp.innerHTML = seg.html;
    while (tmp.firstChild) container.appendChild(tmp.firstChild);
  } else {
    container.appendChild(document.createTextNode(seg.ch));
  }
}

// Мгновенный рендер всех сегментов
function renderSegments(segments, container) {
  for (const seg of segments) appendSegment(container, seg);
}

// Вызывается, когда текст напечатан (или его нет)
function onTypingComplete(scene) {
  // Если есть выбор — показываем кнопки
  if (scene.choices && scene.choices.length > 0) {
    showChoices(scene.choices);
    return;
  }

  // Подсказка «▼» — кроме случаев, когда сейчас автопродолжение
  const hasAuto = scene.auto !== null || (scene.wait !== null && !scene.choices);
  if (!hasAuto) {
    document.getElementById('continueHint').classList.add('show');
  }

  // @wait N — пауза перед появлением подсказки/автопродолжения
  // ! auto N — продолжить автоматически через N мс
  const waitMs = scene.wait !== null ? scene.wait : 0;

  if (scene.auto !== null) {
    autoTimer = setTimeout(() => {
      autoTimer = null;
      advanceScene();
    }, waitMs + scene.auto);
    return;
  }

  if (waitMs > 0) {
    // Пауза, затем показываем подсказку
    autoTimer = setTimeout(() => {
      autoTimer = null;
      document.getElementById('continueHint').classList.add('show');
    }, waitMs);
  }
}

// ============ ПОКАЗ ВЫБОРА ============
function showChoices(choices) {
  awaitingChoice = true;
  const overlay = document.getElementById('choicesOverlay');
  overlay.innerHTML = '';
  overlay.style.display = 'flex';

  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    // в тексте вариантов работают {переменные} и *разметка*
    btn.innerHTML = formatInline(choice.text);
    btn.onclick = () => selectChoice(interpolateVars(choice.text));
    overlay.appendChild(btn);
  });
}

function selectChoice(text) {
  window.playerChoice = text;
  awaitingChoice = false;

  const overlay = document.getElementById('choicesOverlay');
  overlay.style.display = 'none';
  overlay.innerHTML = '';

  // Идём к следующей сцене (через обработку маркеров ветвления)
  gotoNextScene();
}

// ============ ТАП ПО ЭКРАНУ ============
function advanceScene() {
  // Если ждём выбора — игнорируем тап
  if (awaitingChoice) return;

  // Пауза: тап только допечатывает текст, но не листают дальше
  if (isPaused) {
    if (isTyping) finishTypingNow();
    return;
  }

  // Если печатается — показать сразу
  if (isTyping) {
    clearAutoTimer();
    finishTypingNow();
    onTypingComplete(SCENES[currentSceneIndex]);
    return;
  }

  // Тап отменяет автопродолжение и просто идёт дальше
  clearAutoTimer();

  // Следующая исполнимая сцена
  gotoNextScene();
}

// Мгновенно «допечатать» текущий текст
function finishTypingNow() {
  clearInterval(typingInterval);
  const textEl = document.getElementById('dialogueText');
  textEl.innerHTML = '';
  renderSegments(buildSegments(currentFullText), textEl);
  isTyping = false;
}

// ============ ПАУЗА / АВТОПРОКРУТКА ============
let isPaused = false;
let autoModeMs = null;        // null — выключено, число — задержка между сценами
let autoChainTimer = null;

function setPauseUI(paused) {
  const btn = document.getElementById('btnPause');
  if (btn) btn.textContent = paused ? '▶' : '⏸';
}

function togglePause() {
  isPaused = !isPaused;
  setPauseUI(isPaused);
  if (!isPaused && autoModeMs !== null) scheduleAuto();
}

function toggleAuto() {
  if (autoModeMs === null) {
    autoModeMs = 1500;
    if (typeof showToast === 'function') showToast('⏩ Автопрокрутка включена');
    scheduleAuto();
  } else {
    autoModeMs = null;
    clearTimeout(autoChainTimer);
    autoChainTimer = null;
    if (typeof showToast === 'function') showToast('Автопрокрутка выключена');
  }
}

// Цепочка автопрокрутки: сама продвигает сцены, пока включена
function scheduleAuto() {
  clearTimeout(autoChainTimer);
  if (autoModeMs === null || isPaused) return;
  autoChainTimer = setTimeout(() => {
    autoChainTimer = null;
    if (autoModeMs === null || isPaused) return;
    // Если всё ещё печатаем — сначала мгновенно допечатать
    if (isTyping) { finishTypingNow(); onTypingComplete(SCENES[currentSceneIndex]); return; }
    advanceScene();
    scheduleAuto();
  }, autoModeMs);
}

// Сброс паузы/автомата при старте и выходе из прогонов
function resetPlaybackState() {
  isPaused = false;
  autoModeMs = null;
  clearTimeout(autoChainTimer);
  autoChainTimer = null;
  setPauseUI(false);
}

// Переход к следующей сцене с обработкой маркеров ветвления (@if/@else/@endif)
function gotoNextScene() {
  let guard = 0;
  while (currentSceneIndex + 1 < SCENES.length && guard++ < 10000) {
    currentSceneIndex++;
    const scene = SCENES[currentSceneIndex];

    // ---- МАРКЕРЫ ВЕТВЛЕНИЯ ----
    if (scene.marker === '@if') {
      const blk = window.SCENE_BRANCHES[scene.blockId];
      const ok = window.evalCondition(scene.cond.left, scene.cond.op, scene.cond.right);
      if (ok) continue;               // заходим в ветку — идём дальше
      // условие ложно → прыгаем на @else (если есть) или после @endif
      currentSceneIndex = blk.elseIdx !== null ? blk.elseIdx : blk.afterIdx;
      const elseScene = SCENES[currentSceneIndex];
      if (elseScene && elseScene.marker === '@else') continue; // @else-ветка активна
      if (!elseScene) { endScenes(); return; }
      continue;                       // перескочили за блок
    }

    if (scene.marker === '@else') {
      // Мы дошли до @else значит if-ветка была активна → пропускаем else-часть
      const blk = window.SCENE_BRANCHES[scene.blockId];
      currentSceneIndex = blk.afterIdx;
      if (currentSceneIndex >= SCENES.length) { endScenes(); return; }
      continue;
    }

    if (scene.marker === '@endif') {
      continue; // конец блока — просто идём дальше
    }

    // Ленивые команды (@var внутри веток) выполняются при проходе сцены
    if (scene.steps) {
      scene.steps.forEach((st) => {
        let value = st.value.replace(/^(['"])(.*)\1$/, '$2');
        if (st.op === '+' || st.op === '-') {
          const num = parseFloat(value);
          const prev = parseFloat(window.SCENE_VARS[st.name]) || 0;
          value = isNaN(num) ? prev : (st.op === '+' ? prev + num : prev - num);
        }
        window.SCENE_VARS[st.name] = value;
      });
    }

    showScene(scene);
    return;
  }
  endScenes();
}

// ============ КОНЕЦ СЦЕН ============
function endScenes() {
  clearAutoTimer();
  resetPlaybackState();

  // Если до конца не дошли — показываем только пройденную часть
  const visited = SCENES.slice(0, Math.min(currentSceneIndex + 1, SCENES.length));
  if (typeof setStatsReached === 'function') setStatsReached(visited);

  clearInterval(typingInterval);
  document.getElementById('stageDemo').classList.add('hidden');
  if (typeof openStats === 'function') openStats();
}

// ============ ПЕРСОНАЖ ============
function updateCharacter(src, enter) {
  const charEl = document.getElementById('character');
  const emojiEl = document.getElementById('characterEmoji');

  if (src) {
    charEl.classList.remove('show', 'enter-left', 'enter-right');
    charEl.src = src;
    charEl.style.display = 'block';
    emojiEl.style.display = 'none';
    emojiEl.classList.remove('show');

    setTimeout(() => {
      if (enter === 'left') {
        charEl.classList.add('enter-left');
        setTimeout(() => {
          charEl.classList.remove('enter-left');
          charEl.classList.add('show');
        }, 50);
      } else if (enter === 'right') {
        charEl.classList.add('enter-right');
        setTimeout(() => {
          charEl.classList.remove('enter-right');
          charEl.classList.add('show');
        }, 50);
      } else {
        charEl.classList.add('show');
      }
    }, 50);
  } else {
    charEl.classList.remove('show', 'enter-left', 'enter-right');
    charEl.style.display = 'none';
    emojiEl.style.display = 'none';
    emojiEl.classList.remove('show');
  }
}

// ============ FALLBACK ============
function onCharError() {
  const charEl = document.getElementById('character');
  const emojiEl = document.getElementById('characterEmoji');
  charEl.style.display = 'none';
  emojiEl.textContent = '🎭';
  emojiEl.style.display = 'block';
  setTimeout(() => emojiEl.classList.add('show'), 50);
}

// ============ ЭКСПОРТ ============
window.startScenes = startScenes;
window.advanceScene = advanceScene;
window.onCharError = onCharError;
window.selectChoice = selectChoice;