"use client";

import dynamic from "next/dynamic";

const CloudFinderMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-stone-100 text-sm text-stone-600 dark:bg-stone-950 dark:text-stone-300">
      지도를 불러오는 중…
    </div>
  ),
});

export function MapPageClient() {
  return (
    <div className="h-full w-full">
      <CloudFinderMap />
    </div>
  );
}
