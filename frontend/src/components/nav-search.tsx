"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadCourseIndex, popularCourses, searchCourses } from "@/lib/course-search";
import { track } from "@/lib/tracker";
import type { Product } from "@/lib/types";

// Platform detection read through useSyncExternalStore so it stays hydration-safe
// without syncing browser state into React state via an effect.
const noopSubscribe = () => () => {};
const getIsMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const getIsMacOnServer = () => false;

function SearchIcon() {
  return (
    <span
      aria-hidden
      className="relative h-[11px] w-[11px] shrink-0 rounded-full border-[1.5px] border-gw-text-placeholder after:absolute after:-right-1 after:-bottom-0.5 after:h-[1.5px] after:w-[5px] after:rotate-45 after:rounded-full after:bg-gw-text-placeholder"
    />
  );
}

export function NavSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [courses, setCourses] = useState<Product[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const isMac = useSyncExternalStore(noopSubscribe, getIsMac, getIsMacOnServer);
  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the box in step with the URL (e.g. landing on /courses?q=security)
  // via a render-phase adjustment rather than an effect.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setQuery(urlQuery);
  }

  // ⌘K / Ctrl+K focuses the field from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const ensureIndex = useCallback(() => {
    if (courses !== null) return;
    loadCourseIndex()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [courses]);

  const trimmed = query.trim();
  const results = useMemo(
    () => (courses && trimmed ? searchCourses(courses, trimmed) : []),
    [courses, trimmed]
  );
  const popular = useMemo(
    () => (courses && !trimmed ? popularCourses(courses) : []),
    [courses, trimmed]
  );

  const suggestions = trimmed ? results : popular;
  const showDropdown = open && (suggestions.length > 0 || (trimmed.length > 0 && courses !== null));

  const goToCourse = useCallback(
    (product: Product) => {
      setOpen(false);
      track({ event_type: "search_result_click", product_id: product.id, search_query: trimmed || null });
      router.push(`/courses/${product.id}`);
    },
    [router, trimmed]
  );

  const goToResults = useCallback(() => {
    setOpen(false);
    if (trimmed) track({ event_type: "search", search_query: trimmed });
    router.push(trimmed ? `/courses?q=${encodeURIComponent(trimmed)}` : "/courses");
  }, [router, trimmed]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
      if (picked) goToCourse(picked);
      else goToResults();
    }
  }

  const listboxId = "nav-search-listbox";

  return (
    <div ref={containerRef} className="relative w-full max-w-[460px]">
      <div
        className={`flex h-9 items-center gap-2.5 rounded-[9px] border px-3 transition-colors ${
          focused
            ? "border-gw-primary-border bg-gw-surface"
            : "border-gw-border-soft bg-gw-surface-muted hover:bg-gw-surface"
        }`}
      >
        <SearchIcon />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setOpen(true);
            ensureIndex();
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            ensureIndex();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search courses"
          aria-label="Search courses"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `nav-search-option-${activeIndex}` : undefined}
          className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-gw-text-placeholder"
        />
        {!focused && !query && (
          <kbd className="hidden shrink-0 rounded border border-gw-border-soft bg-gw-surface px-1.5 py-0.5 font-mono text-[10px] text-gw-text-placeholder lg:inline-block">
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-gw-border-soft bg-gw-surface shadow-[0_16px_32px_-12px_rgba(28,30,42,0.22)]">
          {suggestions.length > 0 ? (
            <>
              <div className="px-3.5 pt-3 pb-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase text-gw-text-faint">
                {trimmed ? "Courses" : "Popular right now"}
              </div>
              <ul id={listboxId} role="listbox" className="pb-1.5">
                {suggestions.map((product, i) => (
                  <li key={product.id} role="none">
                    <button
                      id={`nav-search-option-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToCourse(product)}
                      className={`block w-full cursor-pointer border-0 px-3.5 py-2 text-left ${
                        i === activeIndex ? "bg-gw-surface-muted" : "bg-transparent"
                      }`}
                    >
                      <div className="text-[13.5px] font-medium leading-snug text-gw-ink">
                        {product.title}
                      </div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-gw-text-faint">
                        {product.level} · {product.category} · {product.duration_label}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToResults}
                className="w-full cursor-pointer border-0 border-t border-gw-border-hairline bg-transparent px-3.5 py-2.5 text-left text-[12.5px] font-medium text-gw-primary hover:bg-gw-surface-muted"
              >
                {trimmed ? "View all results →" : "Browse all courses →"}
              </button>
            </>
          ) : (
            <div className="px-3.5 py-4">
              <div className="text-[13.5px] font-medium text-gw-ink">
                No courses found for &ldquo;{trimmed}&rdquo;
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-gw-text-muted">
                Try a course, category, or skill.
              </p>
              <button
                type="button"
                onClick={goToResults}
                className="mt-2.5 cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-medium text-gw-primary"
              >
                Browse all courses →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
