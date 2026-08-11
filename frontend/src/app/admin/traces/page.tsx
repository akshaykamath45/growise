"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminAccessFallback, useAdminAccess } from "@/components/admin-access";
import { AdminPageHeader } from "@/components/admin-page-header";
import { agentOpsApi } from "@/lib/api";
import type { AgentRunDetail, AgentRunStep, AgentRunSummary, MeshCallLog } from "@/lib/types";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asItems(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
}

function Status({ status }: { status: string }) {
  return <span className={`font-mono text-[10px] ${status === "completed" || status === "succeeded" ? "text-gw-success" : "text-gw-error"}`}>● {status}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">{label}</div><p className="mt-1 text-[12px] leading-relaxed text-gw-text">{value || "—"}</p></div>;
}

function TraceStepCard({ step, selectedIds }: { step: AgentRunStep; selectedIds: Set<number> }) {
  const input = step.input_snapshot || {};
  const output = step.output_snapshot || {};
  const title = step.step_name.replaceAll("_", " ");
  const retrieved = asItems(output.retrieved);
  const picks = asItems(output.recommended_items);

  return (
    <article className="rounded-2xl border border-gw-border-hairline bg-gw-surface-muted p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="capitalize text-[15px] font-semibold text-gw-ink">{title}</h3><span className="flex items-center gap-2"><Status status={step.status} /><span className="font-mono text-[10px] text-gw-text-faint">{step.latency_ms ?? 0}ms</span></span></div>

      {step.step_name === "analyze_interest" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Detail label="Profile summary" value={asText(output.interest_summary)} />
          <Detail label="Retrieval query" value={asText(output.query)} />
          <div className="sm:col-span-2"><div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">Evidence used</div><div className="mt-2 flex flex-wrap gap-2">{asItems(output.evidence).length === 0 && Array.isArray(output.evidence) ? (output.evidence as string[]).map((item) => <span key={item} className="rounded-full border border-gw-agent-border bg-gw-agent-bg px-2.5 py-1 text-[11px] text-gw-agent">{item}</span>) : <span className="text-xs text-gw-text-muted">No evidence snapshot recorded.</span>}</div></div>
        </div>
      )}

      {step.step_name === "retrieve_catalog" && (
        <div className="mt-4"><div className="flex items-center justify-between"><div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">Vector retrieval candidates</div><span className="text-[10px] text-gw-text-faint">lower distance is closer</span></div><div className="mt-2 divide-y divide-gw-border-hairline rounded-xl border border-gw-border-hairline bg-gw-surface">{retrieved.map((item) => { const id = Number(item.product_id); const picked = selectedIds.has(id); return <div key={String(item.product_id)} className="flex items-center justify-between gap-3 px-3 py-2.5"><div><div className="text-[12px] font-medium text-gw-ink">{asText(item.title) || `Course #${id}`}</div><div className="mt-0.5 font-mono text-[10px] text-gw-text-faint">vector distance {Number(item.distance).toFixed(3)}</div></div><span className={`rounded-full px-2 py-0.5 font-mono text-[9px] ${picked ? "bg-gw-agent-bg text-gw-agent" : "bg-gw-surface-muted text-gw-text-faint"}`}>{picked ? "final pick" : "not selected"}</span></div>; })}</div></div>
      )}

      {step.step_name === "evaluate_relevance" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="Decision" value={output.relevance_ok ? "Candidates passed relevance check" : "Candidates did not pass; query was broadened"} /><Detail label="Retry policy" value={`Attempt ${Number(output.retry_count ?? input.retry_count ?? 0)} · threshold-based quality check`} /></div>
      )}

      {step.step_name === "generate_narrative" && (
        <div className="mt-4"><div className="font-mono text-[9px] tracking-[0.12em] uppercase text-gw-text-faint">Final ranked recommendations</div><div className="mt-2 grid gap-2 sm:grid-cols-3">{picks.map((item) => <div key={String(item.product_id)} className="rounded-xl border border-gw-agent-border bg-gw-agent-bg px-3 py-3"><div className="font-mono text-[10px] text-gw-agent">Pick #{String(item.rank)}</div><div className="mt-1 text-[12px] font-semibold text-gw-ink">{asText(item.title) || `Course #${String(item.product_id)}`}</div>{asText(item.reason) && <p className="mt-1 text-[11px] leading-relaxed text-gw-text-muted">{asText(item.reason)}</p>}</div>)}</div><div className="mt-3 font-mono text-[10px] text-gw-text-faint">Narrative generated · {Number(output.narrative_length ?? 0)} characters</div></div>
      )}

      {step.step_name === "store_recommendation" && <div className="mt-4"><Detail label="Stored recommendation" value={output.recommendation_id ? `Recommendation #${String(output.recommendation_id)} is active for the learner.` : "No recommendation was stored."} /></div>}
      {step.error_message && <p className="mt-3 rounded-lg border border-gw-error/30 bg-red-50 px-3 py-2 text-xs text-gw-error">{step.error_message}</p>}
    </article>
  );
}

