import Link from "next/link";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gw-bg px-6 py-12">
      <div className="w-full max-w-[980px] min-h-[640px] grid grid-cols-1 md:grid-cols-2 bg-gw-surface border border-gw-border rounded-2xl overflow-hidden shadow-[0_20px_50px_-20px_rgba(28,30,42,0.24)]">
        <div className="hidden md:flex bg-gw-agent-bg border-r border-gw-agent-border px-12 py-12 flex-col justify-center">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
            <span className="absolute inset-2 rounded-full border border-gw-agent-border" />
            <span className="w-2 h-2 rounded-full bg-gw-agent [animation:gwPulse_2.4s_ease-in-out_infinite]" />
          </div>
          <p className="font-serif text-[26px] leading-[1.4] text-gw-ink-2 mt-6 max-w-[26ch]">
            Growise notices what you explore and tells you what&apos;s next.
          </p>
        </div>

        <div className="px-8 sm:px-12 py-12 flex flex-col">
          <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
            <span className="w-[22px] h-[22px] rounded-[7px] bg-gw-primary inline-block" />
            <span className="text-[17px] font-semibold tracking-tight text-gw-ink">Growise</span>
          </Link>
          <div className="my-auto max-w-[400px] w-full py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
