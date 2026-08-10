import type { Product } from "@/lib/types";

export interface TopicData {
  category: string;
  totalCount: number;
  explored: Product[]; // the entry-level run a learner would plausibly have taken
  recommendation: Product; // the step that follows it
  path: Product[]; // explored + recommendation + what lies beyond
  reason: string; // derived from the real level/count relationship, not a fixed template
}

const LEVEL_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const rank = (level: string) => LEVEL_ORDER[level] ?? 1;

const PATH_LENGTH = 5;

interface ReasonFacts {
  first: string;
  rec: string;
  entry: string;
  next: string;
  category: string;
  remaining: number;
  ahead: string;
}

/** Six distinct phrasings, one per category, each filled with that category's real
 *  numbers and course names. Every category has exactly one entry-level course in the
 *  current catalog, so counting alone would print the same sentence six times. */
const REASON_TEMPLATES: ((f: ReasonFacts) => string)[] = [
  (f) =>
    `${f.first} covered the ${f.entry} ground. ${f.rec} is the first ${f.next} course that assumes you already have it.`,
  (f) =>
    `You've been circling ${f.category} at ${f.entry} level. ${f.rec} is where it stops being introductory. ${f.ahead}`,
  (f) =>
    `${f.rec} follows ${f.first} the way ${f.next} follows ${f.entry}: same subject, far less hand-holding.`,
  (f) =>
    `The useful move after ${f.first} isn't more ${f.entry} material — it's ${f.rec}, with ${f.remaining} ${f.category} courses still past it.`,
  (f) =>
    `${f.first} gave you the vocabulary. ${f.rec} is where ${f.category} starts asking you to make decisions instead.`,
  (f) => `${f.rec} is the ${f.next} step ${f.first} was setting up. ${f.ahead}`,
];

/** When several entry-level courses were covered, the groundwork sentence already
 *  describes the exploration — so these continuations only speak about the next step,
 *  instead of restating it. */
const CONTINUATION_TEMPLATES: ((f: ReasonFacts) => string)[] = [
  (f) => `${f.rec} is where those ideas start compounding. ${f.ahead}`,
  (f) => `${f.rec} is the ${f.next} course that assumes all of it. ${f.ahead}`,
  (f) => `That makes ${f.rec} the natural next step rather than another list. ${f.ahead}`,
];

function buildReason(
  explored: Product[],
  recommendation: Product,
  category: string,
  inCategory: Product[],
  templateIndex: number
): string {
  const entryLevel = explored[explored.length - 1].level;
  const advanced = inCategory.filter((p) => rank(p.level) > rank(recommendation.level)).length;

  const facts: ReasonFacts = {
    first: explored[0].title,
    rec: recommendation.title,
    entry: entryLevel.toLowerCase(),
    next: recommendation.level.toLowerCase(),
    category,
    remaining: Math.max(0, inCategory.length - explored.length - 1),
    ahead:
      advanced > 0
        ? `${advanced} advanced course${advanced === 1 ? "" : "s"} wait past it.`
        : `Nothing sits above it in ${category} — this is the top of the track.`,
  };

  if (explored.length >= 3) {
    const continuation =
      CONTINUATION_TEMPLATES[templateIndex % CONTINUATION_TEMPLATES.length](facts);
    return `Three ${facts.entry} courses deep in ${category}, the groundwork is done. ${continuation}`;
  }

  return REASON_TEMPLATES[templateIndex % REASON_TEMPLATES.length](facts);
}

export function buildTopics(categories: string[], products: Product[]): TopicData[] {
  return categories
    .map((category, categoryIndex) => {
      const inCategory = products.filter((p) => p.category === category);
      if (inCategory.length < 2) return null;

      const ordered = [...inCategory].sort((a, b) => {
        const d = rank(a.level) - rank(b.level);
        return d !== 0 ? d : b.rating - a.rating;
      });

      // How much entry-level material exists varies per category, so the number of
      // "explored" nodes — and therefore where the recommendation lands — varies too.
      const entryLevel = ordered[0].level;
      const atEntry = ordered.filter((p) => p.level === entryLevel);
      const explored = atEntry.slice(0, Math.min(3, atEntry.length));

      const exploredIds = new Set(explored.map((p) => p.id));
      const rest = ordered.filter((p) => !exploredIds.has(p.id));
      if (rest.length === 0) return null;

      const recommendation = rest.find((p) => rank(p.level) > rank(entryLevel)) ?? rest[0];
      const later = rest
        .filter((p) => p.id !== recommendation.id)
        .slice(0, Math.max(1, PATH_LENGTH - explored.length - 1));

      return {
        category,
        totalCount: inCategory.length,
        explored,
        recommendation,
        path: [...explored, recommendation, ...later],
        reason: buildReason(explored, recommendation, category, inCategory, categoryIndex),
      };
    })
    .filter((t): t is TopicData => t !== null);
}
