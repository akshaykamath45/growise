import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, productsApi } from "@/lib/api";
import { TrackProductView } from "@/components/track-product-view";
import { EnrollPanel } from "@/components/enroll-panel";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (Number.isNaN(productId)) notFound();

  let product;
  try {
    product = await productsApi.get(productId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const tags = product.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      <TrackProductView productId={product.id} category={product.category} />

      <div className="font-mono text-[10.5px] tracking-wide text-gw-text-faint flex gap-2 items-center">
        <Link href="/courses" className="text-gw-text-faint no-underline hover:no-underline hover:text-gw-text">
          CATALOG
        </Link>
        <span className="text-gw-border">/</span>
        <Link
          href={`/courses?category=${encodeURIComponent(product.category)}`}
          className="text-gw-text-faint no-underline hover:no-underline hover:text-gw-text"
        >
          {product.category.toUpperCase()}
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_372px] gap-10 mt-6 items-start">
        <div>
          <div className="flex gap-2.5 items-center flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-gw-primary-soft text-gw-primary-hover font-mono text-[10px] tracking-wider uppercase">
              {product.category}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gw-border-hairline text-gw-text-muted font-mono text-[10px] tracking-wider uppercase">
              {product.level}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight leading-tight">{product.title}</h1>
          <p className="mt-3.5 text-[17px] leading-relaxed text-gw-text max-w-[64ch]">{product.description}</p>

          <div className="mt-5 flex items-center gap-3.5 flex-wrap text-sm">
            <span className="font-medium">{product.instructor}</span>
            <span className="text-gw-border">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-gw-agent-accent text-sm tracking-[-1px]">★★★★★</span>
              <span className="font-semibold">{product.rating.toFixed(1)}</span>
              <span className="font-mono text-[11.5px] text-gw-text-placeholder">
                ({product.reviews_count.toLocaleString()} REVIEWS)
              </span>
            </span>
            <span className="text-gw-border">·</span>
            <span className="font-mono text-[11.5px] text-gw-text-faint tracking-wide">
              {product.duration_label} · {product.lessons_count} LESSONS
            </span>
          </div>

          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full border border-gw-border-soft text-gw-text-muted text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <EnrollPanel product={product} />
      </div>
    </div>
  );
}
