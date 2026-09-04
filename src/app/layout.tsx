import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stackcensus.onedaybuilt.com";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: {
    default: "Stack census — what 1,200 real websites are built with",
    template: "%s",
  },
  description:
    "Every morning we fetch the home page of 1,200 software products and read what they run: framework, CSS, host, analytics, email. Then we count it, and show the line of the response that proves each figure.",
  openGraph: {
    type: "website",
    siteName: "Stack census",
    url: URL_BASE,
  },
  twitter: { card: "summary_large_image", creator: "@antionmil" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
