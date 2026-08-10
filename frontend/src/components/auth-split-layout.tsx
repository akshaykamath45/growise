import Link from "next/link";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="px-8 sm:px-16 py-14 flex flex-col">
        <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
          <span className="w-[22px] h-[22px] rounded-[7px] bg-gw-primary inline-block" />
          <span className="text-[17px] font-semibold tracking-tight text-gw-ink">Growise</span>
        </Link>
        <div className="my-auto max-w-[420px] w-full py-10">{children}</div>
      </div>

      <div className="hidden md:flex bg-gw-agent-bg border-l border-gw-agent-border px-14 py-14 flex-col justify-center">
        <div className="relative w-9 h-9 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
          <span className="absolute inset-2 rounded-full border border-gw-agent-border" />
          <span className="w-2 h-2 rounded-full bg-gw-agent [animation:gwPulse_2.4s_ease-in-out_infinite]" />
        </div>
        <p className="font-serif text-[30px] leading-[1.4] text-gw-ink-2 mt-6 max-w-[30ch]">
          Most course sites guess what you&apos;d buy. Ours tells you what it noticed, and why it&apos;s
          suggesting this next.
        </p>
        <div className="flex flex-col gap-3.5 mt-9">
          {[
            "Browse normally — no quizzes, no onboarding survey.",
            "The agent writes you a short note with the evidence attached.",
            "Say “not relevant” and the next set changes.",
          ].map((line, i) => (
            <div key={line} className="flex gap-3 items-start">
              <span className="font-mono text-[10px] text-gw-agent pt-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[14.5px] leading-relaxed text-gw-text">{line}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-gw-agent-border font-mono text-[10.5px] tracking-wide text-gw-agent">
          42 COURSES · GROWING CATALOG
        </div>
      </div>
    </div>
  );
}
