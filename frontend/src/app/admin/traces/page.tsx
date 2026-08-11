"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminAccessFallback, useAdminAccess } from "@/components/admin-access";
import { AdminPageHeader } from "@/components/admin-page-header";
import { LoadingState } from "@/components/loading-state";
import { agentOpsApi } from "@/lib/api";
import type { AgentRunDetail, AgentRunStep, AgentRunSummary, MeshCallLog } from "@/lib/types";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asItems(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stepFor(run: AgentRunDetail, name: string): AgentRunStep | undefined {
  return run.steps.find((step) => step.step_name === name);
}

function outputFor(run: AgentRunDetail, name: string): Record<string, unknown> {
  return stepFor(run, name)?.output_snapshot || {};
}

function formatSeconds(value: number | null | undefined): string {
  const seconds = (value ?? 0) / 1_000;
  return `${Number(seconds.toFixed(seconds >= 10 ? 1 : 2))}s`;
}

function Status({ status }: { status: string }) {
  const successful = status === "completed" || status === "succeeded";
  return <span className={`font-mono text-[10px] ${successful ? "text-gw-success" : "text-gw-error"}`}>● {status}</span>;
}

function MiniStep({ label, detail, step }: { label: string; detail: string; step?: AgentRunStep }) {
  return (
    <div className="rounded-xl border border-gw-border-hairline bg-gw-surface-muted px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-gw-text-faint">{label}</span>
        {step && <Status status={step.status} />}
      </div>
      <div className="mt-2 text-[12px] font-semibold text-gw-ink">{detail}</div>
      {step && <div className="mt-1 font-mono text-[10px] text-gw-text-faint">{formatSeconds(step.latency_ms)}</div>}
    </div>
  );
}

function TraceCard({ title, subtitle, step, children }: { title: string; subtitle?: string; step?: AgentRunStep; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-gw-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-[12px] text-gw-text-muted">{subtitle}</p>}
        </div>
        {step && <span className="flex items-center gap-2"><Status status={step.status} /><span className="font-mono text-[10px] text-gw-text-faint">{formatSeconds(step.latency_ms)}</span></span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tag({ children, tone = "agent" }: { children: React.ReactNode; tone?: "agent" | "primary" | "muted" }) {
  const styles = {
    agent: "border-gw-agent-border bg-gw-agent-bg text-gw-agent",
    primary: "border-gw-primary-border bg-gw-primary-soft text-gw-primary-text",
    muted: "border-gw-border-soft bg-gw-surface-muted text-gw-text-muted",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10.5px] ${styles[tone]}`}>{children}</span>;
}

function SignalCard({ run }: { run: AgentRunDetail }) {
  const analyze = outputFor(run, "analyze_interest");
  const profile = asRecord(analyze.learner_profile);
  const focus = asItems(profile.focus);
  const engaged = asItems(profile.engaged_courses);
  const enrolled = asItems(profile.enrolled_courses);
  const dismissed = asItems(profile.dismissed_courses);
  const evidence = Array.isArray(analyze.evidence) ? analyze.evidence.filter((item): item is string => typeof item === "string") : [];

  return (
    <TraceCard title="Learner signal" subtitle="What the agent actually used—not every event it recorded." step={stepFor(run, "analyze_interest")}>
      <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">Strongest themes</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {focus.length > 0 ? focus.map((item) => <Tag key={asText(item.name)}>{asText(item.name)} · {String(item.interest_points ?? 0)} pts</Tag>) : <span className="text-sm text-gw-text-muted">No high-confidence themes yet.</span>}
      </div>

      {engaged.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">High-intent activity</div>
          <div className="mt-2 space-y-2">
            {engaged.slice(0, 3).map((item) => (
              <div key={String(item.product_id)} className="flex items-center justify-between gap-3 rounded-lg bg-gw-surface-muted px-3 py-2">
                <span className="min-w-0 truncate text-[12px] font-medium text-gw-ink">{asText(item.title)}</span>
                <span className="shrink-0 font-mono text-[10px] text-gw-agent">{String(item.interest_points ?? 0)} pts{item.dwell_seconds ? ` · ${String(item.dwell_seconds)}s` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(enrolled.length > 0 || dismissed.length > 0) && (
        <details className="mt-5 rounded-xl border border-gw-border-hairline bg-gw-surface-muted px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-medium text-gw-text">Learning context & feedback <span className="font-normal text-gw-text-muted">({enrolled.length + dismissed.length} exclusions)</span></summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {enrolled.map((item) => <Tag key={`enrolled-${String(item.product_id)}`} tone="primary">{asText(item.title)} · enrolled</Tag>)}
            {dismissed.map((item) => <Tag key={`dismissed-${String(item.product_id)}`} tone="muted">{asText(item.title)} · skipped</Tag>)}
          </div>
        </details>
      )}

      <details className="mt-3 border-t border-gw-border-hairline pt-3">
        <summary className="cursor-pointer font-mono text-[9px] tracking-[0.1em] uppercase text-gw-text-faint">View evidence and retrieval query</summary>
        <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-gw-text-muted">
          {evidence.length > 0 && <div><span className="font-medium text-gw-text">Evidence: </span>{evidence.join(" · ")}</div>}
          <div><span className="font-medium text-gw-text">Query: </span>{asText(analyze.query) || "—"}</div>
        </div>
      </details>
    </TraceCard>
  );
}

function RetrievalCard({ run, selectedIds }: { run: AgentRunDetail; selectedIds: Set<number> }) {
  const output = outputFor(run, "retrieve_catalog");
  const candidates = asItems(output.retrieved);
  const excludedEnrolled = asItems(output.excluded_enrolled);
  const excludedDismissed = asItems(output.excluded_dismissed);

  return (
    <TraceCard title="Catalog retrieval" subtitle={`${candidates.length} eligible courses were retrieved from the vector store.`} step={stepFor(run, "retrieve_catalog")}>
      <div className="divide-y divide-gw-border-hairline overflow-hidden rounded-xl border border-gw-border-hairline">
        {candidates.slice(0, 4).map((item) => {
          const id = Number(item.product_id);
          const selected = selectedIds.has(id);
          return <div key={String(item.product_id)} className="flex items-center justify-between gap-3 px-3 py-2.5"><div className="min-w-0"><div className="truncate text-[12px] font-medium text-gw-ink">{asText(item.title) || `Course #${id}`}</div><div className="mt-0.5 font-mono text-[10px] text-gw-text-faint">vector distance {Number(item.distance).toFixed(3)}</div></div><span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] ${selected ? "bg-gw-agent-bg text-gw-agent" : "bg-gw-surface-muted text-gw-text-faint"}`}>{selected ? "picked" : "candidate"}</span></div>;
        })}
      </div>
      {candidates.length > 4 && <details className="mt-3"><summary className="cursor-pointer text-[11px] font-medium text-gw-primary">Show {candidates.length - 4} more retrieved courses</summary><div className="mt-2 flex flex-wrap gap-2">{candidates.slice(4).map((item) => <Tag key={String(item.product_id)} tone="muted">{asText(item.title)}</Tag>)}</div></details>}
      {(excludedEnrolled.length > 0 || excludedDismissed.length > 0) && <p className="mt-4 text-[11px] leading-relaxed text-gw-text-muted">Guardrail applied: {excludedEnrolled.length} already-enrolled and {excludedDismissed.length} skipped course{excludedEnrolled.length + excludedDismissed.length === 1 ? " was" : "s were"} removed before generation.</p>}
    </TraceCard>
  );
}

