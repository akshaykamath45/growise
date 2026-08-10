"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RecommendationDemo } from "./recommendation-demo";
import { TopicPills } from "./topic-pills";
import { CourseCard } from "@/components/course-card";
import { Reveal } from "@/components/reveal";
import type { TopicData } from "./topic";

export function HomeExperience({ topics }: { topics: TopicData[] }) {
  const defaultIndex = Math.max(
    topics.findIndex((t) => t.category === "Design"),
    0
  );
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const topic = topics[activeIndex];

  // Deliberately drawn from other categories so nothing here repeats the demo above.
  const elsewhere = useMemo(() => {
    const shown = new Set(topic?.path.map((p) => p.id));
    return topics
      .filter((_, i) => i !== activeIndex)
      .flatMap((t) => t.path)
      .filter((p) => !shown.has(p.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [topics, activeIndex, topic]);

  if (!topic) return null;

  return (
    <>
      {/* ——— 4. What does that actually look like? ——— */}
      <section id="demo" className="bg-gw-paper border-b border-gw-border-soft">
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <div className="mb-8 flex flex-col items-start gap-4 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-8">
              <div>
                <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint mb-1.5">
                  A real recommendation
                </div>
                <h2 className="font-serif text-[30px] tracking-tight">
                  Here&apos;s what that looks like
                </h2>
              </div>
              <TopicPills topics={topics} activeIndex={activeIndex} onSelect={setActiveIndex} />
            </div>

            <RecommendationDemo topic={topic} />
          </Reveal>
        </div>
      </section>

      {/* ——— 5. What else can I explore? ——— */}
      <section className="bg-gw-bg">
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint mb-1.5">
                  The catalog
                </div>
                <h2 className="font-serif text-[30px] tracking-tight">Explore everything else</h2>
              </div>
              <Link href="/courses" className="text-[13.5px] font-medium">
                Browse all courses →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {topics.map((t) => (
                <Link
                  key={t.category}
                  href={`/courses?category=${encodeURIComponent(t.category)}`}
                  className="px-3.5 py-1.5 rounded-full border border-gw-border-soft bg-gw-surface text-[13px] font-medium text-gw-text no-underline hover:no-underline hover:border-gw-primary-border hover:text-gw-primary-text"
                >
                  {t.category}
                </Link>
              ))}
            </div>

            {elsewhere.length > 0 && (
              <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-9 sm:grid-cols-3 sm:gap-6">
                {elsewhere.map((product) => (
                  <CourseCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
