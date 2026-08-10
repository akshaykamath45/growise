"use client";

import type { TopicData } from "./topic";

export function TopicPills({
  topics,
  activeIndex,
  onSelect,
}: {
  topics: TopicData[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="-mx-4 flex w-[calc(100%+2rem)] flex-nowrap gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0">
      {topics.map((t, i) => (
        <button
          key={t.category}
          type="button"
          onClick={() => onSelect(i)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            i === activeIndex
              ? "bg-gw-primary border-gw-primary text-white"
              : "bg-gw-surface border-gw-border-soft text-gw-text hover:border-gw-primary-border hover:text-gw-primary-text"
          }`}
        >
          {t.category}
        </button>
      ))}
    </div>
  );
}
