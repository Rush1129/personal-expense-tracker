import { CATEGORIES } from '../utils';

// Keyword rules: instant, offline, and tuned for everyday Indian spending.
// The longest matching keyword wins, so "phone recharge" → bills, not shopping.
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

// Example phrases per category for the on-device embedding model. The model
// compares the spoken description against these to pick the closest category
// when no keyword matches (e.g. "haircut", "medicines", "maid").
export const CATEGORY_PROTOTYPES = {
  food: [
    'eating out at a restaurant', 'ordered food delivery', 'coffee and snacks', 'lunch or dinner',
    'street food', 'drinks at a bar',
  ],
  transport: [
    'cab or auto ride', 'fuel for my vehicle', 'bus, train or metro ticket', 'flight ticket',
    'vehicle repair and servicing', 'parking and toll charges',
  ],
  groceries: [
    'groceries from the supermarket', 'vegetables and fruits', 'milk, bread and eggs',
    'household supplies and cleaning products', 'monthly ration',
  ],
  bills: [
    'monthly rent', 'electricity, water and gas bill', 'cooking gas cylinder refill',
    'internet and mobile recharge', 'loan EMI payment', 'insurance premium', 'school or college fees',
    'online course fee', 'house help salary', 'doctor and medicines', 'medical bills and pharmacy',
    'gym membership', 'laundry and dry cleaning',
  ],
  shopping: [
    'bought clothes and shoes', 'online shopping order', 'new gadget or electronics',
    'personal care and grooming', 'haircut at a salon', 'home decor and furniture', 'gift for a friend',
    'sports equipment', 'kitchen and home appliances',
  ],
  entertainment: [
    'movie tickets', 'streaming subscription', 'video games', 'concert or event tickets',
    'party and celebrations', 'weekend trip and vacation', 'hotel stay on a holiday', 'sightseeing tour',
    'hobbies and fun activities',
  ],
  salary: ['monthly salary credited', 'paycheck from my employer', 'bonus from work', 'internship stipend'],
  pocketmoney: ['pocket money from parents', 'allowance from family', 'money from mom or dad'],
  investment: [
    'stock market profit', 'mutual fund returns', 'interest from bank deposit', 'dividend payout',
    'sold shares',
  ],
  freelance: ['payment from a client', 'freelance project work', 'side gig income', 'consulting fees'],
  gift: ['birthday gift money', 'cash gift from relatives', 'won a prize', 'wedding shagun'],
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Precompile one regex per keyword; "s?" lets "snack" also match "snacks".
const RULES = Object.entries(CATEGORY_KEYWORDS).flatMap(([category, words]) =>
  words.map((word) => ({
    category,
    word,
    regex: new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(word)}s?(?=$|[^\\p{L}\\p{N}])`, 'iu'),
  }))
);

export function categoriesForType(type) {
  return Object.keys(CATEGORIES).filter((key) => {
    const t = CATEGORIES[key].type;
    return t === 'both' || t === type || (!t && type === 'expense');
  });
}

// Returns { category, keyword } for the best keyword match, or null.
export function matchCategoryByKeywords(text, type = 'expense') {
  if (!text) return null;
  const allowed = new Set(categoriesForType(type));
  let best = null;
  for (const rule of RULES) {
    if (!allowed.has(rule.category)) continue;
    if (rule.regex.test(text) && (!best || rule.word.length > best.keyword.length)) {
      best = { category: rule.category, keyword: rule.word };
    }
  }
  return best;
}
