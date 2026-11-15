import { CATEGORIES } from '../utils';

// Kept apart from categoryRules.js so the AI worker doesn't load the keyword and
// Indian-language word lists it never uses.

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

export function categoriesForType(type) {
  return Object.keys(CATEGORIES).filter((key) => {
    const t = CATEGORIES[key].type;
    return t === 'both' || t === type || (!t && type === 'expense');
  });
}
