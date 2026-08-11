"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAccessFallback, useAdminAccess } from "@/components/admin-access";
import { AdminPageHeader } from "@/components/admin-page-header";
import { agentOpsApi } from "@/lib/api";
import type { CatalogHealth } from "@/lib/types";

function HealthMetric({ label, value, tone = "text-gw-ink" }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-xl border border-gw-border-hairline bg-gw-surface-muted p-4"><div className="text-2xl font-semibold tracking-tight text-gw-ink">{value}</div><div className={`mt-1 font-mono text-[10px] tracking-[0.1em] uppercase ${tone}`}>{label}</div></div>;
}

export default function CatalogHealthPage() {
  const { token, allowed, loading: authLoading } = useAdminAccess();
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setHealth(await agentOpsApi.catalogHealth(token));
  }, [token]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function retry() {
    if (!token) return;
    setRetrying(true);
    setMessage(null);
    try {
      const result = await agentOpsApi.retryCatalogSync(token);
      setHealth(result);
      setMessage(result.retried_courses ? `${result.retried_courses} course${result.retried_courses === 1 ? "" : "s"} re-synced successfully.` : "Nothing required a retry.");
    } catch {
      setMessage("Retry could not complete. Check the vector store connection and try again.");
    } finally {
      setRetrying(false);
    }
  }

  if (authLoading || !allowed) return <AdminAccessFallback />;
  const attention = (health?.pending_sync_courses ?? 0) + (health?.failed_sync_courses ?? 0);

  return <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9"><AdminPageHeader eyebrow="Growise · Admin console" title="Catalog health" description="The catalog is dual-written to SQL and the retrieval store. Use retry only for courses that did not reach vector search." action={<span className={`rounded-full border px-3 py-1 font-mono text-[10px] tracking-wide ${attention === 0 ? "border-gw-agent-border bg-gw-agent-bg text-gw-success" : "border-gw-error/30 bg-red-50 text-gw-error"}`}>● {attention === 0 ? "healthy" : "attention needed"}</span>} />
    <section className="mt-6 rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-gw-ink">Retrieval readiness</h2><p className="mt-1 text-sm text-gw-text-muted">A course is ready only after its vector upsert succeeds.</p></div><button onClick={retry} disabled={retrying || attention === 0} className="h-10 rounded-lg bg-gw-primary px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-50">{retrying ? "Retrying…" : "Retry unsynced courses"}</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><HealthMetric label="Total courses" value={health?.total_courses ?? 0} /><HealthMetric label="Vector synced" value={health?.synced_courses ?? 0} tone="text-gw-success" /><HealthMetric label="Pending sync" value={health?.pending_sync_courses ?? 0} tone={health?.pending_sync_courses ? "text-gw-error" : "text-gw-success"} /><HealthMetric label="Failed syncs" value={health?.failed_sync_courses ?? 0} tone={health?.failed_sync_courses ? "text-gw-error" : "text-gw-success"} /><HealthMetric label="Retrieval coverage" value={`${health?.retrieval_coverage_percent ?? 0}%`} tone="text-gw-agent" /></div>{message && <p className={`mt-5 rounded-xl border px-4 py-3 text-sm ${message.includes("could not") ? "border-gw-error/30 bg-red-50 text-gw-error" : "border-gw-agent-border bg-gw-agent-bg text-gw-success"}`}>{message}</p>}</section>
    <section className="mt-6 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5"><h3 className="font-semibold text-gw-ink">What “synced” means</h3><p className="mt-2 text-sm leading-relaxed text-gw-text-muted">The course is present in SQL and has been upserted into the vector collection, so it is eligible for semantic retrieval.</p></article><article className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5"><h3 className="font-semibold text-gw-ink">Pending vs failed</h3><p className="mt-2 text-sm leading-relaxed text-gw-text-muted">Pending courses have not been synced yet. Failed courses retain their latest sync error internally and can be retried safely.</p></article><article className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5"><h3 className="font-semibold text-gw-ink">Operational guardrail</h3><p className="mt-2 text-sm leading-relaxed text-gw-text-muted">Retries only target unsynced rows. Healthy courses are never re-embedded by this action.</p></article></section>
  </main>;
}
