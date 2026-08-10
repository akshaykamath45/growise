"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeSwap } from "./fade-swap";
import type { TopicData } from "./topic";

type NodeState = "explored" | "next" | "ahead";

function stateOf(i: number, recIndex: number): NodeState {
  if (i < recIndex) return "explored";
  if (i === recIndex) return "next";
  return "ahead";
}

/** Nodes still ahead are labelled with their real level — more useful than "Later",
 *  and it makes the shape of each category's path visible. */
function labelFor(state: NodeState, level: string): string {
  if (state === "explored") return "Explored";
  if (state === "next") return "Recommended";
  return level;
}

/** One journey visual: what you explored, what Growise recommends, what's beyond.
 *  This is the only place on the page a recommendation is shown. */
export function RecommendationDemo({ topic }: { topic: TopicData }) {
  const recIndex = topic.explored.length;
  const nodes = topic.path;

  return (
    <FadeSwap swapKey={topic.category}>
      {/* the journey rail */}
      <div className="hidden md:block relative mt-2">
        <div className="absolute top-[17px] left-[4%] right-[4%] h-px bg-gw-border" aria-hidden />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nodes.length}, 1fr)` }}>
          {nodes.map((c, i) => {
            const state = stateOf(i, recIndex);
            return (
              <div key={c.id} className="relative flex flex-col items-center text-center px-2.5">
                <span
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11.5px] border-2 ${
                    state === "next"
                      ? "bg-gw-agent-accent border-gw-agent-accent text-white"
                      : state === "explored"
                        ? "bg-gw-ink border-gw-ink text-white"
                        : "bg-gw-surface border-gw-border text-gw-text-placeholder"
                  }`}
                >
                  {state === "next" ? "✦" : String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-mono text-[9px] tracking-[0.14em] uppercase mt-3.5 ${
                    state === "next"
                      ? "text-gw-agent"
                      : state === "explored"
                        ? "text-gw-text-faint"
                        : "text-gw-text-placeholder"
                  }`}
                >
                  {labelFor(state, c.level)}
                </span>
                <span
                  className={`text-[13.5px] leading-snug mt-1.5 max-w-[20ch] ${
                    state === "next"
                      ? "font-semibold text-gw-ink"
                      : state === "explored"
                        ? "font-medium text-gw-text"
                        : "text-gw-text-placeholder"
                  }`}
                >
                  {c.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* mobile rail */}
      <div className="md:hidden relative mt-4 pl-9">
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gw-border" aria-hidden />
        <div className="flex flex-col gap-5">
          {nodes.map((c, i) => {
            const state = stateOf(i, recIndex);
            return (
              <div key={c.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] border-2 ${
                    state === "next"
                      ? "bg-gw-agent-accent border-gw-agent-accent text-white"
                      : state === "explored"
                        ? "bg-gw-ink border-gw-ink text-white"
                        : "bg-gw-surface border-gw-border text-gw-text-placeholder"
                  }`}
                >
                  {state === "next" ? "✦" : String(i + 1).padStart(2, "0")}
                </span>
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-gw-text-faint pt-0.5">
                  {labelFor(state, c.level)}
                </div>
                <div
                  className={`text-[15px] mt-0.5 ${
                    state === "next" ? "font-semibold text-gw-ink" : "text-gw-text"
                  }`}
                >
                  {c.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the single recommendation moment, with the orbit illustration filling
          the space beside it on wide screens */}
      <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
      <div className="bg-gw-agent-bg border border-gw-agent-border rounded-2xl px-7 py-7 shadow-[0_24px_50px_-30px_rgba(185,110,24,0.5)]">
        <div className="flex items-center gap-2.5">
          <span className="relative w-[18px] h-[18px] flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
            <span className="w-[6px] h-[6px] rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" />
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-gw-agent">
            Growise recommends
          </span>
        </div>

        <div className="font-serif text-[27px] leading-tight text-gw-ink mt-3.5">
          {topic.recommendation.title}
        </div>

        <p className="text-[14.5px] leading-relaxed text-gw-agent-2 mt-3 max-w-[52ch]">
          {topic.reason}
        </p>

        <div className="flex items-center gap-4 mt-5 flex-wrap">
          <Link
            href={`/courses/${topic.recommendation.id}`}
            className="h-10 px-4 rounded-[9px] bg-gw-primary text-white text-[13.5px] font-medium leading-10 no-underline hover:no-underline hover:bg-gw-primary-hover"
          >
            View course →
          </Link>
          <span className="font-mono text-[11.5px] text-gw-agent-2 tracking-wide">
            ${topic.recommendation.price} · {topic.recommendation.duration_label} ·{" "}
            {topic.recommendation.lessons_count} lessons
          </span>
        </div>
      </div>

        <div className="recommendation-art hidden lg:flex lg:justify-end">
          <Image
            src="/recommendation.png"
            alt=""
            aria-hidden
            width={1477}
            height={1065}
            sizes="520px"
            className="recommendation-art-image h-auto w-full max-w-[520px]"
          />
        </div>
      </div>
    </FadeSwap>
  );
}
