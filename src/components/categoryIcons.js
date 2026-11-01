import {
  Utensils, Car, ShoppingCart, ReceiptText, ShoppingBag, Clapperboard,
  Wallet, TrendingUp, Laptop, Briefcase, Gift, Ellipsis,
} from 'lucide-react';

// Line icon for each category, used on screen (CategoryIcon) and in PDF reports
export const CATEGORY_ICONS = {
  food: Utensils,
  transport: Car,
  groceries: ShoppingCart,
  bills: ReceiptText,
  shopping: ShoppingBag,
  entertainment: Clapperboard,
  pocketmoney: Wallet,
  investment: TrendingUp,
  freelance: Laptop,
  salary: Briefcase,
  gift: Gift,
  other: Ellipsis,
};
