import Link from "next/link";
import type { Metadata } from "next";
import { productsApi } from "@/lib/api";
import { CourseCard } from "@/components/course-card";

export const metadata: Metadata = {
  title: "Course catalog",
  description: "Browse career-building courses across AI, web development, design, cloud, cybersecurity, and data science.",
  alternates: { canonical: "/courses" },
};

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const PRICE_RANGES = [
  { label: "Under $50", min: undefined, max: 49.99 },
  { label: "$50 – $75", min: 50, max: 75 },
  { label: "$75+", min: 75, max: undefined },
];
const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Most popular", value: "popular" },
  { label: "Highest rated", value: "rating" },
  { label: "Price: low to high", value: "price_low" },
];

type Search = { [key: string]: string | string[] | undefined };

function queryValues(value: string | string[] | undefined) {
  return typeof value === "string" ? [value] : value ?? [];
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const selectedCategories = queryValues(sp.category);
  const selectedLevels = queryValues(sp.level);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const min_price = typeof sp.min_price === "string" ? Number(sp.min_price) : undefined;
  const max_price = typeof sp.max_price === "string" ? Number(sp.max_price) : undefined;
  const sort = typeof sp.sort === "string" && SORT_OPTIONS.some((option) => option.value === sp.sort)
    ? sp.sort
    : "recommended";

  const [products, categories] = await Promise.all([
    productsApi.list({
      category: selectedCategories.length ? selectedCategories : undefined,
      level: selectedLevels.length ? selectedLevels : undefined,
      q,
      min_price,
      max_price,
      limit: 48,
    }),
    productsApi.categories(),
  ]);

  function withParams(changes: Record<string, string | string[] | undefined>) {
    const params = new URLSearchParams();
    const values: Record<string, string | string[] | undefined> = {
      category: selectedCategories.length ? selectedCategories : undefined,
      level: selectedLevels.length ? selectedLevels : undefined,
      q,
      min_price: min_price === undefined ? undefined : String(min_price),
      max_price: max_price === undefined ? undefined : String(max_price),
      sort: sort === "recommended" ? undefined : sort,
      ...changes,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value) {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    return qs ? `/courses?${qs}` : "/courses";
  }

  const activeFilterCount = [selectedCategories.length > 0, selectedLevels.length > 0, min_price !== undefined || max_price !== undefined].filter(Boolean).length;
  const activeSort = SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0];
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "popular") return b.reviews_count - a.reviews_count;
    if (sort === "rating") return b.rating - a.rating || b.reviews_count - a.reviews_count;
    if (sort === "price_low") return a.price - b.price;
    return b.rating - a.rating || b.reviews_count - a.reviews_count;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-7">
      <div className="flex items-end justify-between gap-5">
        <div>
          <h1 className="font-serif text-[36px] font-semibold tracking-tight leading-none text-gw-ink">
            {q
              ? "Search results"
              : selectedCategories.length === 1
                ? selectedCategories[0]
                : "All courses"}
          </h1>
          <div className="mt-2 text-[14px] text-gw-text-muted">
            {products.length} course{products.length === 1 ? "" : "s"}
            {q && <> for &ldquo;{q}&rdquo;</>}
          </div>
        </div>
        <details className="group relative mb-0.5 shrink-0">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-[8px] border border-gw-border-soft bg-gw-surface px-3 text-[13px] font-medium text-gw-text marker:content-none hover:border-gw-primary-border">
            <span className="font-mono text-[10px] tracking-wide uppercase text-gw-text-faint">Sort</span>
            {activeSort.label}
            <span className="text-gw-text-faint transition-transform group-open:rotate-180" aria-hidden>⌄</span>
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-gw-border-soft bg-gw-surface p-1.5 shadow-[0_12px_28px_-12px_rgba(28,30,42,0.22)]">
            {SORT_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={withParams({ sort: option.value === "recommended" ? undefined : option.value })}
                className={`block rounded-lg px-3 py-2 text-[13px] no-underline hover:no-underline ${
                  sort === option.value ? "bg-gw-primary-soft font-semibold text-gw-primary-text" : "text-gw-text hover:bg-gw-surface-muted"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={withParams({ category: undefined })}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium no-underline hover:no-underline ${
            selectedCategories.length === 0 ? "border-gw-primary bg-gw-primary text-white" : "border-gw-border-soft bg-gw-surface text-gw-text hover:border-gw-primary-border"
          }`}
        >
          All
        </Link>
        {categories.map((item) => (
          <Link
            key={item}
            href={withParams({ category: toggleValue(selectedCategories, item) })}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium no-underline hover:no-underline ${
              selectedCategories.includes(item) ? "border-gw-primary bg-gw-primary text-white" : "border-gw-border-soft bg-gw-surface text-gw-text hover:border-gw-primary-border hover:text-gw-primary-text"
            }`}
          >
            {item}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gw-border-soft bg-gw-surface p-5 shadow-[0_8px_24px_-20px_rgba(28,30,42,0.35)] lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
          <div className="mb-5 flex items-center justify-between">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">Filters</div>
            {activeFilterCount > 0 && <span className="rounded-full bg-gw-primary-soft px-2 py-0.5 font-mono text-[10px] text-gw-primary-text">{activeFilterCount}</span>}
          </div>
          <div className="mb-5">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              Category
            </div>
            <div className="flex flex-col gap-1">
              {categories.map((c) => (
                <Link
                  key={c}
                  href={withParams({ category: toggleValue(selectedCategories, c) })}
                  role="checkbox"
                  aria-checked={selectedCategories.includes(c)}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] no-underline hover:no-underline ${
                    selectedCategories.includes(c) ? "bg-gw-primary-soft font-medium text-gw-primary-text" : "text-gw-text hover:bg-gw-surface-muted"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] ${selectedCategories.includes(c) ? "border-gw-primary bg-gw-primary text-white" : "border-gw-border bg-gw-surface text-transparent"}`}>✓</span>
                  {c}
                </Link>
              ))}
            </div>
          </div>
          <div className="h-px bg-gw-border-hairline mb-5" />
          <div className="mb-5">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              Level
            </div>
            <div className="flex flex-col gap-1">
              {LEVELS.map((l) => (
                <Link
                  key={l}
                  href={withParams({ level: toggleValue(selectedLevels, l) })}
                  role="checkbox"
                  aria-checked={selectedLevels.includes(l)}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] no-underline hover:no-underline ${
                    selectedLevels.includes(l) ? "bg-gw-primary-soft font-medium text-gw-primary-text" : "text-gw-text hover:bg-gw-surface-muted"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] ${selectedLevels.includes(l) ? "border-gw-primary bg-gw-primary text-white" : "border-gw-border bg-gw-surface text-transparent"}`}>✓</span>
                  {l}
                </Link>
              ))}
            </div>
          </div>
          <div className="h-px bg-gw-border-hairline mb-5" />
          <div>
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              Price
            </div>
            <div className="flex flex-col gap-1">
              {PRICE_RANGES.map((price) => {
                const selected = min_price === price.min && max_price === price.max;
                return (
                <Link
                  key={price.label}
                  href={withParams(selected ? { min_price: undefined, max_price: undefined } : { min_price: price.min === undefined ? undefined : String(price.min), max_price: price.max === undefined ? undefined : String(price.max) })}
                  role="radio"
                  aria-checked={selected}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] no-underline hover:no-underline ${
                    selected ? "bg-gw-primary-soft font-medium text-gw-primary-text" : "text-gw-text hover:bg-gw-surface-muted"
                  }`}
                >
                  <span className={`h-4 w-4 shrink-0 rounded-full border-[5px] ${selected ? "border-gw-primary bg-gw-surface" : "border-gw-border bg-gw-surface"}`} />
                  {price.label}
                </Link>
                );
              })}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <Link
              href={withParams({ category: undefined, level: undefined, min_price: undefined, max_price: undefined })}
              className="mt-5 flex h-9 items-center justify-center rounded-[8px] border border-gw-border text-[12.5px] font-medium text-gw-text no-underline hover:border-gw-primary-border hover:text-gw-primary-text"
            >
              Clear filters
            </Link>
          )}
        </aside>

        <div>
          {sortedProducts.length === 0 ? (
            <div className="border border-dashed border-gw-border rounded-2xl bg-gw-surface p-14 text-center">
              <p className="font-serif text-lg text-gw-text-muted max-w-[36ch] mx-auto">
                No courses match these filters yet. Try clearing one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((p) => (
                <CourseCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
