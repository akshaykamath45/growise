"use client";

import { useState } from "react";
import { track } from "@/lib/tracker";
import type { Product } from "@/lib/types";

export function EnrollPanel({ product }: { product: Product }) {
  const [enrolled, setEnrolled] = useState(false);

  function handleEnroll() {
    track({ event_type: "enroll_click", product_id: product.id, metadata: { category: product.category } });
    setEnrolled(true);
  }

  return (
    <div className="sticky top-20 flex flex-col gap-4">
      <div className="bg-gw-surface border border-gw-border-soft rounded-2xl p-6 shadow-[0_6px_20px_-8px_rgba(28,30,42,0.14)]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[34px] font-semibold tracking-tight">${product.price}</span>
          {product.old_price && (
            <span className="text-base text-gw-text-placeholder line-through">${product.old_price}</span>
          )}
        </div>
        <button
          onClick={handleEnroll}
          disabled={enrolled}
          className="w-full h-11 mt-4.5 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium cursor-pointer border-0 hover:bg-gw-primary-hover disabled:opacity-70 disabled:cursor-default"
        >
          {enrolled ? "Added to your learning ✓" : "Enroll now"}
        </button>
        <div className="font-mono text-[10.5px] text-gw-text-placeholder text-center mt-3.5 tracking-wide">
          30-DAY REFUND · LIFETIME ACCESS
        </div>
      </div>
    </div>
  );
}
