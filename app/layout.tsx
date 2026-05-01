import type { Metadata } from "next";

import { AnalyticsBanner } from "@/components/AnalyticsBanner";
import { PreviewBanner } from "@/components/PreviewBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTS Crime Portfolio",
  description: "Single discoverable front door for DTS Crime delivery information.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PreviewBanner />
        <AnalyticsBanner />
        {children}
      </body>
    </html>
  );
}
