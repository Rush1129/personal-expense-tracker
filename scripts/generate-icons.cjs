// Builds the app icons and favicon in the Ink & Lime look: an ink ₹ on lime.
// Run with: node scripts/generate-icons.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const LIME = '#cdf24a';
const INK = '#0e0f0c';

// ₹ outline from Noto Sans Bold (public/fonts), so it doesn't depend on installed fonts.
// Font units; the glyph's box is x 65–516, y -714–0. Keep in sync with src/components/Logo.jsx.
const RUPEE = 'M245 0L65 -314L65 -388L125 -388Q178 -388 214 -411.5Q250 -435 260 -477L65 -477L65 -551L259 -551Q250 -589 222 -614.5Q194 -640 144 -640L65 -640L65 -714L516 -714L516 -640L359 -640Q394 -602 403 -551L516 -551L516 -477L405 -477Q395 -403 348 -361.5Q301 -320 227 -305L423 0L245 0Z';
const GLYPH = { x: 65, y: -714, w: 451, h: 714 };

// size: canvas px; glyphHeight: share of the canvas the ₹ fills;
// radius: corner radius as a share of the canvas (0 = full bleed, for maskable and iOS)
function iconSvg(size, { glyphHeight, radius }) {
  const scale = (size * glyphHeight) / GLYPH.h;
  const x = (size - GLYPH.w * scale) / 2 - GLYPH.x * scale;
  const y = (size - GLYPH.h * scale) / 2 - GLYPH.y * scale;
  const r = Math.round(size * radius);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${LIME}"/>
  <path transform="translate(${+x.toFixed(2)} ${+y.toFixed(2)}) scale(${+scale.toFixed(5)})" fill="${INK}" d="${RUPEE}"/>
</svg>
`;
}

const ROUNDED = { glyphHeight: 0.56, radius: 0.225 };
// Maskable icons get cropped to a circle or squircle: keep the ₹ inside the middle 80%
const MASKABLE = { glyphHeight: 0.44, radius: 0 };
const APPLE = { glyphHeight: 0.52, radius: 0 };

async function png(name, size, options) {
  await sharp(Buffer.from(iconSvg(size, options))).png().toFile(path.join(publicDir, name));
  console.log(`Created ${name}`);
}

async function generate() {
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg(64, { glyphHeight: 0.62, radius: 0.225 }));
  console.log('Created favicon.svg');

  await png('pwa-192x192.png', 192, ROUNDED);
  await png('pwa-512x512.png', 512, ROUNDED);
  await png('maskable-icon-512x512.png', 512, MASKABLE);
  await png('apple-touch-icon.png', 180, APPLE);
  console.log('Done!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
