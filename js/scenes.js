// ============ ДВИЖОК СЦЕН (работает через парсер) ============

let SCENES = [];
let currentSceneIndex = 0;
let typingInterval = null;
let isTyping = false;
let currentFullText = '';
let typeSpeed = 40;

// Ожидание выбора игрока
let awaitingChoice = false;
let currentChoiceScene = null;

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
      <div id="choicesOverlay" class="choices-overlay" style="display: none;"></div>
    </div>
  `;

  currentSceneIndex = 0;
  showScene(SCENES[0]);
}

// ============ ПОКАЗ СЦЕНЫ ============
function showScene(scene) {
  if (!scene) return;

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
  document.getElementById('speakerName').textContent = scene.speaker || '';

  // Текст — с эффектом печати
  const textEl = document.getElementById('dialogueText');
  textEl.innerHTML = '';
  document.getElementById('continueHint').classList.remove('show');

  // Если есть выбор — покажем после печати текста
  currentChoiceScene = scene.choices ? scene : null;
  awaitingChoice = false;

  if (scene.text) {
    currentFullText = scene.text;
    isTyping = true;
    let charIndex = 0;

    const textSpan = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    textEl.appendChild(textSpan);
    textEl.appendChild(cursor);

    clearInterval(typingInterval);
    typingInterval = setInterval(() => {
      if (charIndex < currentFullText.length) {
        const ch = currentFullText[charIndex];
        if (ch === '\n') {
          textSpan.appendChild(document.createElement('br'));
        } else {
          textSpan.appendChild(document.createTextNode(ch));
        }
        charIndex++;
        if (typeof playTypingSound === 'function') playTypingSound();
      } else {
        clearInterval(typingInterval);
        cursor.remove();
        isTyping = false;
        onTypingComplete(scene);
      }
    }, typeSpeed);
  } else {
    // Сцена без текста (например, только выбор)
    onTypingComplete(scene);
  }
}

// Вызывается, когда текст напечатан (или его нет)
function onTypingComplete(scene) {
  // Если есть выбор — показываем кнопки
  if (scene.choices && scene.choices.length > 0) {
    showChoices(scene.choices);
    return;
  }

  // Если это ветка 'if' — проверяем совпадение с выбором игрока
  if (scene.branch === 'if' && scene.branchChoice) {
    // Если выбор игрока НЕ совпадает — пропускаем эту ветку
    if (window.playerChoice !== scene.branchChoice) {
      skipToEndif();
      return;
    }
  }

  // Если это ветка 'else' — пропускаем, если выбор игрока совпал с 'if'
  if (scene.branch === 'else') {
    if (window.playerChoice === window.lastIfChoice) {
      skipToEndif();
      return;
    }
  }

  // Иначе — показываем подсказку «▼»
  document.getElementById('continueHint').classList.add('show');

  // Пауза, если указана
  if (scene.wait) {
    setTimeout(() => {
      // ничего не делаем — игрок сам тапнет
    }, scene.wait);
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
    btn.textContent = choice.text;
    btn.onclick = () => selectChoice(choice.text);
    overlay.appendChild(btn);
  });
}

function selectChoice(text) {
  window.playerChoice = text;
  window.lastIfChoice = text;
  awaitingChoice = false;

  const overlay = document.getElementById('choicesOverlay');
  overlay.style.display = 'none';
  overlay.innerHTML = '';

  // Идём к следующей сцене
  currentSceneIndex++;
  if (currentSceneIndex < SCENES.length) {
    showScene(SCENES[currentSceneIndex]);
  } else {
    endScenes();
  }
}

// ============ ПРОПУСК ВЕТКИ ============
function skipToEndif() {
  // Ищем ближайший @else или @endif
  let i = currentSceneIndex + 1;
  while (i < SCENES.length) {
    const next = SCENES[i];
    if (next.branch === 'else') {
      // Нашли @else — переходим к нему
      currentSceneIndex = i;
      showScene(SCENES[i]);
      return;
    }
    // Если следующий блок имеет branchId больше — мы вышли за пределы
    i++;
  }
  // Если не нашли — заканчиваем
  endScenes();
}

// ============ ТАП ПО ЭКРАНУ ============
function advanceScene() {
  // Если ждём выбора — игнорируем тап
  if (awaitingChoice) return;

  // Если печатается — показать сразу
  if (isTyping) {
    clearInterval(typingInterval);
    const textEl = document.getElementById('dialogueText');
    textEl.innerHTML = '';
    currentFullText.split('\n').forEach((line, i) => {
      if (i > 0) textEl.appendChild(document.createElement('br'));
      textEl.appendChild(document.createTextNode(line));
    });
    isTyping = false;
    onTypingComplete(SCENES[currentSceneIndex]);
    return;
  }

  // Следующая сцена
  currentSceneIndex++;
  if (currentSceneIndex < SCENES.length) {
    showScene(SCENES[currentSceneIndex]);
  } else {
    endScenes();
  }
}

// ============ КОНЕЦ СЦЕН ============
function endScenes() {
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