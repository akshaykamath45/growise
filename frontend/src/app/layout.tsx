import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const siteDescription =
  "Growise is an adaptive learning platform that connects what you explore to the courses that move you forward.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Growise | Learn what you’ll actually use next",
    template: "%s | Growise",
  },
  description: siteDescription,
  applicationName: "Growise",
  keywords: ["online courses", "personalized learning", "course recommendations", "professional development"],
  category: "education",
  creator: "Growise",
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: "/logos/growise-orbit.svg" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Growise",
    title: "Growise | Learn what you’ll actually use next",
    description: siteDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Growise adaptive learning" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Growise | Learn what you’ll actually use next",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Growise",
              url: siteUrl.href,
              description: siteDescription,
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("growise-theme");
                const theme = saved === "dark" || saved === "light"
                  ? saved
                  : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gw-bg text-gw-ink">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
