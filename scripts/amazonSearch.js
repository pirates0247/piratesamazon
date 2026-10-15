import { products } from '../data/products.js';

function normalize(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(str) {
  const n = normalize(str);
  if (!n) return [];
  return n.split(' ').filter(Boolean);
}

function scoreProduct(product, queryTokens) {
  if (!queryTokens.length) return 0;

  const nameNorm = normalize(product.name);
  const nameTokens = tokenize(product.name);

  let score = 0;

  // exact substring match boosts
  if (nameNorm.includes(queryTokens.join(' '))) score += 100;

  // token overlap
  const nameSet = new Set(nameTokens);
  for (const t of queryTokens) {
    if (nameSet.has(t)) score += 20;
    if (nameNorm.includes(t)) score += 8;
  }

  // rating count as tie-break
  if (score > 0) {
    const ratingCount = product?.rating?.count || 0;
    score += Math.min(10, ratingCount / 1000);
  }

  return score;
}

export function getSearchResults(query, limit = 8) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return { top: [], similar: [] };

  const scored = products
    .map((p) => ({
      product: p,
      score: scoreProduct(p, queryTokens)
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit).map((x) => x.product);

  // "similar" = also from same scored list but slightly more relaxed by taking next items
  const similar = scored.slice(limit, limit + limit).map((x) => x.product);

  return { top, similar };
}

