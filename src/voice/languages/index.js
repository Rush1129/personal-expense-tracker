// Voice languages: what the speech recogniser is set to, and the word lists the
// parser uses to read a transcript in that language.
//
// Each language file (hi.js, mr.js, …) holds plain word lists. compile() turns
// them into regexes and number tables once, at load time. All text, both the
// word lists and the transcript, goes through canon() first so spelling
// variants (nukta, chandrabindu, zero-width joiners, native digits) match.
import hi from './hi';
import mr from './mr';
import gu from './gu';
import bn from './bn';
import ta from './ta';
import te from './te';
import kn from './kn';
import ml from './ml';
import hinglish from './hinglish';

// level: 'full'  – amounts in digits or words (incl. lakh, hazaar, dedh, dhai, saade),
//                  dates, times, income/expense, several entries, categories
//        'core'  – amounts in digits plus simple number words with hundred/thousand/lakh,
//                  dates, times, income/expense, several entries, common categories
export const VOICE_LANGUAGES = [
  {
    code: 'en-IN', id: 'en', name: 'English', native: 'English', level: 'full',
    examples: [
      'Spent 250 on lunch yesterday at 2 pm',
      'Chai 30 and samosa 20',
      'Uber to office 180',
      'Received salary 50,000 on the 1st',
      'Paid 1,200 for electricity bill',
    ],
    placeholder: 'Chai 30 and samosa 20, or paste an SMS',
  },
  {
    code: 'hi-IN', id: 'hi', name: 'Hindi', native: 'हिन्दी', level: 'full',
    examples: [
      'कल लंच पर 250 रुपये खर्च किए',
      'चाय 30 और समोसा 20',
      'ऑटो का किराया 80',
      'सैलरी 50,000 मिली',
      'बिजली का बिल 1,200 भरा',
    ],
    placeholder: 'चाय 30 और समोसा 20',
  },
  {
    code: 'mr-IN', id: 'mr', name: 'Marathi', native: 'मराठी', level: 'full',
    examples: [
      'काल जेवणासाठी 250 रुपये खर्च केले',
      'चहा 20 आणि वडापाव 15',
      'रिक्षा 60',
      'पगार 40,000 मिळाला',
      'लाईट बिल 900 भरले',
    ],
    placeholder: 'चहा 20 आणि वडापाव 15',
  },
  {
    code: 'gu-IN', id: 'gu', name: 'Gujarati', native: 'ગુજરાતી', level: 'core',
    examples: ['ગઈકાલે જમવાના 250 રૂપિયા ખર્ચ્યા', 'ચા 20 અને નાસ્તો 50', 'રિક્ષા 60', 'પગાર 40,000 મળ્યો'],
    placeholder: 'ચા 20 અને નાસ્તો 50',
  },
  {
    code: 'bn-IN', id: 'bn', name: 'Bengali', native: 'বাংলা', level: 'core',
    examples: ['কাল দুপুরে খাবারে 250 টাকা খরচ করেছি', 'চা 20 আর সিঙ্গারা 30', 'অটো ভাড়া 40', 'মাইনে 30,000 পেয়েছি'],
    placeholder: 'চা 20 আর সিঙ্গারা 30',
  },
  {
    code: 'ta-IN', id: 'ta', name: 'Tamil', native: 'தமிழ்', level: 'core',
    examples: ['நேற்று சாப்பாட்டுக்கு 250 ரூபாய் செலவு', 'டீ 20 மற்றும் வடை 15', 'ஆட்டோ 80', 'சம்பளம் 40,000 வந்தது'],
    placeholder: 'டீ 20 மற்றும் வடை 15',
  },
  {
    code: 'te-IN', id: 'te', name: 'Telugu', native: 'తెలుగు', level: 'core',
    examples: ['నిన్న భోజనానికి 250 రూపాయలు ఖర్చు', 'టీ 20 మరియు సమోసా 30', 'ఆటో 80', 'జీతం 40,000 వచ్చింది'],
    placeholder: 'టీ 20 మరియు సమోసా 30',
  },
  {
    code: 'kn-IN', id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', level: 'core',
    examples: ['ನಿನ್ನೆ ಊಟಕ್ಕೆ 250 ರೂಪಾಯಿ ಖರ್ಚು', 'ಟೀ 20 ಮತ್ತು ದೋಸೆ 60', 'ಆಟೋ 80', 'ಸಂಬಳ 40,000 ಬಂತು'],
    placeholder: 'ಟೀ 20 ಮತ್ತು ದೋಸೆ 60',
  },
  {
    code: 'ml-IN', id: 'ml', name: 'Malayalam', native: 'മലയാളം', level: 'core',
    examples: ['ഇന്നലെ ഭക്ഷണത്തിന് 250 രൂപ ചെലവായി', 'ചായ 15 പിന്നെ ദോശ 40', 'ഓട്ടോ 60', 'ശമ്പളം 40,000 കിട്ടി'],
    placeholder: 'ചായ 15 പിന്നെ ദോശ 40',
  },
];

export const DEFAULT_VOICE_LANG = 'en-IN';

