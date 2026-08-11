"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Shared client-side gate. Every admin API is also protected on the server. */
export function useAdminAccess() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "admin";

  useEffect(() => {
    if (!loading && !allowed) router.replace("/login");
  }, [allowed, loading, router]);

  return { token, allowed, loading };
}

export function AdminAccessFallback() {
  return <div className="mx-auto max-w-[1440px] px-6 py-14 text-gw-text-muted">Checking admin access…</div>;
}
