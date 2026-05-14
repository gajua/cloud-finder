"use client";

import dynamic from "next/dynamic";

const CloudFinderMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center bg-stone-950/35 p-4 backdrop-blur-[2px] dark:bg-stone-950/50"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="지도와 날씨 화면을 준비하는 중"
    >
      <div className="max-w-[min(100%,24rem)] rounded-2xl bg-white/95 px-5 py-4 shadow-lg ring-1 ring-black/10 dark:bg-stone-950/95 dark:ring-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
          Cloud Finder
        </p>
        <p className="mt-3 text-[15px] font-semibold leading-snug text-stone-900 dark:text-stone-50 sm:text-base">
          지도를 불러오는 중입니다.
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          지도가 준비되면 날씨와 운해 단계가 이어집니다.
        </p>
        <ol className="mt-3 list-none space-y-3 border-t border-stone-200/80 pt-3 dark:border-stone-700/80">
          <li className="flex gap-3 text-left text-sm font-semibold leading-snug text-stone-900 dark:text-stone-50">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-sky-600 dark:border-stone-600 dark:border-t-sky-400" />
            </span>
            <span>
              <span className="tabular-nums">1.</span> 지도를 불러오는 중입니다.
            </span>
          </li>
          <li className="flex gap-3 text-left text-sm leading-snug text-stone-400 dark:text-stone-500">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600" />
            </span>
            <span>
              <span className="tabular-nums">2.</span> 날씨 데이터를 불러온 뒤, 운해 가능성을 계산합니다.
            </span>
          </li>
        </ol>
      </div>
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