export const LEVEL_NOTES = {
  full: 'Full support: amounts in digits or words, dates, times, income or expense, several entries and categories',
  core: 'Basic support: amounts in digits and simple number words, dates, times, income or expense, several entries and common categories',
};

export function getVoiceLanguage(code) {
  return VOICE_LANGUAGES.find((l) => l.code === code) || VOICE_LANGUAGES[0];
}

// ---------- Canonical text ----------

const CHILLU = { 'ണ': 'ൺ', 'ന': 'ൻ', 'ര': 'ർ', 'ല': 'ൽ', 'ള': 'ൾ', 'ക': 'ൿ' };
const NATIVE_DIGITS = /[\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F]/g;

// One spelling for text that looks the same: NFC, Devanagari nukta and
// chandrabindu folded (हज़ार = हजार, पाँच = पांच), old-style Malayalam chillus,
// zero-width joiners dropped, and every Indian digit set turned into 0-9.
export function canon(text) {
  return (text || '')
    .normalize('NFC')
    .replace(/([ണനരലളക])\u0D4D\u200D/g, (_, c) => CHILLU[c])
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u093C/g, '')
    .replace(/\u0901/g, '\u0902')
    .replace(/\u0931/g, '\u0930')
    .replace(/\u0929/g, '\u0928')
    .replace(/\u0934/g, '\u0933')
    // Every Indic digit block starts at U+xx66 or U+xxE6, so the low nibble gives the digit
    .replace(NATIVE_DIGITS, (d) => String((d.codePointAt(0) & 0xf) - 6));
}

// ---------- Scripts ----------

const SCRIPTS = [
  ['Devanagari', /[\u0900-\u097F]/g],
  ['Bengali', /[\u0980-\u09FF]/g],
  ['Gujarati', /[\u0A80-\u0AFF]/g],
  ['Tamil', /[\u0B80-\u0BFF]/g],
  ['Telugu', /[\u0C00-\u0C7F]/g],
  ['Kannada', /[\u0C80-\u0CFF]/g],
  ['Malayalam', /[\u0D00-\u0D7F]/g],
];
const SCRIPT_DEFAULT = { Devanagari: 'hi', Bengali: 'bn', Gujarati: 'gu', Tamil: 'ta', Telugu: 'te', Kannada: 'kn', Malayalam: 'ml' };
const INDIC = /[\u0900-\u0DFF]/;

export const hasIndicScript = (text) => INDIC.test(text || '');

// ---------- Compiling word lists ----------

// Word edges that also work for Indic scripts, where \b does not
export const B0 = '(?<![\\p{L}\\p{M}\\p{N}])';
export const B1 = '(?![\\p{L}\\p{M}\\p{N}])';
const REST = '[\\p{L}\\p{M}]*';

// In the word lists a space means "one or more spaces" and "~" means
// "any letters may follow" (for words that take endings, like सोमवारी or ரூபாய்க்கு)
const toPattern = (s) => canon(s).replace(/ /g, '\\s+').replace(/~/g, REST);
const alternation = (list) =>
  [...list].sort((a, b) => b.length - a.length).map(toPattern).join('|');

function wordsRe(list, flags = 'iu') {
  if (!list?.length) return null;
  return new RegExp(`${B0}(?:${alternation(list)})${B1}`, flags);
}

const numOrOne = (n) => (/^\d+$/.test(n) ? n : '1');
const pad = (s) => ` ${s} `;
function clockText(h, m) {
  if (m != null) return `at ${parseInt(h, 10)}:${String(m).padStart(2, '0')}`;
  const value = parseFloat(h);
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  return minute ? `at ${hour}:${String(minute).padStart(2, '0')}` : `at ${hour} o'clock`;
}

// Native date/time words → the English words extractDate/extractTime already know.
// Runs after number words became digits, so "तीन दिन पहले" is "3 दिन पहले" here.
function buildDateRules(d = {}) {
  const rules = [];
  // Each alternative pattern has its own capture groups, so pass on only the ones that matched
  const add = (list, replace) =>
    list?.length &&
    rules.push([
      wordsRe(list, 'giu'),
      typeof replace === 'string'
        ? replace
        : (match, ...rest) => replace(match, ...rest.slice(0, -2).filter((g) => g !== undefined)),
    ]);
  add(d.dayBefore, pad('day before yesterday'));
  add(d.lastNight, pad('last night'));
  add(d.daysAgo, (_, n) => pad(`${numOrOne(n)} days ago`));
  add(d.weeksAgo, (_, n) => pad(`${numOrOne(n)} weeks ago`));
  add(d.lastWeek, pad('last week'));
  add(d.yesterday, pad('yesterday'));
  add(d.today, pad('today'));
  for (const [day, words] of Object.entries(d.weekdays || {})) {
    if (d.last?.length) add(words.map((w) => `(?:${d.last.join('|')}) (?:${w})`), pad(`last ${day}`));
    add(words, pad(day));
  }
  // Month names only next to a day number, so a stray word isn't read as a month
  for (const [month, words] of Object.entries(d.months || {})) {
    const names = words.join('|');
    add([`(\\d{1,2}) (?:${names})`], (_, day) => pad(`${day} ${month}`));
    add([`(?:${names}) (\\d{1,2})`], (_, day) => pad(`${day} ${month}`));
  }
  add(d.monthDay, (_, day) => pad(`on the ${day}th`));
  add(d.clockMinutes, (_, h, m) => pad(clockText(h, m)));
  add(d.clock, (_, h) => pad(clockText(h)));
  for (const [period, words] of Object.entries(d.periods || {})) add(words, pad(period));
  return rules;
}

