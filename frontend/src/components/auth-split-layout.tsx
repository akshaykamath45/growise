import { BrandMark } from "@/components/brand-mark";

export function AuthSplitLayout({
  children,
  eyebrow = "Your learning signal",
  title = "Growise notices what you explore and tells you what’s next.",
  description,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gw-bg px-6 py-10">
      <div className="grid min-h-[620px] w-full max-w-[980px] grid-cols-1 overflow-hidden rounded-2xl border border-gw-border bg-gw-surface shadow-[0_20px_50px_-20px_rgba(28,30,42,0.24)] md:grid-cols-2">
        <div className="hidden md:flex bg-gw-agent-bg border-r border-gw-agent-border px-12 py-12 flex-col justify-center">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gw-agent-icon-border" />
            <span className="absolute inset-2 rounded-full border border-gw-agent-border" />
            <span className="w-2 h-2 rounded-full bg-gw-agent [animation:gwPulse_2.4s_ease-in-out_infinite]" />
          </div>
          <div className="mt-6 font-mono text-[10px] tracking-[0.16em] uppercase text-gw-agent">{eyebrow}</div>
          <p className="mt-3 font-serif text-[27px] leading-[1.35] text-gw-ink-2 max-w-[25ch]">{title}</p>
          {description && <p className="mt-4 max-w-[35ch] text-[14px] leading-relaxed text-gw-agent-2">{description}</p>}
        </div>

        <div className="px-8 sm:px-12 py-12 flex flex-col">
          <div className="my-auto w-full max-w-[400px] py-8">
            <div className="mb-8 inline-flex items-center gap-2.5" aria-label="Growise">
              <BrandMark size={25} />
              <span className="text-[18px] font-semibold tracking-tight text-gw-ink">Growise</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
