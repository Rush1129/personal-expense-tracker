// The SpendWise mark: an ink ₹ on a lime tile. The ₹ is the same outline the app
// icons use (scripts/generate-icons.cjs) and the startup splash in index.html.
const RUPEE_PATH =
  'M245 0L65 -314L65 -388L125 -388Q178 -388 214 -411.5Q250 -435 260 -477L65 -477L65 -551L259 -551Q250 -589 222 -614.5Q194 -640 144 -640L65 -640L65 -714L516 -714L516 -640L359 -640Q394 -602 403 -551L516 -551L516 -477L405 -477Q395 -403 348 -361.5Q301 -320 227 -305L423 0L245 0Z';

export default function Logo({ size = 64, className = '' }) {
  return (
    <span
      className={`shrink-0 bg-accent text-on-accent flex items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3125) }}
      aria-hidden="true"
    >
      <svg viewBox="65 -714 451 714" style={{ height: size / 2 }} fill="currentColor">
        <path d={RUPEE_PATH} />
      </svg>
    </span>
  );
}
