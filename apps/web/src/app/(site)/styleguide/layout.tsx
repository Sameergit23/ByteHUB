import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Component styleguide — ByteHUB",
  robots: { index: false, follow: false },
};

/** Internal page for building the site's UI: available while developing, hidden on the live site. */
export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
