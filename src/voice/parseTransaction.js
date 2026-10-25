import { matchCategoryByKeywords } from './categoryRules';

// Turns a spoken sentence such as
//   "Spent two hundred and fifty rupees on lunch at Domino's yesterday at 2 pm"
// into { type, amount, description, category, date, hasTime }.
// Pure and synchronous so it can run on every interim transcript.

const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const BIG = {
  thousand: 1e3, thousands: 1e3, k: 1e3, grand: 1e3, hazar: 1e3, hazaar: 1e3, hajar: 1e3,
  lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, million: 1e6, crore: 1e7, crores: 1e7,
};
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
  tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
  seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PERIOD_HOURS = { morning: 9, afternoon: 14, evening: 19, night: 21, tonight: 21 };

const INCOME_CUES = /\b(received|receive|got paid|credited|earned|earning|salary|stipend|income|refund(?:ed)?|cashback|cash back|pocket money|allowance|bonus|dividend|interest|freelance|sold|won|gifted|got (?:a |an )?(?:gift|payment)|payment from|transfer(?:red)? from|from (?:mom|dad|mummy|papa|parents|mother|father))\b/i;
const EXPENSE_CUES = /\b(spent|spend|paid|pay|bought|buy|purchased|purchase|debited|gave|ordered|booked|recharged)\b/i;

// ---------- Normalisation ----------

