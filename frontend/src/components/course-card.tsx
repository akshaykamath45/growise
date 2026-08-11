"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { track } from "@/lib/tracker";
import { API_URL } from "@/lib/api";

const coverStyle: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--gw-border-soft) 0 8px, var(--gw-surface-muted) 8px 16px)",
};

export function CourseCard({
  product,
  reason,
  recommendationId,
}: {
  product: Product;
  reason?: string;
  recommendationId?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_url && !imageFailed;

  return (
    <Link
      href={`/courses/${product.id}${recommendationId ? `?recommendation=${recommendationId}` : ""}`}
      onClick={() => {
        track({ event_type: "course_card_click", product_id: product.id, metadata: { category: product.category } });
        if (recommendationId) {
          track({
            event_type: "recommendation_click",
            product_id: product.id,
            metadata: { category: product.category, recommendation_id: recommendationId },
          });
        }
      }}
      className="group block rounded-xl border border-gw-border-soft bg-gw-surface overflow-hidden no-underline hover:no-underline hover:border-gw-border hover:shadow-[0_10px_24px_-12px_rgba(28,30,42,0.2)] transition-all"
    >
      <div className="aspect-video overflow-hidden">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${product.image_url}`}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div style={coverStyle} className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[10px] tracking-wider text-gw-text-placeholder uppercase">
              {product.category}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-gw-primary-soft text-gw-primary-text font-mono text-[9.5px] tracking-wider uppercase">
            {product.level}
          </span>
        </div>
        <h3 className="mt-2 text-[15.5px] font-semibold leading-snug text-gw-ink group-hover:text-gw-primary">
          {product.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gw-text-faint flex-wrap">
          <span className="font-medium text-gw-text-muted">{product.instructor}</span>
          <span>·</span>
          <span className="text-gw-agent-accent tracking-[-1px]">★</span>
          <span className="font-semibold text-gw-ink-2">{product.rating.toFixed(1)}</span>
          <span className="font-mono text-[10.5px]">({product.reviews_count.toLocaleString()})</span>
        </div>
        <div className="mt-1 font-mono text-[10.5px] text-gw-text-faint tracking-wide">
          {product.duration_label} · {product.lessons_count} LESSONS
        </div>
        {reason && (
          <p className="mt-2.5 font-serif italic text-[13.5px] leading-snug text-gw-text-muted">{reason}</p>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-semibold">${product.price}</span>
          {product.old_price && (
            <span className="text-xs text-gw-text-placeholder line-through">${product.old_price}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