function MeshRouting({ calls }: { calls: MeshCallLog[] }) {
  return <section className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6"><h2 className="text-lg font-semibold text-gw-ink">Mesh routing</h2><p className="mt-1 text-sm text-gw-text-muted">Actual model, measured token usage, and routing outcome for this run.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{calls.map((call) => <article key={call.id} className="rounded-xl border border-gw-agent-border bg-gw-agent-bg p-4"><div className="flex justify-between gap-3"><Status status={call.status} /><span className="font-mono text-[10px] text-gw-text-faint">{call.latency_ms ?? 0}ms</span></div><div className="mt-3 text-sm font-semibold text-gw-ink">{call.resolved_model || call.requested_model}</div><div className="mt-1 font-mono text-[10px] text-gw-text-muted">requested: {call.requested_model}</div><div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] text-gw-agent"><span>{call.total_tokens ?? 0} tokens</span><span>{call.prompt_tokens ?? 0} input</span><span>{call.completion_tokens ?? 0} output</span>{call.cache_hit && <span>cache hit</span>}{call.routing_fallback && <span>fallback used</span>}</div></article>)}</div>{calls.length === 0 && <p className="mt-4 text-sm text-gw-text-muted">No Mesh calls were captured for this run.</p>}</section>;
}

export default function AdminTracesPage() {
  const { token, allowed, loading: authLoading } = useAdminAccess();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [run, setRun] = useState<AgentRunDetail | null>(null);

  const loadRuns = useCallback(async () => {
    if (!token) return;
    const nextRuns = await agentOpsApi.runs(token, 30);
    setRuns(nextRuns);
    const requested = Number(searchParams.get("run"));
    setSelectedRunId((current) => current ?? (Number.isInteger(requested) && requested > 0 ? requested : nextRuns[0]?.id ?? null));
  }, [searchParams, token]);

  useEffect(() => { const timer = window.setTimeout(() => void loadRuns(), 0); return () => window.clearTimeout(timer); }, [loadRuns]);
  useEffect(() => { if (token && selectedRunId) agentOpsApi.run(token, selectedRunId).then(setRun).catch(() => setRun(null)); }, [selectedRunId, token]);

  const selectedIds = useMemo(() => new Set(asItems(run?.steps.find((step) => step.step_name === "generate_narrative")?.output_snapshot?.recommended_items).map((item) => Number(item.product_id))), [run]);
  if (authLoading || !allowed) return <AdminAccessFallback />;

  return <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9"><AdminPageHeader eyebrow="Growise · Admin console" title="Agent trace explorer" description="Select a recommendation run to see its learner signal, retrieval set, selection decisions, and measured Mesh route." />
    <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]"><aside className="rounded-2xl border border-gw-border-soft bg-gw-surface p-4"><div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-text-faint">Recommendation runs</div><div className="mt-3 flex max-h-[70vh] flex-col gap-2 overflow-auto">{runs.map((item) => <button key={item.id} onClick={() => setSelectedRunId(item.id)} className={`rounded-xl border p-3 text-left ${item.id === selectedRunId ? "border-gw-agent-border bg-gw-agent-bg" : "border-gw-border-hairline hover:bg-gw-surface-muted"}`}><div className="flex justify-between font-mono text-[10px] text-gw-text-faint"><span>run #{item.id}</span><Status status={item.status} /></div><div className="mt-2 text-xs font-semibold text-gw-ink">{item.user_label}</div><p className="mt-1 line-clamp-2 text-[11px] text-gw-text-muted">{item.interest_summary || item.trigger_reason}</p></button>)}</div></aside>
      <div>{run ? <><section className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-primary-text">Recommendation #{run.recommendation_id ?? "—"} · run #{run.id}</div><h2 className="mt-1.5 text-xl font-semibold text-gw-ink">{run.user_label}</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-gw-text-muted">{run.interest_summary}</p></div><span className="font-mono text-xs text-gw-success">● {run.status} · {run.latency_ms ?? 0}ms</span></div></section><section className="mt-6 grid gap-4 lg:grid-cols-2">{run.steps.map((step) => <TraceStepCard key={step.id} step={step} selectedIds={selectedIds} />)}</section><div className="mt-6"><MeshRouting calls={run.mesh_calls} /></div></> : <div className="rounded-2xl border border-dashed border-gw-border p-12 text-center text-sm text-gw-text-muted">Select a recommendation run to inspect it.</div>}</div></div></main>;
}
