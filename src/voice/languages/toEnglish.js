// Turns a description said in an Indian language into English, offline and instantly:
//   "दोस्तों के साथ डिनर" → "Dinner with friends"
//   "मम्मी से किताबों"     → "Books from mom"
//   "नरेश भैया"           → "Naresh bhaiya"   (unknown words are written in English letters)
//
// It's a word list, not a translation model: common expense words, people and places
// are translated, and phrases like "X के साथ Y" are put in English order ("Y with X").
// Anything else is transliterated, so saved entries are always in English letters.
import { HINGLISH, LEXICONS, canon, hasIndicScript, pickNativeLexicon } from './index';
import { transliterate } from './transliterate';

// Words that don't take an "s" in English when the source word is plural
const UNCOUNTABLE = new Set([
  'tea', 'coffee', 'milk', 'curd', 'rice', 'dal', 'flour', 'oil', 'sugar', 'salt', 'food', 'water', 'petrol',
  'diesel', 'electricity', 'gas', 'rent', 'salary', 'interest', 'fees', 'groceries', 'vegetables', 'fruit',
  'clothes', 'shoes', 'sweets', 'snacks', 'money', 'parking', 'travel', 'shopping', 'jewellery', 'furniture',
  'makeup', 'insurance', 'tuition', 'coaching', 'maintenance', 'internet', 'juice', 'bread', 'paneer', 'fish',
  'meat', 'spices', 'medicine', 'medicines', 'stuff', 'ration', 'breakfast', 'lunch', 'dinner', 'fare',
  'luggage', 'bonus', 'profit', 'cashback', 'laundry', 'household items',
]);

function pluralize(en) {
  const words = en.split(' ');
  let w = words.pop();
  if (UNCOUNTABLE.has(en) || UNCOUNTABLE.has(w) || /s$/.test(w) || /^[A-Z]/.test(w)) return en;
  if (/(?:ch|sh|x)$/.test(w)) w += 'es';
  else if (/[^aeiou]y$/.test(w)) w = `${w.slice(0, -1)}ies`;
  else w += 's';
  return [...words, w].join(' ');
}

// One word (no spaces): exact, with a plural/case ending, with a joined postposition,
// or (for languages that join endings) as the start of a longer word.
function lookupWord(lex, word, allowSuffix = true) {
  const { exact, stems } = lex.glossary;
  if (exact.has(word)) return { en: exact.get(word) };
  const marks = word.match(/^(.+?)(\p{M}+)$/u);
  if (marks && exact.has(marks[1])) {
    return { en: exact.get(marks[1]), plural: lex.pluralMarks.includes(marks[2]) };
  }
  if (allowSuffix) {
    for (const [suffix, info] of lex.suffixes) {
      if (word.length > suffix.length && word.endsWith(suffix)) {
        const found = lookupWord(lex, word.slice(0, -suffix.length), false);
        if (found) return { ...found, post: info.post, plural: found.plural || info.plural };
      }
    }
  }
  if (lex.prefix) {
    for (let n = word.length; n >= 3; n--) {
      const en = stems.get(word.slice(0, n));
      if (en) return { en };
    }
  }
  return null;
}

// Longest glossary phrase starting at tokens[i] (multi-word entries like "बिजली का बिल")
function lookupPhrase(lex, tokens, i) {
  for (let len = Math.min(4, tokens.length - i); len >= 2; len--) {
    const phrase = tokens.slice(i, i + len).join(' ');
    if (lex.glossary.exact.has(phrase)) return { en: lex.glossary.exact.get(phrase), len };
  }
  const one = lookupWord(lex, tokens[i]);
  return one && { ...one, len: 1 };
}

function lookupPost(lex, tokens, i) {
  for (const { words, post } of lex.posts) {
    if (words.every((w, k) => tokens[i + k] === w)) return { post, len: words.length };
  }
  return null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// lang: the parse result's language id ('hi', 'ta', …, or 'en')
// hinglish: true when the sentence was Hindi in English letters ("doston ke saath dinner")
export function toEnglish(text, { lang, hinglish = false } = {}) {
  const original = (text || '').trim();
  if (!original) return original;
  const t = canon(original);
  const native = hasIndicScript(t) ? LEXICONS[lang] || pickNativeLexicon(t, lang) : null;
  if (!native && !hinglish) return original;
  const lexs = [native, hinglish ? HINGLISH : null].filter(Boolean);

  const shown = t.split(/\s+/); // original spelling, for words we keep as they are
  const tokens = shown.map((w) => w.toLowerCase());
  // Postpositions split the phrase: "दोस्तों के साथ डिनर" = [friends] with [dinner]
  const segments = [[]];
  const posts = [];
  const current = () => segments[segments.length - 1];
  const addPost = (post) => {
    if (post === 'of') return; // "बिजली का बिल" → "electricity bill"
    posts.push(post);
    segments.push([]);
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    let step = null;
    for (const lex of lexs) {
      const post = lookupPost(lex, tokens, i);
      if (post) {
        addPost(post.post);
        step = post.len;
        break;
      }
      if (lex.andWords.includes(token)) {
        current().push('and');
        step = 1;
        break;
      }
      const found = lookupPhrase(lex, tokens, i);
      if (found) {
        current().push(found.plural ? pluralize(found.en) : found.en);
        if (found.post) addPost(found.post);
        step = found.len;
        break;
      }
      // Native number words ("दो चाय" → "2 tea"); Latin ones like "do"/"tin" are also English words
      const number = lex !== HINGLISH && lex.numbers.lookup(token);
      if (number && ['ones', 'teen', 'tens'].includes(number.kind)) {
        current().push(String(number.value));
        step = 1;
        break;
      }
    }
    if (!step) {
      current().push(hasIndicScript(token) ? transliterate(token) : shown[i]);
      step = 1;
    }
    i += step;
  }

  // English puts the main noun first: [friends] with [dinner] → "dinner with friends"
  const head = segments[segments.length - 1];
  let words;
  if (posts.length && head.length) {
    words = [...head];
    for (let k = posts.length - 1; k >= 0; k--) {
      if (segments[k].length) words.push(posts[k], ...segments[k]);
    }
  } else {
    words = segments.flat();
  }
  const english = words.join(' ').replace(/\s+/g, ' ').trim();
  return english ? capitalize(english) : original;
}