function normalise(input) {
  return input
    .replace(/₹\s*/g, ' rs ')
    .replace(/(\d),(?=\d)/g, '$1') // 2,500 and 1,00,000
    .replace(/\b([ap])\.\s?m\b\.?/gi, '$1m') // p.m. → pm
    .replace(/\brs\b\.?/gi, 'rs')
    .replace(/(\d)\s*\/-/g, '$1 rs')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ') // drop sentence dots, keep 2.5
    .replace(/[,!?;"“”]/g, ' ')
    .replace(/(\p{L})-(\p{L})/gu, '$1 $2') // twenty-five → twenty five
    .replace(/\s+/g, ' ')
    .trim();
}

// "twenty first" / "the fifth" → "21st" / "the 5th" (only in date-like contexts)
function convertOrdinals(text) {
  const ord = Object.keys(ORDINALS).join('|');
  return text
    .replace(new RegExp(`\\b(twenty|thirty)\\s+(${ord})\\b`, 'gi'), (_, tens, o) =>
      `${TENS[tens.toLowerCase()] + ORDINALS[o.toLowerCase()]}th`)
    .replace(new RegExp(`\\b(on|the)\\s+(${ord})\\b`, 'gi'), (_, pre, o) => `${pre} ${ORDINALS[o.toLowerCase()]}th`)
    .replace(new RegExp(`\\b(${ord})(?=\\s+(?:of\\b|${MONTH_RE}\\b))`, 'gi'), (o) => `${ORDINALS[o.toLowerCase()]}th`);
}

// "two thousand five hundred" → "2500", "2.5 lakh" → "250000", "10k" → "10000"
function wordsToDigits(text) {
  const tokens = text.split(' ');
  const out = [];
  let i = 0;

  const kindOf = (tok, next) => {
    const w = tok.toLowerCase();
    if (/^\d+(\.\d+)?$/.test(w)) return { kind: 'digit', value: parseFloat(w) };
    const k = w.match(/^(\d+(?:\.\d+)?)k$/);
    if (k) return { kind: 'digit', value: parseFloat(k[1]) * 1000, complete: true };
    if (has(ONES, w)) return { kind: w === 'zero' ? 'digit' : ONES[w] >= 10 ? 'teen' : 'ones', value: ONES[w] };
    if (has(TENS, w)) return { kind: 'tens', value: TENS[w] };
    if (w === 'hundred' || w === 'hundreds' || w === 'sau') return { kind: 'hundred' };
    if (has(BIG, w)) return { kind: 'big', value: BIG[w] };
    if ((w === 'a' || w === 'an') && next && /^(hundred|thousand|lakh|lac|crore|grand)$/i.test(next)) return { kind: 'a' };
    if (w === 'and') return { kind: 'and' };
    return null;
  };

  const canFollow = {
    start: ['digit', 'ones', 'teen', 'tens', 'a', 'hundred', 'big'],
    digit: ['big', 'hundred'],
    ones: ['hundred', 'big'],
    teen: ['hundred', 'big'],
    tens: ['ones', 'hundred', 'big'],
    hundred: ['ones', 'teen', 'tens', 'big', 'and', 'digit'],
    big: ['digit', 'ones', 'teen', 'tens', 'and', 'a'],
    and: ['digit', 'ones', 'teen', 'tens'],
    a: ['hundred', 'big'],
  };

  while (i < tokens.length) {
    let prev = 'start';
    let total = 0;
    let current = 0;
    let j = i;
    let lastGood = -1;
    let lastValue = 0;

    while (j < tokens.length) {
      const info = kindOf(tokens[j], tokens[j + 1]);
      if (!info || !canFollow[prev].includes(info.kind)) break;
      // "and" only continues a number when another number word follows it
      if (info.kind === 'and') {
        const nxt = tokens[j + 1] && kindOf(tokens[j + 1], tokens[j + 2]);
        if (!nxt || !canFollow.and.includes(nxt.kind)) break;
      }
      // A lone "k"/"grand"/"thousand" with nothing before it is not a number
      if (prev === 'start' && info.kind === 'big' && !/^(thousand|lakh|lac|crore|hazaa?r|hajar)/i.test(tokens[j])) break;

      if (info.kind === 'digit' || info.kind === 'ones' || info.kind === 'teen' || info.kind === 'tens') current += info.value;
      else if (info.kind === 'hundred') current = (current || 1) * 100;
      else if (info.kind === 'big') { total += (current || 1) * info.value; current = 0; }

      prev = info.kind;
      if (info.kind !== 'and' && info.kind !== 'a') { lastGood = j; lastValue = total + current; }
      j++;
      if (info.complete) break;
    }

    if (lastGood >= i) {
      out.push(String(Math.round(lastValue * 100) / 100));
      i = lastGood + 1;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out.join(' ');
}

// ---------- Span helpers ----------

// Blank out a matched span (keeps indices stable for later regexes)
function mask(text, start, end) {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);
}

function findAndMask(state, regex) {
  const m = regex.exec(state.masked);
  if (!m) return null;
  state.masked = mask(state.masked, m.index, m.index + m[0].length);
  return m;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ---------- Date ----------

function extractDate(state, now) {
  const today = startOfDay(now);
  let m;

  if ((m = findAndMask(state, /\b(?:on\s+)?(?:the\s+)?day before yesterday\b/i))) return { date: addDays(today, -2) };
  if ((m = findAndMask(state, /\blast night\b/i))) return { date: addDays(today, -1), period: 'night' };
  if ((m = findAndMask(state, /\b(\d+|a|an)\s+days?\s+(?:ago|back|before)\b/i))) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : 1;
    return { date: addDays(today, -n) };
  }
  if ((m = findAndMask(state, /\b(\d+|a|an)\s+weeks?\s+(?:ago|back)\b/i))) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : 1;
    return { date: addDays(today, -7 * n) };
  }
  if ((m = findAndMask(state, /\blast week\b/i))) return { date: addDays(today, -7) };
  if ((m = findAndMask(state, /\byesterday(?:'s)?\b/i))) return { date: addDays(today, -1) };

  // "5th October 2026", "on the 5th of oct"
  m = findAndMask(state, new RegExp(`\\b(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b(?:\\s+(\\d{4}))?`, 'i'));
  if (m) return { date: buildDate(now, parseInt(m[1], 10), monthIndex(m[2]), m[3]) };

  // "October 5th", "oct 5 2026"
  m = findAndMask(state, new RegExp(`\\b(?:on\\s+)?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`, 'i'));
  if (m) return { date: buildDate(now, parseInt(m[2], 10), monthIndex(m[1]), m[3]) };

  // "5/10", "05-10-2026" (day first, Indian style)
  m = findAndMask(state, /\b(?:on\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (m) {
    const month = parseInt(m[2], 10) - 1;
    if (month >= 0 && month < 12) {
      const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : undefined;
      return { date: buildDate(now, parseInt(m[1], 10), month, year) };
    }
  }

  // "on the 5th", "on 21st"
  m = findAndMask(state, /\b(?:on\s+(?:the\s+)?|the\s+)(\d{1,2})(?:st|nd|rd|th)\b(?:\s+of\s+this\s+month)?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    let d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d > today) d = new Date(now.getFullYear(), now.getMonth() - 1, day);
    return { date: d };
  }

  // "last monday", "on friday"
  m = findAndMask(state, new RegExp(`\\b(last|this past|past|on|this)?\\s*(${WEEKDAYS.join('|')})\\b`, 'i'));
  if (m) {
    const target = WEEKDAYS.indexOf(m[2].toLowerCase());
    let diff = (today.getDay() - target + 7) % 7;
    if (diff === 0 && m[1] && /last|past/i.test(m[1])) diff = 7;
    return { date: addDays(today, -diff) };
  }

  if ((m = findAndMask(state, /\b(?:for\s+)?today(?:'s)?\b/i))) return { date: today };
  return { date: today, implicit: true };
}

function monthIndex(name) {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase());
}

function buildDate(now, day, month, year) {
  if (year) return new Date(parseInt(year, 10), month, day);
  const d = new Date(now.getFullYear(), month, day);
  // Spoken entries are about the past: "25 December" said in January means last year
  return d > now ? new Date(now.getFullYear() - 1, month, day) : d;
}

// ---------- Time ----------

function extractTime(state) {
  let hour = null;
  let minute = 0;
  let meridiem = null;
  let m;

  // "2 pm", "at 2:30 pm", "around 11 am"
  m = findAndMask(state, /(?:\b(?:at|around|by|@)\s*)?(?<![\d.])(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    hour = parseInt(m[1], 10);
    minute = m[2] ? parseInt(m[2], 10) : 0;
    meridiem = m[3].toLowerCase();
  }
  // "at 14:30", "at 7.15"
  if (hour === null && (m = findAndMask(state, /\b(?:at|around|by)\s+(\d{1,2})[:.](\d{2})\b/i))) {
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);
  }
  // "7 o'clock"
  if (hour === null && (m = findAndMask(state, /\b(?:at\s+|around\s+)?(\d{1,2})\s*o'?\s?clock\b/i))) {
    hour = parseInt(m[1], 10);
  }
  // "at 7" (not "at 7 rs" / "at 7th")
  if (hour === null && (m = findAndMask(state, /\b(?:at|around)\s+(\d{1,2})\b(?!\s*(?:rs|rupees?|bucks|%|st|nd|rd|th|\/|\.\d|\d|days?|weeks?|items?|pieces?|each))/i))) {
    const h = parseInt(m[1], 10);
    if (h <= 23) hour = h;
  }

  let period = null;
  if (findAndMask(state, /\b(?:at\s+|around\s+)?(?:noon|midday)\b/i) && hour === null) { hour = 12; meridiem = 'pm'; }
  if (findAndMask(state, /\b(?:at\s+|around\s+)?midnight\b/i) && hour === null) { hour = 0; meridiem = 'am'; }
  if ((m = findAndMask(state, /\b(?:(?:this|in the|at|early|late|yesterday|today)\s+)?(morning|afternoon|evening|night|tonight)\b/i))) {
    period = m[1].toLowerCase();
  }

  return { hour, minute, meridiem, period };
}

function resolveTime({ hour, minute, meridiem, period }, date, now, contextText) {
  if (hour === null && !period) return null;
  if (hour === null) return { hour: PERIOD_HOURS[period], minute: 0 };

  let h = hour;
  if (meridiem === 'pm' && h < 12) h += 12;
  else if (meridiem === 'am' && h === 12) h = 0;
  else if (!meridiem && h <= 12) {
    if (period === 'morning' || (period === 'night' && h % 12 < 5)) h = h % 12;
    else if (period) h = (h % 12) + 12;
    else if (startOfDay(date).getTime() === startOfDay(now).getTime()) {
      // Today: pick whichever of AM/PM most recently passed
      const pm = (h % 12) + 12;
      const am = h % 12;
      const nowMins = now.getHours() * 60 + now.getMinutes();
      h = pm * 60 + minute <= nowMins ? pm : am;
    } else if (/\b(dinner|night|evening|movie|party)\b/i.test(contextText)) h = (h % 12) + 12;
    else if (/\b(breakfast|morning)\b/i.test(contextText)) h = h % 12;
    else if (h >= 1 && h <= 6) h += 12; // "at 3" usually means 3 pm
  }
  if (h > 23 || minute > 59) return null;
  return { hour: h, minute };
}

// ---------- Amount ----------

function extractAmount(state) {
  const NUM = '(\\d+(?:\\.\\d+)?)';
  // "for 2 people" is a count, not a price
  const NOT_A_COUNT = '(?!\\s*(?:people|persons?|of us|kgs?|items?|pieces?|pcs|plates?|cups?|days?|months?|hours?|nights?|tickets?)\\b)';
  const patterns = [
    new RegExp(`\\b(?:rs|inr|rupees?|rupaye|rupay)\\s*${NUM}`, 'i'),
    new RegExp(`${NUM}\\s*(?:rs|inr|rupees?|rupaye|rupay|bucks)\\b`, 'i'),
    new RegExp(`\\b(?:spent|spend|paid|pay|cost|costs|costing|worth|for|of|received|got|earned|credited|debited|amount)\\s+(?:about\\s+|around\\s+)?${NUM}\\b${NOT_A_COUNT}`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(state.masked);
    if (m) {
      const value = parseFloat(m[1]);
      if (value > 0) {
        const start = m.index + m[0].indexOf(m[1]);
        state.masked = mask(state.masked, start, start + m[1].length);
        return value;
      }
    }
  }
  // Fallback: the largest remaining number ("2 coffees 300" → 300)
  let best = null;
  for (const m of state.masked.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g)) {
    const value = parseFloat(m[1]);
    if (value > 0 && (!best || value > best.value)) best = { value, index: m.index, len: m[1].length };
  }
  if (best) {
    state.masked = mask(state.masked, best.index, best.index + best.len);
    return best.value;
  }
  return null;
}

// ---------- Description ----------

const FILLER = /\b(i|i've|i have|i had|i just|just|today's|spent|spend|spending|paid|pay|paying|bought|buy|purchased|purchase|received|receive|got paid|got|get|earned|earn|credited|debited|add|added|log|logged|record|new|an? expense(?: of)?|expense|expenses|income|rupees?|rupaye|rupay|rs|inr|bucks|amount|worth|total|costing|cost)\b/gi;
const EDGE_WORDS = /^(?:on|for|of|at|towards|in|and|the|a|an|with|by|as|about|around|was|is|it)\b\s*|\s*\b(?:on|for|of|at|to|towards|in|and|the|a|an|with|from|by|as|about|around|was|is|it)$/i;

function cleanDescription(text) {
  let d = text
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    // "dividend of from mutual fund" → "dividend from mutual fund" once the amount is gone
    .replace(/\b(?:of|for|on|worth)\s+(?=(?:from|to|for|on|at|of|in)\b)/gi, '')
    .trim();
  let prev;
  do {
    prev = d;
    d = d.replace(EDGE_WORDS, '').trim();
  } while (d !== prev && d);
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ---------- Main ----------

export function parseTransaction(input, now = new Date()) {
  const transcript = (input || '').trim();
  const text = wordsToDigits(convertOrdinals(normalise(transcript)));
  const state = { masked: text };

  const dateInfo = extractDate(state, now);
  const timeInfo = extractTime(state);
  if (dateInfo.period && !timeInfo.period) timeInfo.period = dateInfo.period;
  const amount = extractAmount(state);

  const description = cleanDescription(state.masked);

  let type = 'expense';
  if (/\bgot paid\b/i.test(text) || (INCOME_CUES.test(text) && !EXPENSE_CUES.test(text))) type = 'income';

  const resolved = resolveTime(timeInfo, dateInfo.date, now, text);
  const date = new Date(dateInfo.date);
  if (resolved) date.setHours(resolved.hour, resolved.minute, 0, 0);
  else date.setHours(now.getHours(), now.getMinutes(), 0, 0);

  const match = matchCategoryByKeywords(description, type) || matchCategoryByKeywords(text, type);

  return {
    transcript,
    type,
    amount,
    description,
    category: match?.category || 'other',
    categorySource: match ? 'keyword' : 'default',
    date: date.toISOString(),
    hasTime: !!resolved,
    dateWasSpoken: !dateInfo.implicit,
  };
}
