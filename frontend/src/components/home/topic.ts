import type { Product } from "@/lib/types";

export interface TopicData {
  category: string;
  totalCount: number;
  explored: Product[]; // 1-2 lower/mid level courses, the "trail" so far
  recommendation: Product; // the next-step course
  path: Product[]; // level-ordered progression through the category, for the path viz
}

const LEVEL_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

export function buildTopics(categories: string[], products: Product[]): TopicData[] {
  return categories
    .map((category) => {
      const inCategory = products.filter((p) => p.category === category);
      if (inCategory.length === 0) return null;

      const sorted = [...inCategory].sort((a, b) => {
        const levelDiff = (LEVEL_ORDER[a.level] ?? 1) - (LEVEL_ORDER[b.level] ?? 1);
        if (levelDiff !== 0) return levelDiff;
        return b.rating - a.rating;
      });

      const explored = sorted.slice(0, Math.min(2, Math.max(sorted.length - 1, 1)));
      const recommendation = sorted[explored.length] ?? sorted[sorted.length - 1];

      return {
        category,
        totalCount: inCategory.length,
        explored,
        recommendation,
        path: sorted.slice(0, 5),
      };
    })
    .filter((t): t is TopicData => t !== null);
}
