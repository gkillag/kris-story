// ============ ЗВУК И МУЗЫКА ============
// Всё через Web Audio API — без mp3-файлов.
// Позже можно заменить на свои треки: см. комментарии внизу.

let audioCtx = null;
let musicPlaying = false;
let musicNodes = [];

// Настройки звука (загружаются из localStorage)
const audioSettings = {
  master: 0.7,
  typing: 0.4,
  music: 0.5,
  muted: false,
};

// ============ ЗАГРУЗКА / СОХРАНЕНИЕ НАСТРОЕК ============
function loadSettings() {
  try {
    const saved = localStorage.getItem('krisStorySettings');
    if (saved) Object.assign(audioSettings, JSON.parse(saved));
  } catch (e) {}

  const mv = document.getElementById('masterVolume');
  const tv = document.getElementById('typingVolume');
  const musicv = document.getElementById('musicVolume');
  if (!mv || !tv || !musicv) return;

  mv.value = Math.round(audioSettings.master * 100);
  tv.value = Math.round(audioSettings.typing * 100);
  musicv.value = Math.round(audioSettings.music * 100);

  document.getElementById('masterVal').textContent = mv.value + '%';
  document.getElementById('typingVal').textContent = tv.value + '%';
  document.getElementById('musicVal').textContent = musicv.value + '%';

  if (audioSettings.muted) {
    document.getElementById('muteToggle').classList.add('on');
  } else {
    document.getElementById('muteToggle').classList.remove('on');
  }
}

function saveSettings() {
  try {
    localStorage.setItem('krisStorySettings', JSON.stringify(audioSettings));
  } catch (e) {}
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const mv = document.getElementById('masterVolume');
  const tv = document.getElementById('typingVolume');
  const musicv = document.getElementById('musicVolume');

  if (mv) {
    mv.addEventListener('input', (e) => {
      audioSettings.master = e.target.value / 100;
      document.getElementById('masterVal').textContent = e.target.value + '%';
      updateMusicVolume();
      saveSettings();
    });
  }

  if (tv) {
    tv.addEventListener('input', (e) => {
      audioSettings.typing = e.target.value / 100;
      document.getElementById('typingVal').textContent = e.target.value + '%';
      saveSettings();
    });
  }

  if (musicv) {
    musicv.addEventListener('input', (e) => {
      audioSettings.music = e.target.value / 100;
      document.getElementById('musicVal').textContent = e.target.value + '%';
      updateMusicVolume();
      saveSettings();
    });
  }
});

// ============ ГРОМКОСТЬ ============
function toggleMute() {
  audioSettings.muted = !audioSettings.muted;
  const toggle = document.getElementById('muteToggle');
  if (audioSettings.muted) toggle.classList.add('on');
  else toggle.classList.remove('on');
  updateMusicVolume();
  saveSettings();
}

function getEffectiveVolume(type) {
  if (audioSettings.muted) return 0;
  return audioSettings.master * audioSettings[type];
}

function updateMusicVolume() {
  if (musicPlaying && audioCtx) {
    musicNodes.forEach((n) => { try { n.stop(); } catch (e) {} });
    musicNodes = [];
    playMelody();
  }
}

// ============ ЗВУК ПЕЧАТИ ============
// Мягкий высокий «тик» — не машинка
function playTypingSound() {
  if (!audioCtx || audioSettings.muted) return;
  const vol = getEffectiveVolume('typing');
  if (vol <= 0) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 1600 + Math.random() * 200;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol * 0.15, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.03);
}

// ============ КНОПКА МУЗЫКИ ============
function toggleMusic() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const btn = document.getElementById('musicBtn');

  if (musicPlaying) {
    musicNodes.forEach((n) => { try { n.stop(); } catch (e) {} });
    musicNodes = [];
    musicPlaying = false;
    btn.textContent = '🔇';
  } else {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playMelody();
    musicPlaying = true;
    btn.textContent = '🎵';
  }
}

// ============ МУЗЫКАЛЬНАЯ ШКАТУЛКА ============
// Позже можно заменить на свой трек:
// 1. Положить mp3 в assets/music/song.mp3
// 2. Заменить playMelody на:
//    const audio = new Audio('assets/music/song.mp3');
//    audio.volume = getEffectiveVolume('music');
//    audio.loop = true;
//    audio.play();
// ============
function playMelody() {
  if (!audioCtx) return;
  const vol = getEffectiveVolume('music');

  // Пентатоника — нежная «шкатулка»
  const notes = [
    [220.00, 0.0, 1.2],  // A3
    [261.63, 1.2, 1.2],  // C4
    [329.63, 2.4, 1.2],  // E4
    [261.63, 3.6, 1.2],  // C4
    [220.00, 4.8, 1.2],  // A3
    [196.00, 6.0, 1.2],  // G3
    [174.61, 7.2, 1.6],  // F3
    [220.00, 8.8, 1.2],  // A3
    [261.63, 10.0, 1.2], // C4
    [293.66, 11.2, 1.4], // D4
  ];

  const startTime = audioCtx.currentTime + 0.1;
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = vol * 0.25;
  masterGain.connect(audioCtx.destination);
  musicNodes.push(masterGain);

  notes.forEach(([freq, offset, dur]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const t = startTime + offset;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.1);
    musicNodes.push(osc);
  });

  // Повторяем мелодию каждые 13 секунд
  setTimeout(() => { if (musicPlaying) playMelody(); }, 13000);
}

// ============ ЗВУК ЗАМКА (для будущего) ============
function playLockSound() {
  if (!audioCtx || audioSettings.muted) return;
  const vol = getEffectiveVolume('master');
  if (vol <= 0) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol * 0.15, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

// ============ ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ ============
window.audioCtx = audioCtx;
window.audioSettings = audioSettings;
window.getEffectiveVolume = getEffectiveVolume;
window.playTypingSound = playTypingSound;
window.toggleMusic = toggleMusic;
window.toggleMute = toggleMute;
window.playLockSound = playLockSound;