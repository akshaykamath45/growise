"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { AuthSplitLayout } from "@/components/auth-split-layout";
import { LoadingState } from "@/components/loading-state";
import { useToast } from "@/components/toast-provider";

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
  const { success } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoKind | null>(null);
  const [openingLearning, setOpeningLearning] = useState(false);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    try {
      const user = await login(loginEmail, loginPassword);
      setOpeningLearning(true);
      success({
        title: user.role === "admin" ? "Admin workspace ready" : "Welcome back",
        message: user.role === "admin" ? "Opening your operations dashboard." : "Your learning space is ready.",
      });
      // Give the successful auth handoff a clear, stable moment before changing
      // routes. This prevents the newly rendered navigation from feeling ready
      // before its destination has settled.
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      router.push(next ?? (user.role === "admin" ? "/admin/agent-ops" : "/courses"));
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

  const busy = submitting || demoLoading !== null || openingLearning;

  return (
    <>
      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-primary-text">Welcome back</div>
      <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight text-gw-ink">Continue your learning.</h1>
      <p className="mt-2 text-[14px] text-gw-text-muted">Your saved courses and recommendations are waiting.</p>

      <div className="flex flex-col gap-2.5 mt-6">
        <button
          type="button"
          onClick={() => handleDemoLogin("guest")}
          disabled={busy}
          className="h-11 rounded-[10px] border border-gw-border bg-gw-surface text-[14.5px] font-medium text-gw-text cursor-pointer hover:border-gw-primary-border hover:text-gw-primary-text disabled:opacity-60 disabled:cursor-default"
        >
          {openingLearning ? "Opening your learning…" : demoLoading === "guest" ? "Signing in as guest…" : "Continue as guest"}
        </button>
        <button
          type="button"
          onClick={() => handleDemoLogin("admin")}
          disabled={busy}
          className="h-11 rounded-[10px] border border-gw-agent-border bg-gw-agent-bg text-[14.5px] font-medium text-gw-agent-2 cursor-pointer hover:bg-gw-agent-hover disabled:opacity-60 disabled:cursor-default"
        >
          {openingLearning ? "Opening your learning…" : demoLoading === "admin" ? "Signing in as admin…" : "Continue as admin"}
        </button>
      </div>

      <div className="flex items-center gap-3.5 my-6">
        <div className="flex-1 h-px bg-gw-border-soft" />
        <div className="font-mono text-[10px] tracking-[0.12em] text-gw-text-placeholder">OR</div>
        <div className="flex-1 h-px bg-gw-border-soft" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={busy}>
        <div>
          <label className="block text-[13px] font-medium text-gw-text mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 px-3.5 border border-gw-border rounded-[10px] bg-gw-surface text-gw-ink text-[15px] outline-none focus:border-gw-primary-border focus:ring-[3px] focus:ring-gw-focus-ring"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gw-text mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3.5 border border-gw-border rounded-[10px] bg-gw-surface text-gw-ink text-[15px] outline-none focus:border-gw-primary-border focus:ring-[3px] focus:ring-gw-focus-ring"
          />
        </div>

        {error && <div className="text-sm text-gw-error">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="h-11 mt-1 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium border-0 cursor-pointer hover:bg-gw-primary-hover disabled:opacity-60"
        >
          {openingLearning ? "Opening your learning…" : submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      {openingLearning && (
        <div role="status" className="mt-4 flex items-center gap-2.5 rounded-xl border border-gw-success/25 bg-gw-success/10 px-3 py-2.5 text-[13px] text-gw-text">
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-gw-success/25 border-t-gw-success" />
          <span><span className="font-medium text-gw-ink">Signed in.</span> Opening your learning space…</span>
        </div>
      )}

      <p className="mt-6 text-[13.5px] text-gw-text-muted">
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
    <AuthSplitLayout
      eyebrow="Pick up where you left off"
      title="The next step in your learning path is still here."
      description="Sign in to return to your courses, progress, and recommendations shaped around what you explore."
    >
      <Suspense
        fallback={
          <LoadingState compact title="Preparing sign in" description="Getting the form ready." />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
