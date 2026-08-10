import { Reveal } from "@/components/reveal";

export function HowItWorks() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16">
      <Reveal>
        <h2 className="font-serif text-[32px] leading-[1.12] tracking-tight sm:text-[38px]">
          Your learning changes.
          <br />
          Growise notices.
        </h2>
      </Reveal>

      <div className="mt-9 grid grid-cols-1 items-stretch gap-8 md:mt-12 md:grid-cols-[1fr_1fr_1.5fr] md:gap-6">
        <Reveal delay={0}>
          <div className="border-t-2 border-gw-border pt-5 h-full">
            <div className="font-mono text-[12px] text-gw-text-faint">01 — Explore</div>
            <p className="text-[15px] leading-relaxed text-gw-text-muted mt-2.5 max-w-[28ch]">
              Browse, search and follow what interests you.
            </p>
          </div>
        </Reveal>
        <Reveal delay={110}>
          <div className="border-t-2 border-gw-border pt-5 h-full">
            <div className="font-mono text-[12px] text-gw-text-faint">02 — Notice</div>
            <p className="text-[15px] leading-relaxed text-gw-text-muted mt-2.5 max-w-[28ch]">
              Growise connects patterns across what you&apos;ve been learning.
            </p>
          </div>
        </Reveal>
        <Reveal delay={220}>
          {/* 03 is the payoff — visually dominant */}
          <div className="border-t-2 border-gw-primary pt-5 h-full bg-gw-primary-soft/40 -mx-3 px-3 md:mx-0 md:px-5 md:pb-5 rounded-b-xl">
            <div className="font-mono text-[12px] text-gw-primary font-medium">03 — Recommend</div>
            <p className="font-serif text-[21px] leading-snug text-gw-ink mt-2.5 max-w-[26ch]">
              One grounded next step — not another endless list.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
