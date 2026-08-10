import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function MinimalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gw-bg px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Link href="/" className="flex items-center justify-center gap-2 no-underline hover:no-underline mb-9">
          <BrandMark size={22} />
          <span className="text-[17px] font-semibold tracking-tight text-gw-ink">Growise</span>
        </Link>
        <div className="bg-gw-surface border border-gw-border rounded-2xl px-7 py-8 shadow-[0_20px_50px_-24px_rgba(28,30,42,0.24)]">
          {children}
        </div>
      </div>
    </div>
  );
}
