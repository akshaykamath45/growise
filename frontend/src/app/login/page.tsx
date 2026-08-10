"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { AuthSplitLayout } from "@/components/auth-split-layout";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(user.role === "admin" ? "/admin/courses" : "/courses");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout>
      <h1 className="text-[30px] font-semibold tracking-tight leading-tight">Welcome back</h1>
      <p className="mt-2.5 text-[15px] text-gw-text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium">
          Create an account
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <div>
          <label className="block text-[13px] font-medium text-gw-text mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 px-3.5 border border-gw-border rounded-[10px] text-[15px] outline-none focus:border-gw-primary-border focus:ring-[3px] focus:ring-[rgba(139,125,245,0.22)]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gw-text mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3.5 border border-gw-border rounded-[10px] text-[15px] outline-none focus:border-gw-primary-border focus:ring-[3px] focus:ring-[rgba(139,125,245,0.22)]"
          />
        </div>

        {error && <div className="text-sm text-gw-error">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="h-11 mt-1 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium border-0 cursor-pointer hover:bg-gw-primary-hover disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-xs text-gw-text-faint">
        Admin demo account: <code>admin@growise.dev</code> / <code>AdminPass123</code>
      </p>
    </AuthSplitLayout>
  );
}
