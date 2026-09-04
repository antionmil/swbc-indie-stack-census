import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stackcensus.onedaybuilt.com";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: {
    default: "Indie stack census — what fifty-one indie products actually run on",
    template: "%s",
  },
  description:
    "Fifty-one indie products, fetched the same way on the same morning, and a tally of what came back: framework, host, email, analytics — with the line of the response that proves each one.",
  openGraph: {
    type: "website",
    siteName: "Indie stack census",
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
