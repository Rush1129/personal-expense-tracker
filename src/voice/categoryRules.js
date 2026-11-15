import { categoriesForType } from './categoryPrototypes';
import { B0, B1, HINGLISH, LEXICONS, canon, pickNativeLexicon } from './languages';

// Re-exported so existing imports from this file keep working
export { CATEGORY_PROTOTYPES, categoriesForType } from './categoryPrototypes';

// Keyword rules: instant, offline, and tuned for everyday Indian spending.
// The longest matching keyword wins, so "phone recharge" → bills, not shopping.
// Indian-language keywords (native script) live in ./languages/<lang>.js.
export const CATEGORY_KEYWORDS = {
  // Expenses
  food: [
    'food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'snacks', 'coffee', 'tea', 'chai',
    'restaurant', 'cafe', 'canteen', 'mess', 'tiffin', 'meal', 'meals', 'swiggy', 'zomato', 'eatsure',
    'pizza', 'burger', 'biryani', 'dosa', 'idli', 'samosa', 'vada pav', 'pani puri', 'momos', 'noodles',
    'sandwich', 'thali', 'paratha', 'rolls', 'shawarma', 'dominos', "domino's", 'mcdonalds', "mcdonald's",
    'kfc', 'subway', 'starbucks', 'chaayos', 'haldiram', 'juice', 'ice cream', 'dessert', 'sweets',
    'mithai', 'bakery', 'cake', 'pastry', 'chocolate', 'drinks', 'beer', 'bar', 'pub', 'dhaba', 'eat',
    'ate', 'eating', 'dining', 'takeaway', 'parcel',
  ],
  transport: [
    'uber', 'ola', 'rapido', 'auto', 'rickshaw', 'autorickshaw', 'cab', 'taxi', 'bus', 'train', 'metro',
    'local train', 'petrol', 'diesel', 'fuel', 'cng', 'parking', 'toll', 'fastag', 'flight', 'airfare',
    'irctc', 'railway', 'bike service', 'car service', 'car wash', 'puncture', 'tyre', 'ride', 'commute',
    'travel', 'redbus', 'blablacar', 'yulu', 'bounce',
  ],
  groceries: [
    'grocery', 'groceries', 'vegetable', 'vegetables', 'veggies', 'sabzi', 'sabji', 'fruit', 'fruits',
    'milk', 'curd', 'paneer', 'bread', 'eggs', 'rice', 'dal', 'atta', 'flour', 'oil', 'sugar', 'kirana',
    'supermarket', 'dmart', 'd mart', 'bigbasket', 'big basket', 'blinkit', 'zepto', 'instamart',
    'jiomart', 'more supermarket', 'reliance fresh', 'ration', 'provisions', 'household items',
    'detergent', 'toiletries', 'staples',
  ],
  bills: [
    'rent', 'house rent', 'electricity', 'electricity bill', 'light bill', 'power bill', 'water bill',
    'gas', 'gas cylinder', 'cylinder', 'lpg', 'wifi', 'wi-fi', 'internet', 'broadband', 'recharge',
    'mobile recharge', 'phone bill', 'postpaid', 'prepaid', 'dth', 'tata play', 'emi', 'loan', 'insurance',
    'premium', 'maintenance', 'society', 'bill', 'bills', 'fees', 'fee', 'tuition', 'school fees',
    'college fees', 'jio', 'airtel', 'vodafone', 'vi recharge', 'bsnl', 'credit card bill', 'tax',
  ],
  shopping: [
    'shopping', 'clothes', 'clothing', 'shirt', 't-shirt', 'tshirt', 'jeans', 'trousers', 'kurta', 'saree',
    'dress', 'shoes', 'sneakers', 'slippers', 'chappal', 'bag', 'watch', 'amazon', 'flipkart', 'myntra',
    'ajio', 'meesho', 'nykaa', 'electronics', 'phone', 'mobile', 'laptop', 'headphones', 'earphones',
    'earbuds', 'charger', 'gadget', 'furniture', 'decor', 'cosmetics', 'makeup', 'perfume', 'jewellery',
    'jewelry', 'accessories', 'gift', 'present', 'stationery', 'books', 'book',
  ],
  entertainment: [
    'movie', 'movies', 'film', 'cinema', 'pvr', 'inox', 'bookmyshow', 'netflix', 'prime video',
    'amazon prime', 'hotstar', 'jiocinema', 'jiohotstar', 'spotify', 'youtube premium', 'subscription',
    'game', 'games', 'gaming', 'playstation', 'concert', 'show', 'party', 'outing', 'trip', 'vacation',
    'holiday', 'picnic', 'bowling', 'club', 'amusement park', 'water park', 'match tickets', 'event',
  ],

  // Income
  salary: ['salary', 'paycheck', 'pay check', 'payday', 'wages', 'stipend', 'bonus', 'appraisal', 'payroll'],
  pocketmoney: [
    'pocket money', 'allowance', 'kharcha', 'from mom', 'from dad', 'from mummy', 'from papa',
    'from parents', 'from mother', 'from father',
  ],
  investment: [
    'investment', 'dividend', 'interest', 'mutual fund', 'sip', 'stocks', 'stock', 'shares', 'returns',
    'profit', 'fd', 'fixed deposit', 'trading', 'crypto', 'zerodha', 'groww', 'capital gains',
  ],
  freelance: [
    'freelance', 'freelancing', 'client', 'project', 'gig', 'consulting', 'upwork', 'fiverr', 'invoice',
    'side hustle', 'commission', 'contract work',
  ],
  gift: ['gift', 'birthday money', 'shagun', 'gifted', 'present', 'reward', 'prize', 'won'],
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rulesFrom = (table, toRule) =>
  Object.entries(table).flatMap(([category, words]) => words.map((word) => toRule(category, word)));

// Precompile one regex per keyword; "s?" lets "snack" also match "snacks".
// Latin-script Hindi words ("bijli", "dawai") sit alongside the English ones.
const latinRule = (category, word) => ({
  category,
  word,
  regex: new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(word)}s?(?=$|[^\\p{L}\\p{N}])`, 'iu'),
});
const RULES = [...rulesFrom(CATEGORY_KEYWORDS, latinRule), ...rulesFrom(HINGLISH.categories, latinRule)];

// Native-script keywords. Vowel signs after the word are allowed (किताब → किताबें).
// In languages that join endings to words (Marathi, Tamil, …) a keyword of three or
// more letters also matches as a word start: पेट्रोल → पेट्रोलसाठी, சாப்பாடு → சாப்பாட்டுக்கு.
function nativeRule(category, rawWord, prefix) {
  const word = canon(rawWord).toLowerCase();
  const forced = word.endsWith('~');
  let stem = forced ? word.slice(0, -1) : word;
  if (prefix && !forced) {
    const cut = stem.replace(/\p{M}$/u, ''); // the last vowel sign/virama often changes when inflected
    if ([...cut].length >= 3) stem = cut;
  }
  const open = forced || (prefix && [...stem].length >= 3);
  const body = escapeRegex(stem).replace(/ /g, '\\s+');
  return {
    category,
    word: stem,
    regex: new RegExp(`${B0}${body}${open ? '[\\p{L}\\p{M}]*' : '\\p{M}*'}${B1}`, 'iu'),
  };
}
const nativeRules = {};
function rulesFor(lexicon) {
  if (!lexicon) return RULES;
  nativeRules[lexicon.id] ??= [
    ...RULES,
    ...rulesFrom(lexicon.categories, (category, word) => nativeRule(category, word, lexicon.prefix)),
  ];
  return nativeRules[lexicon.id];
}

// Returns { category, keyword } for the best keyword match, or null.
// lang ('hi', 'ta-IN', …) picks the native keyword list; without it the text's script decides.
export function matchCategoryByKeywords(text, type = 'expense', lang) {
  if (!text) return null;
  const t = canon(text);
  const lexicon = LEXICONS[lang] || pickNativeLexicon(t, lang);
  const allowed = new Set(categoriesForType(type));
  let best = null;
  for (const rule of rulesFor(lexicon)) {
    if (!allowed.has(rule.category)) continue;
    if (rule.regex.test(t) && (!best || rule.word.length > best.keyword.length)) {
      best = { category: rule.category, keyword: rule.word };
    }
  }
  return best;
}
