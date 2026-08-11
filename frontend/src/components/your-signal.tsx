"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { eventsApi, recommendationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/tracker";
import type { ActivityEvent, Recommendation } from "@/lib/types";
import { LoadingState } from "@/components/loading-state";

const REFRESH_INTERVAL_MS = 5_000;

function eventLabel(event: ActivityEvent): string {
  const course = event.product_title || "a course";
  const seconds = Number(event.metadata?.seconds);
  switch (event.event_type) {
    case "product_view":
      return `Viewed · ${course}`;
    case "time_on_page":
      return `Dwell · ${Number.isFinite(seconds) ? `${seconds}s` : "reading"} on ${course}`;
    case "search":
      return `Searched · “${event.search_query || "courses"}”`;
    case "search_result_click":
      return `Opened from search · ${course}`;
    case "course_card_click":
      return `Explored · ${course}`;
    case "enroll_click":
      return `Started enrollment · ${course}`;
    case "recommendation_click":
      return `Followed agent pick · ${course}`;
    default:
      return `${event.event_type.replaceAll("_", " ")} · ${course}`;
  }
}

export function YourSignal({ compact = false }: { compact?: boolean }) {
  const { token, user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSignal = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const [eventsResult, recommendationResult] = await Promise.allSettled([
      eventsApi.mine(token),
      recommendationsApi.getForYou(token),
    ]);
    if (eventsResult.status === "fulfilled") setEvents(eventsResult.value);
    if (recommendationResult.status === "fulfilled") setRecommendation(recommendationResult.value);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadSignal(), 0);
    const interval = window.setInterval(() => void loadSignal(), REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadSignal]);

  if (compact) {
    return (
      <section className="border-t border-gw-agent-border bg-gw-agent-bg/50 px-5 py-4" aria-label="Your learning signal">
        <div className="flex items-center gap-2">
          <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
            <span className="h-1.5 w-1.5 rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" />
          </span>
          <div>
            <div className="font-semibold text-[13px] text-gw-ink">Your Signal</div>
            <div className="font-mono text-[9px] tracking-wide uppercase text-gw-agent">live · observed by agent</div>
          </div>
          {user?.tracking_opt_in && <span className="ml-auto font-mono text-[9px] text-gw-agent">● live</span>}
        </div>

        <div className="mt-3">
          {authLoading ? (
            <p className="text-[12px] text-gw-text-muted">Preparing your learning signal…</p>
          ) : !user ? (
            <p className="text-[12px] leading-relaxed text-gw-text-muted">Sign in to personalise this course with your learning signal.</p>
          ) : loading ? (
            <LoadingState compact title="Reading your signal" description="Looking at recent activity." />
          ) : events.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-gw-text-muted">Explore a few courses and the agent will start building your path.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {events.slice(0, 2).map((event) => (
                <div key={event.id} className="truncate font-mono text-[10px] text-gw-agent">{eventLabel(event)}</div>
              ))}
            </div>
          )}

          {recommendation && (
            <div className="mt-3 border-t border-gw-agent-border pt-3">
              <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-agent">Agent read</div>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gw-ink">{recommendation.narrative}</p>
              <Link href="/for-you" className="mt-2.5 flex items-center justify-between rounded-lg border border-gw-agent-border bg-gw-surface/75 px-3 py-2 text-[11px] font-semibold text-gw-agent no-underline hover:bg-gw-agent-hover hover:no-underline">
                <span>View your path · {recommendation.items.length} picks</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gw-agent-border bg-gw-agent-bg shadow-[0_8px_26px_-22px_rgba(90,71,220,0.55)]">
      <div className="flex items-center gap-2 border-b border-gw-agent-border px-4 py-3.5">
        <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" />
        </span>
        <div>
          <div className="font-semibold text-[13px] text-gw-ink">Your Signal</div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase text-gw-agent">live · observed by agent</div>
        </div>
        {user?.tracking_opt_in && <span className="ml-auto text-[10px] text-gw-agent">● streaming</span>}
      </div>

      <div className="px-4 py-4">
        {authLoading ? (
          <p className="mt-3 text-sm text-slate-500">Setting up your learning signal…</p>
        ) : !user ? (
          <p className="text-sm leading-relaxed text-gw-text-muted">Sign in to let the agent build a learning signal from your browsing.</p>
        ) : loading ? (
          <LoadingState compact title="Reading your signal" description="Looking at recent learning activity." />
        ) : events.length === 0 ? (
          <p className="text-sm leading-relaxed text-gw-text-muted">Explore this course or search the catalog. Your signal will appear here in a few seconds.</p>
        ) : (
          <div className="flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
            {events.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-lg border border-gw-agent-border bg-gw-surface/75 px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-gw-text">
                <span className="text-gw-agent">{eventLabel(event)}</span>
              </div>
            ))}
          </div>
        )}

        {recommendation && (
          <div className="mt-4 border-t border-gw-agent-border pt-4">
            <div className="font-mono text-[9.5px] tracking-wide uppercase text-gw-agent">Agent read</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gw-ink">{recommendation.narrative}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendation.items.slice(0, 2).map((item) => (
                <Link
                  key={item.product.id}
                  href={`/courses/${item.product.id}?recommendation=${recommendation.id}`}
                  onClick={() =>
                    track({
                      event_type: "recommendation_click",
                      product_id: item.product.id,
                      metadata: { category: item.product.category, recommendation_id: recommendation.id },
                    })
                  }
                  className="rounded-lg border border-gw-agent-border bg-gw-surface px-2.5 py-1.5 text-[11px] font-medium text-gw-agent no-underline hover:bg-gw-agent-hover hover:no-underline"
                >
                  {item.product.title}
                </Link>
              ))}
            </div>
            <Link href="/for-you" className="mt-3 inline-block text-[11px] font-semibold text-gw-agent hover:underline">
              See your full path →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
