import Link from "next/link";
import { productsApi } from "@/lib/api";
import { CourseCard } from "@/components/course-card";
import { FilterChip } from "@/components/filter-chip";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const PRICE_CAPS = [
  { label: "Under $50", value: 50 },
  { label: "Under $75", value: 75 },
];

type Search = { [key: string]: string | string[] | undefined };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const level = typeof sp.level === "string" ? sp.level : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const max_price = typeof sp.max_price === "string" ? Number(sp.max_price) : undefined;

  const [products, categories] = await Promise.all([
    productsApi.list({ category, level, q, max_price, limit: 48 }),
    productsApi.categories(),
  ]);

  function withParam(key: string, value: string | undefined) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (level) params.set("level", level);
    if (q) params.set("q", q);
    if (max_price) params.set("max_price", String(max_price));
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    return qs ? `/courses?${qs}` : "/courses";
  }

  const activeFilterCount = [category, level, max_price].filter(Boolean).length;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-9">
      <div className="flex items-end gap-5 mb-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {category ?? "All courses"}
          </h1>
          <div className="mt-2 text-[15px] text-gw-text-muted">
            {products.length} course{products.length === 1 ? "" : "s"}
            {q && <> matching &ldquo;{q}&rdquo;</>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-6">
        {category && (
          <FilterChip href={withParam("category", undefined)} active>
            {category} ×
          </FilterChip>
        )}
        {level && (
          <FilterChip href={withParam("level", undefined)} active>
            {level} ×
          </FilterChip>
        )}
        {max_price && (
          <FilterChip href={withParam("max_price", undefined)} active>
            Under ${max_price} ×
          </FilterChip>
        )}
        {activeFilterCount > 0 && (
          <Link
            href={q ? `/courses?q=${encodeURIComponent(q)}` : "/courses"}
            className="text-xs font-medium text-gw-primary no-underline hover:no-underline ml-1"
          >
            Clear all ({activeFilterCount})
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[264px_1fr] gap-6 items-start">
        <aside className="bg-gw-surface border border-gw-border-soft rounded-2xl p-5">
          <div className="mb-6">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              Category
            </div>
            <div className="flex flex-col gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c}
                  href={withParam("category", category === c ? undefined : c)}
                  className={`text-sm no-underline hover:no-underline ${
                    category === c ? "font-semibold text-gw-primary" : "text-gw-text hover:text-gw-ink"
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
          <div className="h-px bg-gw-border-hairline mb-5" />
          <div className="mb-6">
            <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint mb-3">
              Level
            </div>
            <div className="flex flex-col gap-2.5">
              {LEVELS.map((l) => (
                <Link
                  key={l}
                  href={withParam("level", level === l ? undefined : l)}
                  className={`text-sm no-underline hover:no-underline ${
                    level === l ? "font-semibold text-gw-primary" : "text-gw-text hover:text-gw-ink"
                  }`}
                >
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
            <div className="flex flex-col gap-2.5">
              {PRICE_CAPS.map((p) => (
                <Link
                  key={p.value}
                  href={withParam("max_price", max_price === p.value ? undefined : String(p.value))}
                  className={`text-sm no-underline hover:no-underline ${
                    max_price === p.value ? "font-semibold text-gw-primary" : "text-gw-text hover:text-gw-ink"
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="border border-dashed border-gw-border rounded-2xl bg-gw-surface p-14 text-center">
              <p className="font-serif text-lg text-gw-text-muted max-w-[36ch] mx-auto">
                No courses match these filters yet. Try clearing one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {products.map((p) => (
                <CourseCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
