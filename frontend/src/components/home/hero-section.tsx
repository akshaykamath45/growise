import Link from "next/link";
import Image from "next/image";

export function HeroSection({
  totalCourses,
  categoryCount,
}: {
  totalCourses: number;
  categoryCount: number;
}) {
  return (
    <section className="bg-gw-paper border-b border-gw-border-soft">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-gw-primary">
            Learning that adapts to you.
          </div>
          <h1 className="mt-4 max-w-[15ch] font-serif text-[42px] leading-[1.04] tracking-tight sm:text-[54px] xl:text-[62px]">
            Learn what you&apos;ll actually use next.
          </h1>
          <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-gw-text sm:text-[17px]">
            You don&apos;t tell Growise what you want. It reads what you explore, and turns that into
            your next best course.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 min-[390px]:flex-row min-[390px]:items-center sm:mt-8 sm:gap-3">
            <Link
              href="/courses"
              className="h-12 rounded-[10px] bg-gw-primary px-6 text-center text-[15px] font-medium leading-[48px] text-white no-underline hover:bg-gw-primary-hover hover:no-underline"
            >
              Explore courses
            </Link>
            <a
              href="#how"
              className="h-12 rounded-[10px] border border-gw-border bg-gw-surface px-6 text-center text-[15px] font-medium leading-[48px] text-gw-text no-underline hover:border-gw-primary-border hover:text-gw-primary-text hover:no-underline"
            >
              See how it works
            </a>
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-gw-text-faint mt-9">
            {totalCourses} courses · {categoryCount} categories
          </div>
        </div>

        <div className="home-hero-frame flex justify-center lg:justify-end">
          <div className="home-hero-art">
            <Image
              src="/hero-section-right-extended.png"
              alt="Growise course categories connected around a personalised recommendation"
              width={1448}
              height={1086}
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className="home-hero-illustration"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
