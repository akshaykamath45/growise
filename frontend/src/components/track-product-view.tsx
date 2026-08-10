"use client";

import { useEffect, useRef } from "react";
import { track, flush } from "@/lib/tracker";

export function TrackProductView({ productId, category }: { productId: number; category: string }) {
  const mountedAt = useRef<number>(Date.now());
  const trackedView = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke of effects.
    if (!trackedView.current) {
      trackedView.current = true;
      track({ event_type: "product_view", product_id: productId, metadata: { category } });
    }
    mountedAt.current = Date.now();

    function sendTimeOnPage() {
      const seconds = Math.round((Date.now() - mountedAt.current) / 1000);
      if (seconds < 1) return;
      track({ event_type: "time_on_page", product_id: productId, metadata: { seconds, category } });
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") sendTimeOnPage();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      sendTimeOnPage();
      flush();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, category]);

  return null;
}
