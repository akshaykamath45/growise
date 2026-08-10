"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { MinimalAuthLayout } from "@/components/minimal-auth-layout";

const DEMO_ACCOUNTS = {
  guest: { email: "taylor@example.com", password: "TaylorPass123" },
  admin: { email: "admin@growise.dev", password: "AdminPass123" },
} as const;

type DemoKind = keyof typeof DEMO_ACCOUNTS;

/** Only same-origin relative paths are accepted, so `?next=` can't be used to
 *  bounce someone to another site after login. */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoKind | null>(null);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    try {
      const user = await login(loginEmail, loginPassword);
      router.push(next ?? (user.role === "admin" ? "/admin/courses" : "/courses"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await performLogin(email, password);
    setSubmitting(false);
  }

  async function handleDemoLogin(kind: DemoKind) {
    const account = DEMO_ACCOUNTS[kind];
    setError(null);
    setDemoLoading(kind);
    setEmail(account.email);
    setPassword(account.password);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await performLogin(account.email, account.password);
    setDemoLoading(null);
  }

  const busy = submitting || demoLoading !== null;

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight leading-tight text-center">Welcome back</h1>
      <p className="mt-1.5 text-[14px] text-gw-text-muted text-center">Continue where you left off.</p>

      <div className="flex flex-col gap-2.5 mt-6">
        <button
          type="button"
          onClick={() => handleDemoLogin("guest")}
          disabled={busy}
          className="h-11 rounded-[10px] border border-gw-border bg-white text-[14.5px] font-medium text-gw-text cursor-pointer hover:border-gw-primary-border hover:text-gw-primary-hover disabled:opacity-60 disabled:cursor-default"
        >
          {demoLoading === "guest" ? "Signing in as guest…" : "Continue as guest"}
        </button>
        <button
          type="button"
          onClick={() => handleDemoLogin("admin")}
          disabled={busy}
          className="h-11 rounded-[10px] border border-gw-agent-border bg-gw-agent-bg text-[14.5px] font-medium text-gw-agent-2 cursor-pointer hover:bg-[#fbe8ce] disabled:opacity-60 disabled:cursor-default"
        >
          {demoLoading === "admin" ? "Signing in as admin…" : "Continue as admin"}
        </button>
      </div>

      <div className="flex items-center gap-3.5 my-6">
        <div className="flex-1 h-px bg-gw-border-soft" />
        <div className="font-mono text-[10px] tracking-[0.12em] text-gw-text-placeholder">OR</div>
        <div className="flex-1 h-px bg-gw-border-soft" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          disabled={busy}
          className="h-11 mt-1 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium border-0 cursor-pointer hover:bg-gw-primary-hover disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-[13.5px] text-gw-text-muted text-center">
        New to Growise?{" "}
        <Link href="/signup" className="font-medium">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <MinimalAuthLayout>
      <Suspense
        fallback={
          <div className="py-8 text-center text-[14px] text-gw-text-muted">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </MinimalAuthLayout>
  );
}
