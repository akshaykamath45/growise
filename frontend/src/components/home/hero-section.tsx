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
      <div className="max-w-[1240px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-gw-primary">
            Learning that adapts to you.
          </div>
          <h1 className="font-serif text-[54px] xl:text-[62px] leading-[1.05] tracking-tight mt-4 max-w-[15ch]">
            Learn what you&apos;ll actually use next.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-gw-text max-w-[44ch]">
            You don&apos;t tell Growise what you want. It reads what you explore, and turns that into
            your next best course.
          </p>
          <div className="flex items-center gap-3 mt-8 flex-wrap">
            <Link
              href="/courses"
              className="h-12 px-6 rounded-[10px] bg-gw-primary text-white text-[15px] font-medium leading-[48px] no-underline hover:no-underline hover:bg-gw-primary-hover whitespace-nowrap"
            >
              Explore courses
            </Link>
            <a
              href="#how"
              className="h-12 px-6 rounded-[10px] border border-gw-border bg-gw-surface text-[15px] font-medium leading-[48px] text-gw-text no-underline hover:no-underline hover:border-gw-primary-border hover:text-gw-primary-text whitespace-nowrap"
            >
              See how it works
            </a>
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-gw-text-faint mt-9">
            {totalCourses} courses · {categoryCount} categories
          </div>
        </div>

        <div className="home-hero-frame flex lg:justify-end">
          <div className="home-hero-art">
            <Image
              src="/hero-section-right.png"
              alt="Growise course categories connected around a personalised recommendation"
              width={1469}
              height={1071}
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
