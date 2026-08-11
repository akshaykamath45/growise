"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, recommendationsApi } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { CourseCard } from "@/components/course-card";
import { LoadingState } from "@/components/loading-state";
import { useToast } from "@/components/toast-provider";
import { learnerFacingEvidenceList } from "@/lib/recommendation-evidence";
import { flush, track } from "@/lib/tracker";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function learnerName(email: string): string {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ForYouPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { success } = useToast();
  const router = useRouter();
  const [rec, setRec] = useState<Recommendation | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const load = useCallback(() => {
    if (!token) return;
    recommendationsApi.getForYou(token).then(setRec).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Couldn't load your recommendation right now.");
      setRec(null);
    });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await recommendationsApi.refresh(token);
      setRec(fresh);
      setDismissedIds(new Set());
      success({ title: "Recommendations refreshed", message: "Your latest learning signals have been considered." });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refresh right now.");
    } finally { setRefreshing(false); }
  }

  async function dismissRecommendation(productId: number, courseTitle: string) {
    setDismissedIds((current) => new Set([...current, productId]));
    track({ event_type: "recommendation_dismissed", product_id: productId, metadata: { recommendation_id: rec?.id, source: "for_you" } });
    await flush();
    success({ title: "We’ll avoid this course", message: `${courseTitle} won’t be included in your next recommendation run.` });
  }

  if (authLoading || !user || rec === undefined) {
    return <LoadingState messages={[{ title: "Reading your learning signal", description: "Gathering meaningful views, dwell, and searches." }, { title: "Finding your next step", description: "Matching your interests with the course catalog." }, { title: "Shaping your learning path", description: "Keeping enrolled and skipped courses out of your picks." }]} />;
  }

  const visibleItems = rec?.items.filter((item) => !dismissedIds.has(item.product.id)) ?? [];
  const learnerEvidence = rec ? learnerFacingEvidenceList(rec.evidence) : [];

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9">
      <header><div className="font-mono text-[11px] uppercase tracking-wider text-gw-text-faint">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1 className="mt-2 font-serif text-[34px] leading-tight tracking-tight sm:text-[42px]">For you, {learnerName(user.email)}</h1></header>

      {rec === null ? (
        <div className="mt-7 rounded-2xl border border-dashed border-gw-border bg-gw-surface p-7 text-center sm:mt-8 sm:p-14"><p className="mx-auto max-w-[40ch] font-serif text-lg text-gw-text-muted">{error ? "Your recommendation couldn't be generated yet. Browse a few courses, then try again." : "Still gathering signal. Browse a few courses or search for something you're curious about, and the agent will put together a recommendation."}</p>{error && <p className="mt-3 text-sm text-gw-error">{error}</p>}<Link href="/courses" className="mt-5 inline-block rounded-[10px] bg-gw-primary px-4 py-2.5 text-sm font-medium text-white no-underline hover:bg-gw-primary-hover hover:no-underline">Browse the catalog</Link></div>
      ) : (
        <section className="mt-7 overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface shadow-[0_12px_30px_-26px_rgba(42,37,108,0.45)] sm:mt-8">
          <div className="border-b border-gw-agent-border bg-gw-agent-bg px-5 py-5 sm:px-8 sm:py-7"><div className="flex flex-wrap items-center gap-2.5"><span className="relative flex h-[22px] w-[22px] items-center justify-center" aria-hidden><span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" /><span className="h-[7px] w-[7px] rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" /></span><span className="font-mono text-[10.5px] uppercase tracking-wider text-gw-agent">Your learning path</span><span className="font-mono text-[10.5px] text-[color:#c99a5e]">· updated {timeAgo(rec.created_at)}</span><button onClick={handleRefresh} disabled={refreshing} className="ml-auto h-[31px] rounded-lg border border-gw-agent-border bg-gw-surface/60 px-3 text-[12px] font-medium text-gw-agent-2 transition-colors hover:bg-gw-agent-hover disabled:cursor-wait disabled:opacity-60">{refreshing ? "Refreshing…" : "Update path"}</button></div><p className="mt-4 max-w-[62ch] font-serif text-[20px] leading-relaxed text-gw-ink-2 sm:text-[23px]">{rec.narrative}</p>{learnerEvidence.length > 0 && <div className="mt-5 border-t border-gw-agent-border pt-4"><div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-gw-agent">What shaped this path</div><div className="mt-2.5 flex flex-wrap gap-2">{learnerEvidence.map((ev) => <span key={ev} className="rounded-full border border-gw-agent-border bg-gw-surface/70 px-2.5 py-1 font-mono text-[10.5px] tracking-wide text-gw-agent-2">{ev}</span>)}</div><details className="mt-3 text-[11.5px] leading-relaxed text-gw-text-muted"><summary className="cursor-pointer font-medium text-gw-agent-2">How your focus is calculated</summary><p className="mt-1.5 max-w-[74ch]">Focus strength combines recent course views, meaningful reading time, course opens, and searches. Repeated opens in one visit are counted once, short bounces are ignored, and recent activity carries more weight. It is a signal of current interest—not a grade or a percentage.</p></details><p className="mt-3 text-[11.5px] leading-relaxed text-gw-text-muted">Courses already in your learning library, and any course you dismiss, stay out of future picks.</p></div>}{error && <div className="mt-3 text-sm text-gw-error">{error}</div>}</div>
          <div className="p-4 sm:p-6"><div><div className="font-mono text-[10px] uppercase tracking-wider text-gw-text-faint">Recommended for you</div><p className="mt-1 text-sm text-gw-text-muted">A few courses selected from what you’ve been exploring recently.</p></div>{visibleItems.length > 0 ? <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">{visibleItems.map((item) => <div key={item.product.id} className="group relative"><CourseCard product={item.product} reason={item.reason} recommendationId={rec.id} /><button type="button" onClick={() => void dismissRecommendation(item.product.id, item.product.title)} className="mt-2 w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[11px] text-gw-text-faint transition-colors hover:border-gw-border-soft hover:bg-gw-surface-muted hover:text-gw-text-muted">Not for me</button></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-gw-agent-border bg-gw-agent-bg/50 px-5 py-7 text-center"><div className="font-semibold text-gw-ink">Thanks — we’ve noted your feedback.</div><p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gw-text-muted">Update your path when you’re ready and the agent will look for different, eligible courses.</p><button type="button" onClick={handleRefresh} disabled={refreshing} className="mt-4 h-9 rounded-lg bg-gw-primary px-4 text-sm font-medium text-white disabled:opacity-60">{refreshing ? "Refreshing…" : "Find a different path"}</button></div>}</div>
        </section>
      )}
    </main>
  );
}
