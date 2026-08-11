import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { API_URL, ApiError, productsApi } from "@/lib/api";
import { TrackProductView } from "@/components/track-product-view";
import { EnrollPanel } from "@/components/enroll-panel";
import { CourseCurriculum } from "@/components/course-curriculum";
import { YourSignal } from "@/components/your-signal";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const productId = Number(id);
  if (Number.isNaN(productId)) return { title: "Course not found", robots: { index: false, follow: false } };

  try {
    const product = await productsApi.get(productId);
    const image = product.image_url ? `${API_URL}${product.image_url}` : "/opengraph-image";
    return {
      title: product.title,
      description: product.description,
      alternates: { canonical: `/courses/${product.id}` },
      openGraph: {
        type: "website",
        title: product.title,
        description: product.description,
        images: [{ url: image, alt: product.title }],
      },
      twitter: { card: "summary_large_image", title: product.title, description: product.description, images: [image] },
    };
  } catch {
    return { title: "Course not found", robots: { index: false, follow: false } };
  }
}

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
    <div className="mx-auto max-w-[1180px] px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-16">
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

      <div className="mt-5 grid grid-cols-1 items-start gap-8 sm:mt-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_372px]">
        <div>
          <div className="flex gap-2.5 items-center flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-gw-primary-soft text-gw-primary-text font-mono text-[10px] tracking-wider uppercase">
              {product.category}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gw-border-hairline text-gw-text-muted font-mono text-[10px] tracking-wider uppercase">
              {product.level}
            </span>
          </div>
          <h1 className="mt-4 font-serif text-[32px] font-semibold leading-tight tracking-tight text-gw-ink sm:text-4xl">{product.title}</h1>
          <p className="mt-3.5 max-w-[64ch] text-[16px] leading-relaxed text-gw-text sm:text-[17px]">{product.description}</p>

          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${API_URL}${product.image_url}`}
              alt={product.title}
              className="course-mobile-cover mt-6 w-full aspect-video object-cover rounded-2xl border border-gw-border-soft shadow-[0_10px_28px_-20px_rgba(28,30,42,0.38)]"
            />
          )}

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

          {product.course_content && (
            <>
              <section aria-labelledby="course-overview" className="mt-8 rounded-2xl border border-gw-border-soft bg-gw-surface p-5 sm:mt-9 sm:p-6">
                <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">Inside the course</div>
                <h2 id="course-overview" className="mt-1.5 font-serif text-[25px] tracking-tight text-gw-ink sm:text-[28px]">
                  {product.course_content.headline || product.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-gw-text">{product.course_content.overview}</p>
                <div className="mt-5 grid gap-3 border-t border-gw-border-hairline pt-5 sm:grid-cols-2">
                  {product.course_content.outcomes.map((outcome) => (
                    <div key={outcome} className="flex gap-2.5 text-[13px] leading-relaxed text-gw-text">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gw-primary-soft text-[10px] font-bold text-gw-primary-text">
                        ✓
                      </span>
                      {outcome}
                    </div>
                  ))}
                </div>
              </section>

              <CourseCurriculum content={product.course_content} />
            </>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <YourSignal />
          <EnrollPanel product={product} />
        </aside>
      </div>
    </div>
  );
}
