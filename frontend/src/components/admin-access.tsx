"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/loading-state";

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
  return <LoadingState title="Opening admin console" description="Checking secure workspace access." />;
}
