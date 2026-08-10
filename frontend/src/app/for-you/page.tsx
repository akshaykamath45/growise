"use client";

import { useCallback, useEffect, useState } from "react";
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
      .catch(() => setRec(null));
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
    return <div className="max-w-[1180px] mx-auto px-6 py-16 text-gw-text-muted">Loading…</div>;
  }

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-9">
      <div className="flex items-end gap-5">
        <div>
          <div className="font-mono text-[11px] tracking-wider uppercase text-gw-text-faint">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="font-serif text-[42px] leading-tight tracking-tight mt-2">
            For you, {user.email.split("@")[0]}
          </h1>
        </div>
      </div>

      {rec === null ? (
        <div className="mt-8 border border-dashed border-gw-border rounded-2xl bg-gw-surface p-14 text-center">
          <p className="font-serif text-lg text-gw-text-muted max-w-[40ch] mx-auto">
            Still gathering signal. Browse a few courses or search for something you&apos;re curious about, and
            the agent will put together a recommendation.
          </p>
          <a
            href="/courses"
            className="inline-block mt-5 h-10 px-4 leading-10 rounded-[10px] bg-gw-primary text-white text-sm font-medium no-underline hover:no-underline hover:bg-gw-primary-hover"
          >
            Browse the catalog
          </a>
        </div>
      ) : (
        <div className="bg-white border border-gw-border-soft rounded-2xl overflow-hidden mt-8 shadow-[0_1px_2px_rgba(28,30,42,0.05)]">
          <div className="bg-gw-agent-bg border-b border-gw-agent-border px-8 py-7">
            <div className="flex items-center gap-2.5">
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
                className="ml-auto h-[30px] px-3 rounded-lg border border-gw-agent-border bg-transparent text-[12.5px] font-medium text-gw-agent-2 cursor-pointer hover:bg-[#fbe8ce] disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <p className="font-serif text-[22px] leading-relaxed text-gw-ink-2 mt-4 max-w-[62ch]">
              {rec.narrative}
            </p>
            {rec.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {rec.evidence.map((ev) => (
                  <span
                    key={ev}
                    className="px-2.5 py-1 rounded-full border border-gw-agent-border bg-white/60 font-mono text-[10.5px] tracking-wide text-gw-agent-2"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            )}
            {error && <div className="text-sm text-gw-error mt-3">{error}</div>}
          </div>

          <div className="p-6">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              {rec.items.length} course{rec.items.length === 1 ? "" : "s"}, in order
            </div>
            <div className="grid grid-cols-3 gap-5">
              {rec.items.map((item) => (
                <CourseCard key={item.product.id} product={item.product} reason={item.reason} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
