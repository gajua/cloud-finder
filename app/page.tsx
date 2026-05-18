import type { Metadata } from "next";

import { MapPageClient } from "@/components/MapPageClient";
import { SeoContent } from "@/components/seo-content";
import { TopOverlay } from "@/components/TopOverlay";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "내일 운해 가능성 지도",
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `내일 운해 가능성 지도 · ${siteConfig.name}`,
    description: siteConfig.description,
    url: "/",
  },
};

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-stone-950">
      <TopOverlay />
      <SeoContent />

      <main className="h-full w-full">
        <MapPageClient />
      </main>
    </div>
  );
}
