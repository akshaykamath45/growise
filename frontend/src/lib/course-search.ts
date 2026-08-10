import { productsApi } from "./api";
import type { Product } from "./types";

/** Relevance weights, highest first. Title matches always outrank metadata matches. */
const SCORE = {
  exactTitle: 100,
  titlePrefix: 90,
  titleContains: 80,
  category: 60,
  tag: 50,
  instructor: 40,
  level: 30,
  description: 20,
  allWordsAnywhere: 15,
} as const;

function scoreProduct(product: Product, query: string): number {
  const title = product.title.toLowerCase();

  if (title === query) return SCORE.exactTitle;
  if (title.startsWith(query)) return SCORE.titlePrefix;
  if (title.includes(query)) return SCORE.titleContains;

  if (product.category.toLowerCase().includes(query)) return SCORE.category;

  const tags = product.tags.toLowerCase();
  if (tags.includes(query)) return SCORE.tag;

  if (product.instructor.toLowerCase().includes(query)) return SCORE.instructor;
  if (product.level.toLowerCase().includes(query)) return SCORE.level;
  if (product.description.toLowerCase().includes(query)) return SCORE.description;

  // "cloud security" should still find things even when no single field contains
  // that exact phrase, as long as every word appears somewhere.
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const haystack = [
      title,
      product.category,
      tags,
      product.instructor,
      product.level,
      product.description,
    ]
      .join(" ")
      .toLowerCase();
    if (words.every((word) => haystack.includes(word))) return SCORE.allWordsAnywhere;
  }

  return 0;
}

export function searchCourses(products: Product[], rawQuery: string, limit = 6): Product[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return products
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.product.rating - a.product.rating ||
        a.product.title.localeCompare(b.product.title)
    )
    .slice(0, limit)
    .map((entry) => entry.product);
}

/** Real data, not invented: the highest-rated courses in the catalog. */
export function popularCourses(products: Product[], limit = 5): Product[] {
  return [...products]
    .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
    .slice(0, limit);
}

// The catalog is small and static enough to fetch once, then filter in-memory —
// that keeps autocomplete instant and avoids a request per keystroke.
let cache: Promise<Product[]> | null = null;

export function loadCourseIndex(): Promise<Product[]> {
  if (!cache) {
    cache = productsApi.list({ limit: 100 }).catch((err) => {
      cache = null; // let a later focus retry instead of caching the failure
      throw err;
    });
  }
  return cache;
}
