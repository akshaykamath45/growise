import type { Metadata } from "next";

export const metadata: Metadata = { title: "My learning", robots: { index: false, follow: false } };

export default function MyLearningLayout({ children }: { children: React.ReactNode }) {
  return children;
}
