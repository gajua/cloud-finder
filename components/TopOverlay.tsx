"use client";

import { tomorrowDateKeySeoul } from "@/lib/dateSeoul";
import { getSunriseLabelForDate } from "@/lib/timeLabels";

export function TopOverlay() {
  const tomorrowKey = tomorrowDateKeySeoul();
  const contextLabel = getSunriseLabelForDate(tomorrowKey);

  return (
    <header className="pointer-events-none absolute left-0 right-0 top-0 z-[2000] p-3 sm:p-4">
      <div className="pointer-events-auto max-w-[min(100%,720px)] rounded-xl bg-white/92 px-3 py-2 shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-stone-950/92 dark:ring-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
          Cloud Finder
        </p>
        <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base font-semibold leading-snug text-stone-900 dark:text-stone-50 sm:text-lg">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span aria-hidden className="text-xl leading-none">
              ☁️
            </span>
            내일의 운해 가능성
          </span>
          <span className="max-w-[min(100%,28rem)] text-[11px] font-normal leading-snug text-stone-500 dark:text-stone-400 sm:text-xs">
            오늘 발표된 <span className="font-medium text-stone-600 dark:text-stone-300">단기예보</span>만
            내부에 넣어{" "}
            <span className="font-medium text-stone-600 dark:text-stone-300">내일 새벽 운해 관측 가능성</span>
            을 %로 보여 줍니다.{" "}
            <span className="font-medium text-stone-600 dark:text-stone-300">
              기온·맑음 등 ‘현재 날씨’ 수치는 표시하지 않습니다.
            </span>
          </span>
        </h1>
        <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
          {contextLabel}
        </p>
      </div>
    </header>
  );
}
