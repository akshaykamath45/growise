# Growise

A course marketplace where a backend agent watches how you browse, retrieves matching courses from a
vector store, and writes a short, honest, persuasive recommendation grounded in what you actually did —
not a generic "related products" list.

Built for the SmartReco hackathon challenge.

## What's here

- **Behavioral tracking** that batches events client-side and never blocks the page.
- **Dual-write product catalog** — every course write goes to SQLite and Chroma in the same request.
- **A LangGraph agent** that reasons over a user's activity, retrieves grounded candidates, checks
  retrieval quality, and generates persuasive copy through Mesh API.
- **Efficient triggering** — the agent only re-runs when there's enough new signal and a cooldown has
  passed; otherwise the last recommendation is served from cache.

## Architecture

```
frontend/  Next.js 16 (App Router) + Tailwind — server-rendered pages, calls the backend as a JSON API
backend/   FastAPI + SQLAlchemy (SQLite) + Chroma (vector store) + LangGraph agent
```

The two are separate services on purpose: the hackathon spec requires a Python web framework for the
agent/backend logic, so the frontend is a thin JSON API consumer rather than doing any of that work
itself. Auth is JWT bearer tokens (not cookies), since the two run on different origins in dev.

### Data model

- `users` — email/password (bcrypt), role (`user`/`admin`), tracking opt-in
- `products` — the course catalog, with a `vector_synced` flag so the admin UI shows the real dual-write
  status instead of assuming success
- `events` — behavioral events (`product_view`, `search`, `course_card_click`, `enroll_click`,
  `time_on_page`), batch-inserted
- `recommendations` / `recommendation_items` — the agent's output, versioned (old ones marked inactive
  rather than overwritten)

### Dual-write

`ProductService` (`backend/app/services/product_service.py`) writes to SQLite first, then upserts the
embedding + metadata to Chroma using Chroma's built-in local `all-MiniLM-L6-v2` embedding function (ONNX,
no GPU/torch dependency, no external embedding API calls or quota). If the vector write fails, the SQL
row is still saved with `vector_synced=false` so it can be retried, rather than losing the product or
silently pretending it's searchable.

### Behavioral tracking

`frontend/src/lib/tracker.ts` queues events in memory and flushes every 5s or every 20 events via a
normal `fetch`. On tab-hide/unload it flushes with `fetch(..., { keepalive: true })` — the modern
replacement for `navigator.sendBeacon` that (unlike `sendBeacon`) supports the `Authorization` header our
JWT auth needs. Nothing here blocks user interaction; a dropped batch is just dropped, not retried.

High-frequency signals are deliberately *not* tracked raw (no per-scroll or per-mousemove events). Time
on page is captured once per visit, computed on unmount/hide rather than sampled continuously.

### The agent (`backend/app/agent/pipeline.py`)

A LangGraph graph, one compiled instance per request:

```
ingest_activity → retrieve → grade_relevance → (retrieve again if weak) → generate_narrative → persist
```

- **ingest_activity** — reads the user's recent meaningful events, builds a category/search/viewed-title
  summary and a set of evidence chips.
- **retrieve** — semantic search against Chroma using that summary as the query.
- **grade_relevance** — heuristic check on retrieval distance; if the best match is weak, loops back with
  a broadened query once before giving up and proceeding anyway (bounded retries, no infinite loop).
- **generate_narrative** — one Mesh API call (via `langchain_openai.ChatOpenAI` pointed at Mesh's
  OpenAI-compatible endpoint) with the retrieved candidates as the *only* allowed source of products.
  Returned product IDs are validated against the candidate set before anything is persisted, so the agent
  cannot recommend a course it made up.
- **persist** — writes the new recommendation, marks the previous one inactive.

### Efficiency (`backend/app/agent/trigger.py`)

The agent is not called on every event. `should_regenerate()` gates on:

- at least one meaningful event ever (otherwise: no recommendation yet, no LLM call)
- enough *new* meaningful events since the last recommendation (`RECOMMENDATION_MIN_NEW_EVENTS`, default 5)
- a cooldown window since the last generation (`RECOMMENDATION_COOLDOWN_MINUTES`, default 10)

`GET /api/recommendations/me` serves the cached recommendation unless both conditions are met. The
explicit "Refresh" button in the UI bypasses the event-count/cooldown gate (it's a deliberate user
action) but still requires at least some activity to exist.

## Setup

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in MESH_API_KEY
python seed.py         # creates admin@growise.dev / AdminPass123 and seeds ~42 courses
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000, expects the backend on :8000 (see .env.local)
```

## Bonus features implemented

- ⭐ **Structured agent framework** — LangGraph, as described above (not a single prompt-and-done call).
- ⭐ **Observability** — every Mesh call goes through `langchain_openai.ChatOpenAI`, so setting
  `LANGCHAIN_TRACING_V2=true` / `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` in `.env` gets the whole agent
  graph traced in LangSmith with zero code changes.

Not implemented (out of scope for the time available): scheduled email digest, retrieval re-ranking
beyond the relevance-grading retry loop.

## Notable product decisions

- **Two-step inline delete confirmation** in the admin UI instead of `window.confirm()` — same safety
  property, doesn't rely on a native dialog.
- **Consent is explicit at signup** — a checkbox ("Let the Growise agent learn from what I browse") ties
  directly to the backend's `tracking_opt_in` flag; opted-out users' events are accepted but not queued
  client-side, and the recommendation trigger never fires for them.
- **Course descriptions are real prose**, not lorem ipsum — retrieval quality and narrative quality both
  depend on the catalog actually having something to say.
