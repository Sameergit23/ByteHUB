import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ByteHUB — Real projects. Real mentors. Your first step into tech.",
  description:
    "Learn a skill in a guided training programme, then prove it on a live internship project with verified stipends and ACID transactions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-ink selection:text-canvas">
        {/* WCAG Skip-to-content Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-canvas focus:border focus:border-editorial-border focus:outline-none focus:ring-2 focus:ring-accent font-mono text-xs"
        >
          Skip to main content
        </a>

        <Header />
        <main id="main-content" className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