function RerankingCard({ run, selectedIds }: { run: AgentRunDetail; selectedIds: Set<number> }) {
  const output = outputFor(run, "rerank_candidates");
  const reranked = asItems(output.reranked);
  const picked = reranked.filter((item) => selectedIds.has(Number(item.product_id)));
  const alternatives = reranked.filter((item) => !selectedIds.has(Number(item.product_id)));
  const fallback = Boolean(output.rerank_fallback);
  const averageFit = picked.length > 0
    ? Math.round(picked.reduce((total, item) => total + Number(item.fit_score ?? 0), 0) / picked.length)
    : 0;
  const routeCounts = picked.reduce<Record<string, number>>((counts, item) => {
    const role = asText(item.learning_role) || "best fit";
    counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <TraceCard title="Reranking" subtitle={fallback ? "Vector order was retained because the Mesh selection pass was unavailable." : "Mesh made the final ordering from fit and learning-path variety."} step={stepFor(run, "rerank_candidates")}>
      {picked.length > 0 ? <>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-gw-agent-bg px-3 py-2.5"><div className="font-mono text-[9px] uppercase tracking-[0.1em] text-gw-agent">Selected</div><div className="mt-1 text-lg font-semibold text-gw-ink">{picked.length}</div></div>
          <div className="rounded-xl bg-gw-agent-bg px-3 py-2.5"><div className="font-mono text-[9px] uppercase tracking-[0.1em] text-gw-agent">Avg. fit</div><div className="mt-1 text-lg font-semibold text-gw-ink">{averageFit}<span className="ml-0.5 text-xs font-normal text-gw-text-muted">/100</span></div></div>
          <div className="rounded-xl bg-gw-agent-bg px-3 py-2.5"><div className="font-mono text-[9px] uppercase tracking-[0.1em] text-gw-agent">Variety</div><div className="mt-1 truncate text-[13px] font-semibold text-gw-ink">{Object.keys(routeCounts).length} path{Object.keys(routeCounts).length === 1 ? "" : "s"}</div></div>
        </div>
        <ol className="mt-4 space-y-2">
          {picked.map((item, index) => {
            const score = Math.max(0, Math.min(100, Number(item.fit_score ?? 0)));
            return <li key={String(item.product_id)} className="rounded-xl border border-gw-border-hairline bg-gw-surface-muted px-3 py-3"><div className="flex items-center gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gw-agent-bg font-mono text-[10px] text-gw-agent">{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold text-gw-ink">{asText(item.title)}</div><div className="mt-1 flex items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.08em] text-gw-text-faint">{asText(item.learning_role) || "best fit"}</span><div className="h-1 flex-1 overflow-hidden rounded-full bg-gw-border-hairline"><div className="h-full rounded-full bg-gw-agent" style={{ width: `${score}%` }} /></div><span className="font-mono text-[10px] text-gw-agent">{score}</span></div></div></div></li>;
          })}
        </ol>
        <details className="mt-4 border-t border-gw-border-hairline pt-3"><summary className="cursor-pointer text-[11px] font-medium text-gw-primary">Inspect the model’s selection notes</summary><div className="mt-3 space-y-2">{picked.map((item) => <div key={`note-${String(item.product_id)}`} className="text-[11px] leading-relaxed text-gw-text-muted"><span className="font-medium text-gw-text">{asText(item.title)}: </span>{asText(item.rationale) || "No written rationale was captured."}</div>)}</div></details>
      </> : <p className="text-sm text-gw-text-muted">No final selection snapshot was recorded for this run.</p>}
      {alternatives.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-[11px] font-medium text-gw-primary">View {alternatives.length} alternatives left available</summary><div className="mt-2 flex flex-wrap gap-2">{alternatives.map((item) => <Tag key={String(item.product_id)} tone="muted">{asText(item.title)} · {Number(item.fit_score ?? 0).toFixed(0)}</Tag>)}</div></details>}
    </TraceCard>
  );
}

function OutcomeCard({ run }: { run: AgentRunDetail }) {
  const output = outputFor(run, "generate_narrative");
  const picks = asItems(output.recommended_items);
  const narrative = asText(output.narrative);
  const store = outputFor(run, "store_recommendation");
  const relevance = outputFor(run, "evaluate_relevance");

  return (
    <TraceCard title="Delivered recommendation" subtitle={store.recommendation_id ? `Recommendation #${String(store.recommendation_id)} is active and ready for the learner.` : "No recommendation was stored."} step={stepFor(run, "generate_narrative")}>
      <div className="rounded-xl border border-gw-primary-border bg-gw-primary-soft p-4"><div className="font-mono text-[9px] tracking-[0.1em] uppercase text-gw-primary-text">What the learner sees</div><p className="mt-2 text-[13px] leading-relaxed text-gw-ink">{narrative || "A tailored next-step recommendation was prepared from this learner’s current signal."}</p></div>
      <div className="mt-3 divide-y divide-gw-border-hairline rounded-xl border border-gw-border-hairline">
        {picks.map((item) => <div key={String(item.product_id)} className="flex items-center gap-3 px-3 py-2.5"><span className="font-mono text-[10px] text-gw-primary-text">#{String(item.rank)}</span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-gw-ink">{asText(item.title)}</span><span className="shrink-0 text-[10px] text-gw-text-muted">recommended</span></div>)}
      </div>
      {picks.some((item) => asText(item.reason)) && <details className="mt-3"><summary className="cursor-pointer text-[11px] font-medium text-gw-primary">View learner-facing reasons</summary><div className="mt-3 space-y-2">{picks.map((item) => <div key={`reason-${String(item.product_id)}`} className="text-[11px] leading-relaxed text-gw-text-muted"><span className="font-medium text-gw-text">{asText(item.title)}: </span>{asText(item.reason)}</div>)}</div></details>}
      <div className="mt-4 flex items-center gap-2 border-t border-gw-border-hairline pt-3 text-[11px] text-gw-text-muted"><Status status={relevance.relevance_ok ? "completed" : "failed"} /> {relevance.relevance_ok ? "Retrieval passed the relevance threshold." : "Retrieval required a broader retry."}</div>
    </TraceCard>
  );
}

function MeshRouting({ calls }: { calls: MeshCallLog[] }) {
  return (
    <section className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-gw-ink">Mesh usage for this run</h2><p className="mt-1 text-[12px] text-gw-text-muted">Actual model route, measured tokens, and latency.</p></div><span className="font-mono text-[10px] text-gw-text-faint">{calls.length} call{calls.length === 1 ? "" : "s"}</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {calls.map((call) => <article key={call.id} className="rounded-xl border border-gw-agent-border bg-gw-agent-bg px-4 py-3"><div className="flex items-center justify-between gap-3"><Status status={call.status} /><span className="font-mono text-[10px] text-gw-text-faint">{formatSeconds(call.latency_ms)}</span></div><div className="mt-3 text-[13px] font-semibold text-gw-ink">{call.resolved_model || call.requested_model}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-gw-text-faint">{call.step_name.replaceAll("_", " ")}</div><div className="mt-3 flex gap-3 font-mono text-[10px] text-gw-agent"><span>{call.total_tokens ?? 0} tokens</span><span>{call.prompt_tokens ?? 0} in</span><span>{call.completion_tokens ?? 0} out</span></div></article>)}
      </div>
      {calls.length === 0 && <p className="mt-4 text-sm text-gw-text-muted">No Mesh calls were captured for this run.</p>}
    </section>
  );
}

function RunBrief({ run }: { run: AgentRunDetail }) {
  const profile = asRecord(outputFor(run, "analyze_interest").learner_profile);
  const focus = asItems(profile.focus);
  const engaged = asItems(profile.engaged_courses);
  const picks = asItems(outputFor(run, "generate_narrative").recommended_items);
  const retrieved = asItems(outputFor(run, "retrieve_catalog").retrieved);

  return (
    <section className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-primary-text">Recommendation #{run.recommendation_id ?? "—"} · run #{run.id}</div><h2 className="mt-1.5 text-xl font-semibold text-gw-ink">{run.user_label}</h2><p className="mt-1 text-sm text-gw-text-muted">{picks.length} picks selected from {retrieved.length} eligible catalog candidates.</p></div><span className="font-mono text-xs text-gw-success">● {run.status} · {formatSeconds(run.latency_ms)}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-gw-surface-muted p-3"><div className="font-mono text-[9px] tracking-[0.1em] uppercase text-gw-text-faint">Primary focus</div><div className="mt-1.5 text-[13px] font-semibold text-gw-ink">{asText(focus[0]?.name) || "Not enough signal"}</div></div><div className="rounded-xl bg-gw-surface-muted p-3"><div className="font-mono text-[9px] tracking-[0.1em] uppercase text-gw-text-faint">Strongest engagement</div><div className="mt-1.5 truncate text-[13px] font-semibold text-gw-ink">{asText(engaged[0]?.title) || "No course activity"}</div></div><div className="rounded-xl bg-gw-surface-muted p-3"><div className="font-mono text-[9px] tracking-[0.1em] uppercase text-gw-text-faint">Trigger</div><div className="mt-1.5 text-[13px] font-semibold text-gw-ink">{run.trigger_reason.replaceAll("_", " ")}</div></div></div>
    </section>
  );
}

function AdminTracesContent() {
  const { token, allowed, loading: authLoading } = useAdminAccess();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!token) return;
    try {
      const nextRuns = await agentOpsApi.runs(token, 30);
      setRuns(nextRuns);
      const requested = Number(searchParams.get("run"));
      setSelectedRunId((current) => current ?? (Number.isInteger(requested) && requested > 0 ? requested : nextRuns[0]?.id ?? null));
      setLoadError(null);
    } catch {
      setLoadError("Recommendation runs could not be loaded.");
    } finally {
      setRunsLoading(false);
    }
  }, [searchParams, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRuns(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRuns]);

  useEffect(() => {
    if (!token || !selectedRunId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setRunLoading(true);
      setRun(null);
      agentOpsApi.run(token, selectedRunId)
        .then((nextRun) => { if (active) setRun(nextRun); })
        .catch(() => { if (active) setLoadError("This recommendation run could not be loaded."); })
        .finally(() => { if (active) setRunLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedRunId, token]);

  const selectedIds = useMemo(
    () => new Set(asItems(run ? outputFor(run, "generate_narrative").recommended_items : []).map((item) => Number(item.product_id))),
    [run]
  );
  const hasReranking = Boolean(run && stepFor(run, "rerank_candidates"));

  if (authLoading || !allowed) return <AdminAccessFallback />;
  if (runsLoading) return <LoadingState title="Loading recommendation traces" description="Preparing agent runs, retrieval evidence, and measured Mesh routes." />;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9">
      <AdminPageHeader eyebrow="Growise · Admin console" title="Agent trace explorer" description="A concise audit trail for how a learner signal became a grounded recommendation." />
      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gw-border-soft bg-gw-surface p-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-text-faint">Recommendation runs</div>
          <div className="mt-3 flex max-h-[65vh] flex-col gap-2 overflow-auto pr-1">
            {runs.map((item) => <button key={item.id} onClick={() => setSelectedRunId(item.id)} className={`rounded-xl border p-3 text-left transition-colors ${item.id === selectedRunId ? "border-gw-agent-border bg-gw-agent-bg" : "border-gw-border-hairline hover:bg-gw-surface-muted"}`}><div className="flex justify-between gap-2 font-mono text-[10px] text-gw-text-faint"><span>run #{item.id}</span><Status status={item.status} /></div><div className="mt-2 truncate text-xs font-semibold text-gw-ink">{item.user_label}</div><div className="mt-1 font-mono text-[10px] text-gw-text-muted">{formatSeconds(item.latency_ms)} · rec #{item.recommendation_id ?? "—"}</div></button>)}
            {runs.length === 0 && <p className="px-2 py-8 text-center text-sm text-gw-text-muted">No recommendation runs yet.</p>}
          </div>
        </aside>

        <div>
          {run ? <><RunBrief run={run} /><section className={`mt-5 grid gap-3 md:grid-cols-2 ${hasReranking ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}><MiniStep label="Observe" detail="Learner signal" step={stepFor(run, "analyze_interest")} /><MiniStep label="Retrieve" detail="Catalog candidates" step={stepFor(run, "retrieve_catalog")} />{hasReranking && <MiniStep label="Rerank" detail="Fit & diversity" step={stepFor(run, "rerank_candidates")} />}<MiniStep label="Deliver" detail="Recommendation stored" step={stepFor(run, "store_recommendation")} /></section><section className="mt-5 grid gap-5 xl:grid-cols-2"><SignalCard run={run} /><RetrievalCard run={run} selectedIds={selectedIds} /></section><section className={`mt-5 grid gap-5 ${hasReranking ? "xl:grid-cols-2" : ""}`}>{hasReranking && <RerankingCard run={run} selectedIds={selectedIds} />}<OutcomeCard run={run} /></section><div className="mt-5"><MeshRouting calls={run.mesh_calls} /></div></> : runLoading ? <LoadingState compact title="Opening recommendation trace" description="Loading learner signal, retrieval evidence, and Mesh routing." className="rounded-2xl border border-gw-border-soft bg-gw-surface" /> : <div className="rounded-2xl border border-dashed border-gw-border p-12 text-center text-sm text-gw-text-muted">{loadError || "Select a recommendation run to inspect it."}</div>}
        </div>
      </div>
    </main>
  );
}

export default function AdminTracesPage() {
  return <Suspense fallback={<AdminAccessFallback />}><AdminTracesContent /></Suspense>;
}
