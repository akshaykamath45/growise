"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminAccessFallback, useAdminAccess } from "@/components/admin-access";
import { AdminPageHeader } from "@/components/admin-page-header";
import { agentOpsApi } from "@/lib/api";
import type { AgentOpsOverview, AgentRunSummary } from "@/lib/types";

const POLL_INTERVAL_MS = 5_000;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 shadow-[0_1px_2px_rgba(28,30,42,0.04)]">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-text-faint">{label}</div>
      <div className="mt-2 text-[31px] font-semibold tracking-tight text-gw-ink">{value}</div>
      <div className="mt-1 truncate font-mono text-[10px] text-gw-success">{detail}</div>
    </article>
  );
}

export default function AgentOpsPage() {
  const { token, allowed, loading: authLoading } = useAdminAccess();
  const [overview, setOverview] = useState<AgentOpsOverview | null>(null);
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [nextOverview, nextRuns] = await Promise.all([agentOpsApi.overview(token), agentOpsApi.runs(token, 6)]);
      setOverview(nextOverview);
      setRuns(nextRuns);
      setError(null);
    } catch {
      setError("Agent Ops data could not be loaded. Check the admin session and backend service.");
    }
  }, [token]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  if (authLoading || !allowed) return <AdminAccessFallback />;

  const metrics = [
    { label: "Agent runs today", value: String(overview?.agent_runs_today ?? 0), detail: `${overview?.recommendations_today ?? 0} recommendations stored` },
    { label: "Tokens used today", value: formatNumber(overview?.tokens_used_today ?? 0), detail: "measured Mesh usage" },
    { label: "Configured models", value: String(overview?.active_models.length ?? 0), detail: overview?.active_models.join(" · ") || "no calls today" },
    { label: "Average latency", value: `${overview?.avg_latency_ms ?? 0}ms`, detail: `p95 ${overview?.p95_latency_ms ?? 0}ms` },
    { label: "Recommendation clicks", value: `${overview?.recommendation_click_rate ?? 0}%`, detail: `${overview?.recommendation_clicks_today ?? 0} recommendations opened` },
    { label: "Enrollment conversion", value: `${overview?.recommendation_enrollment_rate ?? 0}%`, detail: `${overview?.recommendation_enrollments_today ?? 0} attributed enrollments` },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9">
      <AdminPageHeader
        eyebrow="Growise · Agent Ops"
        title="Recommendation operations"
        description="Measured Mesh routing, agent execution, and recommendation engagement. Data refreshes every five seconds."
        action={<span className="rounded-full border border-gw-agent-border bg-gw-agent-bg px-3 py-1 font-mono text-[10px] tracking-wide text-gw-agent">● live</span>}
      />

      {error && <p className="mt-5 rounded-xl border border-gw-error/30 bg-red-50 px-4 py-3 text-sm text-gw-error">{error}</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Agent Ops summary">
        {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
      </section>

      <section className="mt-6 rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gw-ink">Recent recommendation runs</h2>
            <p className="mt-1 text-sm text-gw-text-muted">Open a run to inspect signal, retrieval candidates, final picks, and Mesh routing.</p>
          </div>
          <Link href="/admin/traces" className="text-sm font-semibold text-gw-primary no-underline hover:underline">Open trace explorer →</Link>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <Link key={run.id} href={`/admin/traces?run=${run.id}`} className="rounded-xl border border-gw-border-hairline bg-gw-surface-muted p-4 no-underline transition-colors hover:border-gw-agent-border hover:bg-gw-agent-bg">
              <div className="flex items-center justify-between gap-3 font-mono text-[10px] text-gw-text-faint"><span>run #{run.id}</span><span className={run.status === "completed" ? "text-gw-success" : "text-gw-error"}>● {run.status}</span></div>
              <div className="mt-2 text-sm font-semibold text-gw-ink">{run.user_label}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gw-text-muted">{run.interest_summary || run.trigger_reason}</p>
              <div className="mt-3 font-mono text-[10px] text-gw-agent">{run.latency_ms ?? 0}ms · recommendation #{run.recommendation_id ?? "—"}</div>
            </Link>
          ))}
          {runs.length === 0 && <p className="py-8 text-sm text-gw-text-muted">No agent runs have been recorded yet.</p>}
        </div>
      </section>
    </main>
  );
}
