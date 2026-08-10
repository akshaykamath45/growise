"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades its children in whenever `swapKey` changes.
 * The first render paints fully visible — this wraps the hero, so it must never
 * start transparent and flash in.
 */
export function FadeSwap({ swapKey, children }: { swapKey: string | number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [swapKey]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
      }`}
    >
      {children}
    </div>
  );
}
