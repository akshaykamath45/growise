"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_URL, ApiError, recommendationsApi } from "@/lib/api";
import type { Recommendation, RecommendationItem } from "@/lib/types";
import { LoadingState } from "@/components/loading-state";
import { useToast } from "@/components/toast-provider";
import { learnerFacingEvidenceList } from "@/lib/recommendation-evidence";
import { flush, track } from "@/lib/tracker";

const PATH_LABELS = ["Start here", "Build next", "Explore adjacent"];

const coverStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(135deg, var(--gw-surface-muted), var(--gw-primary-soft))",
};

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

function PathCourseCard({
  item,
  index,
  recommendationId,
}: {
  item: RecommendationItem;
  index: number;
  recommendationId: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { product, reason } = item;
  const isStartingPoint = index === 0;
  const pathLabel = PATH_LABELS[index] || "Keep exploring";

  return (
    <Link
      href={`/courses/${product.id}?recommendation=${recommendationId}`}
      onClick={() => {
        track({ event_type: "course_card_click", product_id: product.id, metadata: { category: product.category, source: "for_you_path" } });
        track({ event_type: "recommendation_click", product_id: product.id, metadata: { category: product.category, recommendation_id: recommendationId } });
      }}
      className={`group flex h-full min-h-[510px] flex-col overflow-hidden rounded-2xl border bg-gw-surface no-underline shadow-[0_14px_32px_-26px_rgba(28,30,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:no-underline hover:shadow-[0_20px_36px_-22px_rgba(74,63,207,0.38)] ${isStartingPoint ? "border-gw-primary-border ring-1 ring-gw-primary-border/60" : "border-gw-border-soft hover:border-gw-primary-border"}`}
    >
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-gw-surface-muted">
        {product.image_url && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${API_URL}${product.image_url}`} alt={product.title} loading={index === 0 ? "eager" : "lazy"} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]" />
        ) : (
          <div style={coverStyle} className="flex h-full w-full items-center justify-center"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gw-text-faint">{product.category}</span></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
        {isStartingPoint && <span className="absolute left-3 top-3 rounded-full bg-gw-primary px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white shadow-sm">Best next step</span>}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-gw-agent">{String(index + 1).padStart(2, "0")} · {pathLabel}</span>
          <span className="rounded-full bg-gw-primary-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-gw-primary-text">{product.level}</span>
        </div>
        <h2 className="mt-3 min-h-[3.15rem] text-[17px] font-semibold leading-snug text-gw-ink transition-colors group-hover:text-gw-primary">{product.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-gw-text-faint"><span className="font-medium text-gw-text-muted">{product.instructor}</span><span>·</span><span className="text-gw-agent-accent">★</span><span className="font-semibold text-gw-ink-2">{product.rating.toFixed(1)}</span><span className="font-mono text-[10px]">({product.reviews_count.toLocaleString()})</span></div>
        <div className="mt-1 font-mono text-[10px] tracking-wide text-gw-text-faint">{product.duration_label} · {product.lessons_count} lessons</div>
        <div className="mt-4 min-h-[116px] rounded-xl border border-gw-agent-border bg-gw-agent-bg/65 p-3.5">
          <div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gw-agent">Why this fits</span><span className="font-mono text-[9px] text-gw-agent">{isStartingPoint ? "strongest match" : "path extension"}</span></div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-gw-ink-2">{reason}</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4"><div><span className="text-xl font-semibold text-gw-primary-text">${product.price}</span>{product.old_price && <span className="ml-2 text-[11px] text-gw-text-placeholder line-through">${product.old_price}</span>}</div><span className="rounded-lg bg-gw-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-gw-primary-text transition-colors group-hover:bg-gw-primary group-hover:text-white">View course →</span></div>
      </div>
    </Link>
  );
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
      setDismissedIds(new Set());
      success({ title: "Recommendations refreshed", message: "Your latest learning signals have been considered." });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refresh right now.");
    } finally {
      setRefreshing(false);
    }
  }

  async function dismissRecommendation(productId: number, courseTitle: string) {
    setDismissedIds((current) => new Set([...current, productId]));
    track({
      event_type: "recommendation_dismissed",
      product_id: productId,
      metadata: { recommendation_id: rec?.id, source: "for_you" },
    });
    // Feedback is sent immediately so a manual refresh can honor it without
    // waiting for the normal best-effort event batch.
    await flush();
    success({
      title: "We’ll avoid this course",
      message: `${courseTitle} won’t be included in your next recommendation run.`,
    });
  }

  if (authLoading || !user || rec === undefined) {
    return (
      <LoadingState
        messages={[
          { title: "Reading your learning signal", description: "Gathering meaningful views, dwell, and searches." },
          { title: "Finding your next step", description: "Matching your interests with the course catalog." },
          { title: "Shaping your learning path", description: "Keeping enrolled and skipped courses out of your picks." },
        ]}
      />
    );
  }

  const visibleItems = rec?.items.filter((item) => !dismissedIds.has(item.product.id)) ?? [];
  const learnerEvidence = rec ? learnerFacingEvidenceList(rec.evidence) : [];

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9">
      <div className="flex items-end gap-5">
        <div>
          <div className="font-mono text-[11px] tracking-wider uppercase text-gw-text-faint">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="mt-2 font-serif text-[34px] leading-tight tracking-tight sm:text-[42px]">
            For you, {learnerName(user.email)}
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
        <div className="mt-7 overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface shadow-[0_12px_30px_-26px_rgba(42,37,108,0.45)] sm:mt-8">
          <div className="border-b border-gw-agent-border bg-gw-agent-bg px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="relative flex h-[22px] w-[22px] items-center justify-center" aria-hidden>
                <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
                <span className="h-[7px] w-[7px] rounded-full bg-gw-agent [animation:gwPulse_2.2s_ease-in-out_infinite]" />
              </span>
              <span className="font-mono text-[10.5px] tracking-wider uppercase text-gw-agent">Your learning path</span>
              <span className="font-mono text-[10.5px] text-[color:#c99a5e]">· updated {timeAgo(rec.created_at)}</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="ml-auto h-[31px] rounded-lg border border-gw-agent-border bg-gw-surface/60 px-3 text-[12px] font-medium text-gw-agent-2 cursor-pointer transition-colors hover:bg-gw-agent-hover disabled:cursor-wait disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Update path"}
              </button>
            </div>
            <p className="mt-4 max-w-[62ch] font-serif text-[20px] leading-relaxed text-gw-ink-2 sm:text-[23px]">{rec.narrative}</p>

            {learnerEvidence.length > 0 && (
              <div className="mt-5 border-t border-gw-agent-border pt-4">
                <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-gw-agent">What shaped this path</div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {learnerEvidence.map((ev) => (
                    <span key={ev} className="rounded-full border border-gw-agent-border bg-gw-surface/70 px-2.5 py-1 font-mono text-[10.5px] tracking-wide text-gw-agent-2">{ev}</span>
                  ))}
                </div>
                <details className="mt-3 text-[11.5px] leading-relaxed text-gw-text-muted"><summary className="cursor-pointer font-medium text-gw-agent-2">How your focus is calculated</summary><p className="mt-1.5 max-w-[74ch]">Focus strength combines recent course views, meaningful reading time, course opens, and searches. Repeated opens in one visit are counted once, short bounces are ignored, and recent activity carries more weight. It is a signal of current interest—not a grade or a percentage.</p></details>
                <p className="mt-3 text-[11.5px] leading-relaxed text-gw-text-muted">Courses already in your learning library, and any course you dismiss, stay out of future picks.</p>
              </div>
            )}
            {error && <div className="mt-3 text-sm text-gw-error">{error}</div>}
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint">Your next three moves</div>
                <p className="mt-1 text-sm text-gw-text-muted">Begin with the strongest match, then build depth and broaden into an adjacent skill.</p>
              </div>
              <span className="font-mono text-[10px] text-gw-text-faint">{visibleItems.length} of {rec.items.length} picks shown</span>
            </div>

            {visibleItems.length > 0 ? (
              <>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-gw-border-hairline bg-gw-surface-muted p-2">
                  {visibleItems.slice(0, 3).map((item, index) => <div key={`step-${item.product.id}`} className={`rounded-lg px-3 py-2 ${index === 0 ? "bg-gw-primary text-white" : "bg-gw-surface"}`}><div className={`font-mono text-[8.5px] uppercase tracking-[0.11em] ${index === 0 ? "text-white/75" : "text-gw-text-faint"}`}>Step {index + 1}</div><div className={`mt-1 truncate text-[11px] font-semibold ${index === 0 ? "text-white" : "text-gw-ink"}`}>{PATH_LABELS[index] || "Explore"}</div></div>)}
                </div>
                <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
                {visibleItems.map((item, index) => (
                  <div key={item.product.id} className="grid h-full min-w-0 grid-rows-[1fr_auto] gap-2">
                    <PathCourseCard item={item} index={index} recommendationId={rec.id} />
                    <button
                      type="button"
                      onClick={() => void dismissRecommendation(item.product.id, item.product.title)}
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[11px] text-gw-text-faint cursor-pointer transition-colors hover:border-gw-border-soft hover:bg-gw-surface-muted hover:text-gw-text-muted"
                    >
                      Not a fit for me
                    </button>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gw-agent-border bg-gw-agent-bg/50 px-5 py-7 text-center">
                <div className="font-semibold text-gw-ink">Thanks — we’ve noted your feedback.</div>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gw-text-muted">Update your path when you’re ready and the agent will look for different, eligible courses.</p>
                <button type="button" onClick={handleRefresh} disabled={refreshing} className="mt-4 h-9 rounded-lg bg-gw-primary px-4 text-sm font-medium text-white cursor-pointer disabled:opacity-60">{refreshing ? "Refreshing…" : "Find a different path"}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