// Number words → { kind, value } entries the number reader in parseTransaction understands.
// Keys ending in "~" match as a word start (ஆயிரம், ஆயிரத்து, ஆயிரத்துக்கு …).
function buildNumbers(raw) {
  const exact = new Map();
  const prefixes = [];
  const restricted = new Set((raw.restricted || []).map(canon));
  const put = (table, kind, valueOf = (v) => v) => {
    for (const [word, v] of Object.entries(table || {})) {
      const w = canon(word).toLowerCase();
      const info = { kind, value: valueOf(v), native: true };
      if (w.endsWith('~')) prefixes.push([w.slice(0, -1), info]);
      else exact.set(w, { ...info, restricted: restricted.has(w) || undefined });
    }
  };
  put(raw.numbers, 'teen');
  put(raw.ones, 'ones');
  put(raw.tens, 'tens');
  put(Object.fromEntries((raw.hundred || []).map((w) => [w, 100])), 'hundred');
  put(raw.hundreds, 'hblock');
  put(raw.big, 'big');
  put(raw.thousands, 'bblock');
  put(raw.fractions, 'teen');
  put(raw.modifiers, 'mod');
  for (const w of Object.keys(raw.fractions || {})) {
    const info = exact.get(canon(w).toLowerCase());
    if (info) info.restricted = true; // "डेढ़" alone is not an amount; "डेढ़ सौ" is
  }
  prefixes.sort((a, b) => b[0].length - a[0].length);
  const modWords = Object.keys(raw.modifiers || {}).map((w) => canon(w).toLowerCase());

  const lookup = (w) => {
    if (exact.has(w)) return exact.get(w);
    for (const [stem, info] of prefixes) if (w.startsWith(stem)) return info;
    return null;
  };
  return {
    lookup,
    // Marathi/Gujarati often write "साडेतीनशे" as one word: split off the "साडे"
    splitFused(token) {
      const w = token.toLowerCase();
      for (const mod of modWords) {
        if (w.length > mod.length && w.startsWith(mod) && lookup(w.slice(mod.length))) {
          return [token.slice(0, mod.length), token.slice(mod.length)];
        }
      }
      return null;
    },
  };
}

function compile(raw) {
  const replaceAll = (list) => wordsRe(list, 'giu');
  return {
    id: raw.id,
    script: raw.script,
    prefix: !!raw.prefix,
    numbers: buildNumbers(raw),
    currency: replaceAll(raw.currency),
    dateRules: buildDateRules(raw.dates),
    and: (raw.and || []).map(toPattern),
    income: wordsRe(raw.income),
    expense: wordsRe(raw.expense),
    incomeStrong: wordsRe(raw.incomeStrong),
    filler: replaceAll(raw.filler),
    edgeStart: raw.edge?.length ? new RegExp(`^(?:${alternation(raw.edge)})${B1}\\s*`, 'iu') : null,
    edgeEnd: raw.edge?.length ? new RegExp(`\\s*${B0}(?:${alternation(raw.edge)})$`, 'iu') : null,
    markers: raw.markers ? new RegExp(`${B0}(?:${alternation(raw.markers)})${B1}`, 'iu') : null,
    categories: raw.categories || {},
  };
}

export const LEXICONS = Object.fromEntries([hi, mr, gu, bn, ta, te, kn, ml].map((raw) => [raw.id, compile(raw)]));
export const HINGLISH = compile(hinglish);

const idOf = (lang) => (lang || '').split('-')[0].toLowerCase();

// The native word list to read this text with: the chosen language when the text
// is in its script, otherwise whichever Indian script the text is written in.
export function pickNativeLexicon(text, lang) {
  const chosen = LEXICONS[idOf(lang)];
  const counts = SCRIPTS.map(([name, re]) => [name, (text.match(re) || []).length]).filter(([, n]) => n > 0);
  if (!counts.length) return null;
  if (chosen && counts.some(([name]) => name === chosen.script)) return chosen;
  counts.sort((a, b) => b[1] - a[1]);
  return LEXICONS[SCRIPT_DEFAULT[counts[0][0]]] || null;
}

// Latin-script Hindi ("kal chai pe 30 diye") is read with the Hinglish list
export const looksHinglish = (text) => HINGLISH.markers.test(text);

// Every list that applies to this transcript, Hinglish first
export function resolveLexicons(text, lang) {
  const t = canon(text);
  const list = [];
  if (looksHinglish(t)) list.push(HINGLISH);
  const native = pickNativeLexicon(t, lang);
  if (native) list.push(native);
  return list;
}

export { compile, toPattern };
