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
    <div className="flex flex-wrap gap-2">
      {topics.map((t, i) => (
        <button
          key={t.category}
          type="button"
          onClick={() => onSelect(i)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-colors ${
            i === activeIndex
              ? "bg-gw-primary border-gw-primary text-white"
              : "bg-white border-gw-border-soft text-gw-text hover:border-gw-primary-border hover:text-gw-primary-hover"
          }`}
        >
          {t.category}
        </button>
      ))}
    </div>
  );
}
