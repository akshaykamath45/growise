import Link from "next/link";
import type { Metadata } from "next";
import { productsApi } from "@/lib/api";
import { HeroSection } from "@/components/home/hero-section";
import { HomeExperience } from "@/components/home/home-experience";
import { HowItWorks } from "@/components/home/how-it-works";
import { Experts } from "@/components/home/experts";
import { Reveal } from "@/components/reveal";
import { buildTopics } from "@/components/home/topic";
import { buildInstructors } from "@/components/home/instructors";

export const metadata: Metadata = {
  title: "Learn what you’ll actually use next",
  description: "Explore adaptive course recommendations across web development, AI, design, cloud, data, and cybersecurity.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    productsApi.categories(),
    productsApi.list({ limit: 100 }),
  ]);

  const topics = buildTopics(categories, products);
  const instructors = buildInstructors(products);

  return (
    <div>
      {/* 1–2. What is Growise, and why is that useful */}
      <HeroSection totalCourses={products.length} categoryCount={categories.length} />

      {/* 3. How does it work */}
      <section id="how" className="bg-gw-bg border-b border-gw-border-soft">
        <HowItWorks />
      </section>

      {/* 4–5. What it looks like, and what else to explore */}
      <HomeExperience topics={topics} />

      {/* 6. Why should I trust it */}
      <section className="bg-gw-paper border-t border-gw-border-soft">
        <Experts instructors={instructors} />
      </section>

      {/* 7. Let me use it */}
      <section className="relative bg-gw-deep overflow-hidden">
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full opacity-[0.14]"
          viewBox="0 0 1200 420"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M -40 340 C 200 320, 340 220, 560 210 S 940 140, 1240 80"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
          <circle cx="180" cy="322" r="4" fill="white" />
          <circle cx="560" cy="210" r="4" fill="white" />
          <circle cx="950" cy="140" r="4" fill="white" />
          <text x="1020" y="118" fill="white" fontSize="22">
            ✦
          </text>
        </svg>

        <div className="relative mx-auto max-w-[1240px] px-4 py-14 text-center sm:px-6 sm:py-20">
          <Reveal>
            <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-gw-primary-soft">
              Ready for your next step?
            </div>
            <p className="mx-auto mt-4 max-w-[22ch] font-serif text-[32px] leading-[1.12] tracking-tight text-white sm:text-[44px] sm:leading-[1.15]">
              Your next course might already be waiting.
            </p>
            <p className="text-[15px] text-gw-primary-soft/90 mt-4 max-w-[40ch] mx-auto">
              Explore {products.length} courses selected around the way you learn.
            </p>
            <Link
              href="/signup"
              className="inline-block mt-8 h-12 px-7 rounded-[10px] bg-gw-surface text-gw-ink text-[15px] font-semibold leading-[48px] no-underline hover:no-underline hover:bg-gw-primary-soft"
            >
              Start learning
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
