"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, recommendationsApi } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { CourseCard } from "@/components/course-card";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ForYouPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rec, setRec] = useState<Recommendation | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const load = useCallback(() => {
    if (!token) return;
    recommendationsApi
      .getForYou(token)
      .then(setRec)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load your recommendation right now.");
        setRec(null);
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await recommendationsApi.refresh(token);
      setRec(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refresh right now.");
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading || !user || rec === undefined) {
    return <div className="mx-auto max-w-[1180px] px-4 py-12 text-gw-text-muted sm:px-6 sm:py-16">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9">
      <div className="flex items-end gap-5">
        <div>
          <div className="font-mono text-[11px] tracking-wider uppercase text-gw-text-faint">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="mt-2 font-serif text-[34px] leading-tight tracking-tight sm:text-[42px]">
            For you, {user.email.split("@")[0]}
          </h1>
        </div>
      </div>

      {rec === null ? (
        <div className="mt-7 rounded-2xl border border-dashed border-gw-border bg-gw-surface p-7 text-center sm:mt-8 sm:p-14">
          <p className="font-serif text-lg text-gw-text-muted max-w-[40ch] mx-auto">
            {error
              ? "Your recommendation couldn't be generated yet. Browse a few courses, then try again."
              : "Still gathering signal. Browse a few courses or search for something you're curious about, and the agent will put together a recommendation."}
          </p>
          {error && <p className="mt-3 text-sm text-gw-error">{error}</p>}
          <Link
            href="/courses"
            className="inline-block mt-5 h-10 px-4 leading-10 rounded-[10px] bg-gw-primary text-white text-sm font-medium no-underline hover:no-underline hover:bg-gw-primary-hover"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface shadow-[0_1px_2px_rgba(28,30,42,0.05)] sm:mt-8">
          <div className="border-b border-gw-agent-border bg-gw-agent-bg px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="relative w-[22px] h-[22px] flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
                <span className="w-[7px] h-[7px] rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" />
              </span>
              <span className="font-mono text-[10.5px] tracking-wider uppercase text-gw-agent">
                Growise agent
              </span>
              <span className="font-mono text-[10.5px] text-[color:#c99a5e]">
                · updated {timeAgo(rec.created_at)}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="ml-auto h-[30px] rounded-lg border border-gw-agent-border bg-transparent px-3 text-[12.5px] font-medium text-gw-agent-2 cursor-pointer hover:bg-gw-agent-hover disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <p className="mt-4 max-w-[62ch] font-serif text-[20px] leading-relaxed text-gw-ink-2 sm:text-[22px]">
              {rec.narrative}
            </p>
            {rec.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {rec.evidence.map((ev) => (
                  <span
                    key={ev}
                    className="px-2.5 py-1 rounded-full border border-gw-agent-border bg-gw-surface/60 font-mono text-[10.5px] tracking-wide text-gw-agent-2"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            )}
            {error && <div className="text-sm text-gw-error mt-3">{error}</div>}
          </div>

          <div className="p-4 sm:p-6">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              {rec.items.length} course{rec.items.length === 1 ? "" : "s"}, in order
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {rec.items.map((item) => (
                <CourseCard
                  key={item.product.id}
                  product={item.product}
                  reason={item.reason}
                  recommendationId={rec.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
