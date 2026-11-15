// Writes a word from any Indian script in plain English letters, the way people
// type Hinglish: "दोस्तों" → "doston", "நண்பர்" → "nanpar", "ভাড়া" → "bhara".
// Used for words the English word list doesn't know.
//
// The Unicode blocks for Devanagari, Bengali, Gujarati, Tamil, Telugu, Kannada and
// Malayalam share one layout (each letter sits at the same offset), so one table
// covers them all, with a few per-script differences below.

const BLOCKS = [0x0900, 0x0980, 0x0a00, 0x0a80, 0x0b00, 0x0b80, 0x0c00, 0x0c80, 0x0d00];
const BENGALI = 0x0980;
const MALAYALAM = 0x0d00;
const DRAVIDIAN = new Set([0x0b80, 0x0c00, 0x0c80, 0x0d00]);
// Scripts where the "a" after a consonant is often silent (कमरा = kamra, not kamara)
const DROPS_MEDIAL_A = new Set([0x0900, 0x0a00, 0x0a80]);

const CONSONANTS = {
  0x15: 'k', 0x16: 'kh', 0x17: 'g', 0x18: 'gh', 0x19: 'ng', 0x1a: 'ch', 0x1b: 'chh', 0x1c: 'j', 0x1d: 'jh',
  0x1e: 'ny', 0x1f: 't', 0x20: 'th', 0x21: 'd', 0x22: 'dh', 0x23: 'n', 0x24: 't', 0x25: 'th', 0x26: 'd',
  0x27: 'dh', 0x28: 'n', 0x29: 'n', 0x2a: 'p', 0x2b: 'ph', 0x2c: 'b', 0x2d: 'bh', 0x2e: 'm', 0x2f: 'y',
  0x30: 'r', 0x31: 'r', 0x32: 'l', 0x33: 'l', 0x34: 'zh', 0x35: 'v', 0x36: 'sh', 0x37: 'sh', 0x38: 's', 0x39: 'h',
};
const VOWELS = {
  0x05: 'a', 0x06: 'a', 0x07: 'i', 0x08: 'i', 0x09: 'u', 0x0a: 'u', 0x0b: 'ri', 0x0c: 'li', 0x0d: 'e',
  0x0e: 'e', 0x0f: 'e', 0x10: 'ai', 0x11: 'o', 0x12: 'o', 0x13: 'o', 0x14: 'au',
};
const SIGNS = {
  0x3e: 'a', 0x3f: 'i', 0x40: 'i', 0x41: 'u', 0x42: 'u', 0x43: 'ri', 0x44: 'ri', 0x45: 'e', 0x46: 'e',
  0x47: 'e', 0x48: 'ai', 0x49: 'o', 0x4a: 'o', 0x4b: 'o', 0x4c: 'au',
};
const MALAYALAM_CHILLU = { 0x7a: 'n', 0x7b: 'n', 0x7c: 'r', 0x7d: 'l', 0x7e: 'l', 0x7f: 'k' };
const LABIAL = /^(?:p|ph|b|bh|m)$/;

export function transliterate(word) {
  const units = [];
  let block = null;
  for (const ch of word) {
    const cp = ch.codePointAt(0);
    const b = cp & ~0x7f;
    const off = cp & 0x7f;
    if (!BLOCKS.includes(b)) {
      units.push({ raw: ch.toLowerCase() });
      continue;
    }
    block ??= b;
    const last = units[units.length - 1];
    if (CONSONANTS[off]) {
      let c = CONSONANTS[off];
      if (b === BENGALI && off === 0x2f) c = 'j'; // Bengali য is "j" (য় with a dot is "y")
      units.push({ c, off, v: b === BENGALI ? 'o' : 'a', inherent: true });
    } else if (off === 0x3c) {
      // Dot below (nukta): Bengali য় ড় ঢ়
      if (b === BENGALI && last?.c) last.c = { j: 'y', d: 'r', dh: 'rh' }[last.c] || last.c;
    } else if (SIGNS[off] !== undefined) {
      if (last?.c) Object.assign(last, { v: SIGNS[off], inherent: false });
      else units.push({ v: SIGNS[off] });
    } else if (off === 0x4d) {
      if (last?.c) Object.assign(last, { v: '', inherent: false, virama: true });
    } else if (VOWELS[off]) {
      units.push({ v: VOWELS[off] });
    } else if (off === 0x01 || off === 0x02) {
      if (last) last.nasal = b === BENGALI ? 'ng' : true;
    } else if (off === 0x03) {
      units.push({ raw: 'h' });
    } else if (b === MALAYALAM && MALAYALAM_CHILLU[off]) {
      units.push({ c: MALAYALAM_CHILLU[off], v: '', chillu: true });
    } else if (b === BENGALI && off === 0x4e) {
      units.push({ c: 't', v: '' }); // ৎ
    } else if (off >= 0x66 && off <= 0x6f) {
      units.push({ raw: String(off - 0x66) });
    }
  }
  if (!units.length) return word;

  // Malayalam ന്റ is "nt" (എന്റെ = ente), റ്റ is "tt"
  if (block === MALAYALAM) {
    units.forEach((u, i) => {
      const prev = units[i - 1];
      if (u.off === 0x31 && prev?.virama && (prev.off === 0x28 || prev.off === 0x31)) {
        u.c = 't';
        if (prev.off === 0x31) prev.c = 't';
      }
    });
  }

  // Silent "a": at the end of the word (राम = ram), and in Hindi/Gujarati between
  // two sounded syllables (कमरा = kamra). Not after a cluster (मित्र = mitra).
  if (!DRAVIDIAN.has(block)) {
    const lastIdx = units.findLastIndex((u) => u.c || u.v);
    const syllables = units.filter((u) => u.v).length;
    const end = units[lastIdx];
    if (end?.inherent && syllables > 1 && !units[lastIdx - 1]?.virama) {
      end.v = '';
      end.inherent = false;
    }
    if (DROPS_MEDIAL_A.has(block)) {
      for (let i = lastIdx - 1; i >= 1; i--) {
        const u = units[i];
        const prev = units[i - 1];
        const next = units[i + 1];
        if (u.inherent && !u.nasal && prev?.v && !prev.virama && next?.c && next.v) {
          u.v = '';
          u.inherent = false;
        }
      }
    }
  }

  let out = '';
  units.forEach((u, i) => {
    if (u.raw !== undefined) {
      out += u.raw;
      return;
    }
    out += (u.c || '') + (u.v || '');
    if (u.nasal) {
      const next = units[i + 1];
      if (u.nasal === 'ng') out += 'ng';
      else out += (next?.c && LABIAL.test(next.c)) || (DRAVIDIAN.has(block) && !next?.c) ? 'm' : 'n';
    }
  });
  // Malayalam words ending in ് are said with a short "u" (ഇന്ന് = innu)
  const end = units[units.length - 1];
  if (block === MALAYALAM && end?.virama) out += 'u';
  return out;
}
