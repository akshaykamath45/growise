import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-16">
      <h1 className="font-serif text-5xl">Growise</h1>
      <p className="mt-4 text-gw-text max-w-[60ch]">
        Most course sites guess what you&apos;d buy. Ours tells you what it noticed, and why.
      </p>
      <Link
        href="/courses"
        className="inline-block mt-6 h-11 px-5 rounded-[10px] bg-gw-primary text-white text-sm font-medium leading-[44px] no-underline hover:no-underline hover:bg-gw-primary-hover"
      >
        Browse the catalog
      </Link>
    </div>
  );
}
