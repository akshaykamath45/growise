import type { Product } from "@/lib/types";

export interface InstructorSummary {
  name: string;
  count: number;
  category: string;
  topRating: number;
  topCourseTitle: string;
}

export function buildInstructors(products: Product[], limit = 4): InstructorSummary[] {
  const byName = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.instructor) continue;
    const list = byName.get(p.instructor) ?? [];
    list.push(p);
    byName.set(p.instructor, list);
  }

  const summaries: InstructorSummary[] = [...byName.entries()].map(([name, courses]) => {
    const categoryCounts = new Map<string, number>();
    for (const c of courses) categoryCounts.set(c.category, (categoryCounts.get(c.category) ?? 0) + 1);
    const [category] = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCourse = [...courses].sort((a, b) => b.rating - a.rating)[0];
    return {
      name,
      count: courses.length,
      category,
      topRating: topCourse.rating,
      topCourseTitle: topCourse.title,
    };
  });

  return summaries.sort((a, b) => b.count - a.count || b.topRating - a.topRating).slice(0, limit);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
