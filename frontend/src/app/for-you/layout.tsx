import type { Metadata } from "next";

export const metadata: Metadata = { title: "For you", robots: { index: false, follow: false } };

export default function ForYouLayout({ children }: { children: React.ReactNode }) {
  return children;
}
