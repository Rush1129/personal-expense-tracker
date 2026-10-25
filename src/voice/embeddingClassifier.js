import { CATEGORY_PROTOTYPES, categoriesForType } from './categoryRules';

// Below this cosine similarity the description is too unlike every category,
// so we leave it as "Other" rather than guess.
const MIN_SIMILARITY = 0.3;

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// embed(texts) must resolve to L2-normalised vectors (one per text).
export async function buildEmbeddingClassifier(embed) {
  const entries = Object.entries(CATEGORY_PROTOTYPES).flatMap(([category, phrases]) =>
    phrases.map((phrase) => ({ category, phrase }))
  );
  const vectors = await embed(entries.map((e) => e.phrase));
  entries.forEach((e, i) => { e.vector = vectors[i]; });

  return async function classify(text, type = 'expense') {
    const allowed = new Set(categoriesForType(type));
    const [query] = await embed([text]);
    let best = { category: 'other', score: 0 };
    for (const e of entries) {
      if (!allowed.has(e.category)) continue;
      const score = dot(query, e.vector);
      if (score > best.score) best = { category: e.category, score };
    }
    return best.score >= MIN_SIMILARITY ? best : { category: 'other', score: best.score };
  };
}
