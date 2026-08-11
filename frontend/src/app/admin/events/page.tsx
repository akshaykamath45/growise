"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessFallback, useAdminAccess } from "@/components/admin-access";
import { AdminPageHeader } from "@/components/admin-page-header";
import { agentOpsApi } from "@/lib/api";
import type { AgentOpsEvent } from "@/lib/types";

const EVENT_TYPES = ["product_view", "time_on_page", "search", "search_result_click", "course_card_click", "recommendation_click", "enroll_click"];
const PAGE_SIZE = 10;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminEventsPage() {
  const { token, allowed, loading: authLoading } = useAdminAccess();
  const [events, setEvents] = useState<AgentOpsEvent[]>([]);
  const [eventType, setEventType] = useState("");
  const [userId, setUserId] = useState("");
  const [productId, setProductId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const nextEvents = await agentOpsApi.events(token, {
        event_type: eventType || undefined,
        user_id: userId ? Number(userId) : undefined,
        product_id: productId ? Number(productId) : undefined,
        query: query || undefined,
      });
      setEvents(nextEvents);
      setError(null);
    } catch {
      setError("The event stream could not be loaded.");
    }
  }, [eventType, productId, query, token, userId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 5_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  const learners = useMemo(() => [...new Map(events.map((event) => [event.user_id, event.user_label])).entries()], [events]);
  const courses = useMemo(
    () => [...new Map(events.filter((event) => event.product_id && event.product_title).map((event) => [event.product_id!, event.product_title!])).entries()],
    [events]
  );
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEvents = useMemo(() => events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [currentPage, events]);
  const firstEvent = events.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastEvent = Math.min(currentPage * PAGE_SIZE, events.length);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  if (authLoading || !allowed) return <AdminAccessFallback />;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9">
      <AdminPageHeader
        eyebrow="Growise · Admin console"
        title="Live event stream"
        description="Consented learner behavior that drives recommendation runs. Learner emails are visible only inside this admin-only console."
        action={<span className="rounded-full border border-gw-agent-border bg-gw-agent-bg px-3 py-1 font-mono text-[10px] tracking-wide text-gw-agent">● refreshing every 5s</span>}
      />

      <section className="mt-6 rounded-2xl border border-gw-border-soft bg-gw-surface p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-medium text-gw-text-muted">Event type
            <select value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1); }} className="mt-1.5 h-10 w-full rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-sm text-gw-ink">
              <option value="">All events</option>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gw-text-muted">Learner
            <select value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }} className="mt-1.5 h-10 w-full rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-sm text-gw-ink">
              <option value="">All learners</option>
              {learners.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gw-text-muted">Course
            <select value={productId} onChange={(event) => { setProductId(event.target.value); setPage(1); }} className="mt-1.5 h-10 w-full rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-sm text-gw-ink">
              <option value="">All courses</option>
              {courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gw-text-muted xl:col-span-2">Course or search query
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Filter by title or search…" className="mt-1.5 h-10 w-full rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-sm text-gw-ink placeholder:text-gw-text-placeholder" />
          </label>
        </div>
      </section>

      {error && <p className="mt-4 rounded-xl border border-gw-error/30 bg-red-50 px-4 py-3 text-sm text-gw-error">{error}</p>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface">
        <div className="flex items-baseline justify-between border-b border-gw-border-hairline px-5 py-4"><div><h2 className="font-semibold text-gw-ink">Observed activity</h2><p className="mt-0.5 text-xs text-gw-text-muted">{events.length} matching events</p></div><span className="font-mono text-[10px] text-gw-success">● live</span></div>
        <div className="overflow-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-gw-surface-muted font-mono text-[10px] tracking-wide uppercase text-gw-text-faint"><tr><th className="px-5 py-3 font-normal">Time</th><th className="px-3 py-3 font-normal">Learner</th><th className="px-3 py-3 font-normal">Event</th><th className="px-3 py-3 font-normal">Course / query</th><th className="px-3 py-3 font-normal">Dwell</th><th className="px-3 py-3 font-normal">Attribution</th></tr></thead>
            <tbody>
              {visibleEvents.map((event) => (
                <tr key={event.id} className="border-t border-gw-border-hairline hover:bg-gw-surface-muted">
                  <td className="px-5 py-3 font-mono text-[11px] text-gw-text-faint">{formatTime(event.created_at)}</td>
                  <td className="px-3 py-3 text-[12px] font-medium text-gw-text">{event.user_label}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-gw-agent">{event.event_type}</td>
                  <td className="px-3 py-3 text-[12px] text-gw-text-muted">{event.detail}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-gw-text-muted">{event.dwell_seconds ? `${event.dwell_seconds}s` : "—"}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-gw-text-faint">{event.recommendation_id ? `rec #${event.recommendation_id}` : "—"}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gw-text-muted">No events match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {events.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gw-border-hairline px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-gw-text-muted">Showing <span className="font-medium text-gw-ink">{firstEvent}–{lastEvent}</span> of {events.length} events</p>
            <nav className="flex items-center gap-1.5" aria-label="Event pagination">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-[12px] font-medium text-gw-text transition-colors hover:border-gw-primary-border hover:text-gw-primary-text disabled:cursor-default disabled:opacity-40">Previous</button>
              {pageNumbers.map((pageNumber, index) => (
                <span key={pageNumber} className="contents">
                  {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && <span className="px-1 text-xs text-gw-text-faint" aria-hidden="true">…</span>}
                  <button type="button" onClick={() => setPage(pageNumber)} aria-current={currentPage === pageNumber ? "page" : undefined} className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[12px] font-semibold transition-colors ${currentPage === pageNumber ? "bg-gw-primary-soft text-gw-primary-text" : "text-gw-text-muted hover:bg-gw-surface-muted hover:text-gw-ink"}`}>{pageNumber}</button>
                </span>
              ))}
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 rounded-lg border border-gw-border-soft bg-gw-surface px-3 text-[12px] font-medium text-gw-text transition-colors hover:border-gw-primary-border hover:text-gw-primary-text disabled:cursor-default disabled:opacity-40">Next</button>
            </nav>
          </div>
        )}
      </section>
    </main>
  );
}
