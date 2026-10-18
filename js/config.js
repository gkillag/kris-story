// ============ ДАННЫЕ ИЗ TELEGRAM ============
// Получено парсером parse_tg.py из result.json
// Все цифры — реальные из вашей переписки

const TG_STATS = {
  // Основные числа
  totalMessages: 66489,
  myMessages: 32586,
  herMessages: 33903,
  myName: 'Даня',
  herName: 'Крисс',
  avgPerDay: 112,

  // Период
  daysSpan: 592,
  firstMessageDate: '25.02.2025',
  lastMessageDate: '10.10.2026',

  // Активный день
  bestDay: '27 марта 2026',
  bestDayCount: 2019,

  // Длина сообщений
  avgLengthMe: 19.4,
  avgLengthHer: 22.3,

  // Маты
  totalMats: 4201,

  // Топ-слова (общий)
  topWords: [
    { word: 'хочу', count: 400 },
    { word: 'ибо', count: 333 },
    { word: 'знаю', count: 289 },
    { word: 'делать', count: 281 },
    { word: 'такое', count: 280 },
    { word: 'почему', count: 251 },
    { word: 'типо', count: 245 },
    { word: 'сколько', count: 236 },
    { word: 'лол', count: 232 },
    { word: 'даня', count: 209 },
    { word: 'очень', count: 182 },
    { word: 'чета', count: 181 },
    { word: 'помню', count: 175 },
    { word: 'день', count: 175 },
    { word: 'чет', count: 173 },
    { word: 'время', count: 171 },
    { word: 'сразу', count: 169 },
  ],

  // Топ слов от Дани
  topMyWords: [
    { word: 'чета', count: 177 },
    { word: 'ибо', count: 167 },
    { word: 'чет', count: 150 },
    { word: 'либо', count: 147 },
    { word: 'хочу', count: 141 },
    { word: 'типо', count: 129 },
    { word: 'делать', count: 125 },
    { word: 'плане', count: 124 },
    { word: 'такое', count: 113 },
    { word: 'тип', count: 110 },
    { word: 'лол', count: 90 },
    { word: 'прям', count: 89 },
    { word: 'мега', count: 88 },
  ],

  // Топ слов от Крисс
  topHerWords: [
    { word: 'хочу', count: 259 },
    { word: 'сколько', count: 215 },
    { word: 'знаю', count: 212 },
    { word: 'даня', count: 200 },
    { word: 'почему', count: 186 },
    { word: 'такое', count: 167 },
    { word: 'ибо', count: 166 },
    { word: 'делать', count: 156 },
    { word: 'кажется', count: 153 },
    { word: 'лол', count: 142 },
    { word: 'наверное', count: 137 },
    { word: 'хаха', count: 131 },
    { word: 'сама', count: 130 },
    { word: 'очень', count: 124 },
  ],

  // Топ эмодзи
  topEmoji: [
    { emoji: '💔', count: 28 },
    { emoji: '❤', count: 27 },
    { emoji: '🤩', count: 14 },
    { emoji: '💔💔💔', count: 12 },
    { emoji: '👉', count: 9 },
    { emoji: '🔍', count: 8 },
    { emoji: '👹', count: 8 },
    { emoji: '🙂', count: 6 },
    { emoji: '🌚', count: 6 },
    { emoji: '🖤', count: 5 },
  ],

  // Активность по часам (0–23) — сколько сообщений
  myHours:  [869, 670, 510, 402, 615, 201, 255, 470, 533, 956, 995, 1470, 1644, 1237, 1662, 2313, 2479, 2512, 2366, 2250, 2766, 2099, 1721, 1591],
  herHours: [1073, 687, 607, 444, 642, 334, 299, 543, 610, 1133, 1048, 1692, 1887, 1242, 1686, 2401, 2627, 2518, 2342, 2118, 2754, 2028, 1658, 1530],

  // Топ-5 активных дней
  topDays: [
    { date: '27.03.2026', count: 2019 },
    { date: '01.04.2026', count: 1879 },
    { date: '28.03.2026', count: 1536 },
    { date: '26.09.2026', count: 1283 },
    { date: '01.08.2026', count: 1279 },
  ],
};

// ============ ВЕРСИЯ ИГРЫ ============
// Меняй с каждой правкой (1.0 -> 1.1 -> 1.2 ...) — отобразится в меню
const GAME_VERSION = '1.2';

// ============ ОБЩИЕ НАСТРОЙКИ ============
const CONFIG = {
  // Имя в новелле
  herName: 'Крисс',

  // Дата начала отношений (год, месяц-1, день)
  // Внимание: месяц в JS считается с 0! Апрель = 3
  startDate: new Date(2026, 3, 11),
};

// ============ ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ ============
// Так как мы не используем ES-модули — делаем переменные глобальными,
// чтобы другие скрипты видели их через window.
window.TG_STATS = TG_STATS;
window.GAME_VERSION = GAME_VERSION;
window.CONFIG = CONFIG;
window.NAME = CONFIG.herName;
window.START_DATE = CONFIG.startDate;