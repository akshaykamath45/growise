"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, productsApi } from "@/lib/api";
import { track } from "@/lib/tracker";
import { AuthSplitLayout } from "@/components/auth-split-layout";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trackingOptIn, setTrackingOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    productsApi.categories().then(setCategories).catch(() => {});
  }, []);

  function toggleTopic(topic: string) {
    setTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  }

  const passwordError = password.length > 0 && password.length < 8 ? "At least 8 characters." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password, trackingOptIn);
      for (const topic of topics) {
        track({ event_type: "search", search_query: topic });
      }
      router.push("/courses");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout>
      <h1 className="text-[26px] font-semibold tracking-tight leading-tight">Start learning</h1>
      <p className="mt-2 text-[14px] text-gw-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium">
          Log in
        </Link>
      </p>

      {categories.length > 0 && (
        <div className="mt-5">
          <div className="text-[13px] font-medium text-gw-text mb-2">
            What are you exploring? <span className="text-gw-text-faint font-normal">(optional)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleTopic(c)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border cursor-pointer transition-colors ${
                  topics.includes(c)
                    ? "bg-gw-primary border-gw-primary text-white"
                    : "bg-gw-surface border-gw-border-soft text-gw-text hover:border-gw-primary-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-5">
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full h-11 px-3.5 border rounded-[10px] bg-gw-surface text-gw-ink text-[15px] outline-none focus:ring-[3px] ${
              passwordError
                ? "border-gw-error focus:ring-gw-error/20"
                : "border-gw-border focus:border-gw-primary-border focus:ring-gw-focus-ring"
            }`}
          />
          {passwordError && (
            <div className="flex gap-1.5 items-center text-xs text-gw-error mt-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-gw-error text-white text-[10px] flex items-center justify-center font-semibold">
                !
              </span>
              {passwordError}
            </div>
          )}
        </div>

        <label className="flex gap-2.5 items-start mt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={trackingOptIn}
            onChange={(e) => setTrackingOptIn(e.target.checked)}
            className="mt-1 w-[18px] h-[18px] accent-[color:var(--gw-primary)]"
          />
          <span className="text-[13.5px] leading-snug text-gw-text">
            Let the Growise agent learn from what I browse
            <div className="text-xs text-gw-text-faint mt-0.5">
              Turn this off any time. Recommendations stop, nothing else changes.
            </div>
          </span>
        </label>

        {error && <div className="text-sm text-gw-error">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="h-11 mt-1 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium border-0 cursor-pointer hover:bg-gw-primary-hover disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
