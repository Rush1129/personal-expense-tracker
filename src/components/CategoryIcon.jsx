import { CATEGORIES } from '../utils';
import { CATEGORY_ICONS as ICONS } from './categoryIcons';

// Tinted rounded tile with the category's line icon; colors live in index.css (.cat-*)
export default function CategoryIcon({ category, size = 44, className = '' }) {
  const key = CATEGORIES[category] ? category : 'other';
  const Icon = ICONS[key];
  return (
    <span
      className={`cat-${key} cat-tile shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
      aria-hidden="true"
    >
      <Icon style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={2} />
    </span>
  );
}

// Bare icon (no tile) for chips
export function CategoryGlyph({ category, className = 'w-4 h-4' }) {
  const Icon = ICONS[CATEGORIES[category] ? category : 'other'];
  return <Icon className={className} aria-hidden="true" />;
}
