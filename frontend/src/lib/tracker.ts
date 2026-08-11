"use client";

import { API_URL } from "./api";
import type { EventInput } from "./api";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 20;

let queue: EventInput[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function setTrackerToken(token: string | null) {
  currentToken = token;
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/** Queue a behavioral event. Never blocks the caller — batched and flushed async. */
export function track(event: Omit<EventInput, "client_ts">) {
  if (!currentToken) return;
  queue.push({ ...event, client_ts: new Date().toISOString() });
  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

/** Flush the queue. `keepalive` lets the request outlive page unload. */
export function flush(keepalive = false) {
  if (queue.length === 0 || !currentToken) return Promise.resolve();
  const batch = queue;
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return fetch(`${API_URL}/api/events/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken}`,
    },
    body: JSON.stringify({ events: batch }),
    keepalive,
  }).catch(() => {
    // Best-effort — drop the batch rather than retry-loop and pile up events.
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}
