"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { track } from "@/lib/tracker";
import { API_URL, ApiError, enrollmentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/types";

export function EnrollPanel({ product }: { product: Product }) {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // null = not yet known. Derived flags below avoid setting state synchronously in the effect.
  const [enrolledState, setEnrolledState] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loggedIn = Boolean(token);
  const enrolled = loggedIn && enrolledState === true;
  const checking = !authLoading && loggedIn && enrolledState === null;

  const includes = [
    "Lifetime access",
    `${product.lessons_count} on-demand video lessons`,
    "Certificate of completion",
  ];

  useEffect(() => {
    if (authLoading || !token) return;
    let active = true;
    enrollmentsApi
      .mine(token)
      .then((list) => {
        if (active) setEnrolledState(list.some((e) => e.product.id === product.id));
      })
      .catch(() => {
        // A failed check shouldn't block enrolling — fall back to the un-enrolled state.
        if (active) setEnrolledState(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, token, product.id]);

  async function handleEnroll() {
    track({ event_type: "enroll_click", product_id: product.id, metadata: { category: product.category } });

    if (!token) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await enrollmentsApi.enroll(product.id, token);
      setEnrolledState(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't enroll right now. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = authLoading || checking || submitting;

  return (
    <aside aria-label="Course enrollment" className="flex flex-col gap-3 lg:sticky lg:top-20">
      <div className="overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface shadow-[0_18px_34px_-22px_rgba(28,30,42,0.34)]">
        <div className="relative hidden aspect-[16/10] overflow-hidden border-b border-gw-border-soft bg-gw-deep lg:block">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${API_URL}${product.image_url}`}
              alt={`Preview of ${product.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-end bg-gw-deep p-5">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-primary-soft">{product.category}</span>
            </div>
          )}
          <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-gw-deep/85 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.12em] uppercase text-white backdrop-blur">
            Course preview
          </span>
        </div>

        <div className="p-5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">One-time enrollment</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-[32px] font-semibold tracking-tight text-gw-ink">${product.price}</span>
            {product.old_price && (
              <span className="text-base text-gw-text-placeholder line-through">${product.old_price}</span>
            )}
          </div>
          {enrolled ? (
            <>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-[9px] border border-gw-success/30 bg-gw-success/10 py-2 text-[13px] font-medium text-gw-success">
                <span aria-hidden>✓</span> You&apos;re enrolled
              </div>
              <Link
                href="/my-learning"
                className="mt-2.5 flex h-11 w-full items-center justify-center rounded-[9px] bg-gw-primary text-[15px] font-medium text-white no-underline hover:bg-gw-primary-hover hover:no-underline"
              >
                Go to My Learning →
              </Link>
            </>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={busy}
              className="mt-4 w-full h-11 rounded-[9px] bg-gw-primary text-white text-[15px] font-medium cursor-pointer border-0 hover:bg-gw-primary-hover disabled:opacity-70 disabled:cursor-default"
            >
              {submitting ? "Enrolling…" : "Enroll now"}
            </button>
          )}

          {error && <div className="mt-2.5 text-center text-[12.5px] text-gw-error">{error}</div>}

          <div className="mt-3 text-center font-mono text-[9.5px] tracking-wide text-gw-text-placeholder">
            {enrolled ? "FULL ACCESS · LIFETIME" : user ? "30-DAY MONEY-BACK GUARANTEE" : "LOG IN TO ENROLL"}
          </div>
        </div>

        <div className="border-t border-gw-border-hairline bg-gw-surface-muted px-5 py-4.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">At a glance</div>
          <dl className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-3.5">
            <div>
              <dt className="font-mono text-[9px] tracking-wide uppercase text-gw-text-placeholder">Duration</dt>
              <dd className="mt-1 text-[13px] font-semibold text-gw-ink">{product.duration_label}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] tracking-wide uppercase text-gw-text-placeholder">Lessons</dt>
              <dd className="mt-1 text-[13px] font-semibold text-gw-ink">{product.lessons_count} lessons</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] tracking-wide uppercase text-gw-text-placeholder">Level</dt>
              <dd className="mt-1 text-[13px] font-semibold text-gw-ink">{product.level}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] tracking-wide uppercase text-gw-text-placeholder">Instructor</dt>
              <dd className="mt-1 truncate text-[13px] font-semibold text-gw-ink">{product.instructor}</dd>
            </div>
          </dl>
          <a
            href="#course-curriculum"
            className="mt-4 flex items-center justify-between border-t border-gw-border-hairline pt-3.5 text-[12.5px] font-medium text-gw-primary no-underline hover:text-gw-primary-text"
          >
            Preview the curriculum <span aria-hidden>↓</span>
          </a>
        </div>

        <div className="border-t border-gw-border-hairline px-5 py-4.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">Included with enrollment</div>
          <ul className="mt-3.5 flex flex-col gap-2.5" aria-label="Included with this course">
            {includes.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-gw-text">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gw-primary-soft text-[9px] font-bold text-gw-primary-text">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </div>
      <p className="px-2 text-center text-[11px] leading-relaxed text-gw-text-faint">
        Learn at your own pace, with full access from the moment you enroll.
      </p>
    </aside>
  );
}
