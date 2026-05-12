"use client";

import { useMemo } from "react";

import { getForecastDateOptions, getSunriseLabelForDate } from "@/lib/timeLabels";
import { useWeatherStore } from "@/store/useWeatherStore";

export function TopOverlay() {
  const dateOptions = useMemo(() => getForecastDateOptions(8), []);
  const selectedDateKey = useWeatherStore((s) => s.selectedDateKey);
  const selectDate = useWeatherStore((s) => s.selectDate);
  const contextLabel = getSunriseLabelForDate(selectedDateKey);

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
            운해 지도
          </span>
          <span className="max-w-[min(100%,28rem)] text-[11px] font-normal leading-snug text-stone-500 dark:text-stone-400 sm:text-xs">
            지도의 %는 선택한 날짜의 새벽·일출 전후{" "}
            <span className="font-medium text-stone-600 dark:text-stone-300">운해를 관측할 가능성</span>
            입니다.
          </span>
        </h1>
        <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
          {contextLabel}
        </p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-1">
            <tbody>
              <tr>
                {dateOptions.map((option, idx) => {
                  const isSelected = option.key === selectedDateKey;
                  return (
                    <td key={option.key}>
                      <button
                        type="button"
                        onClick={() => selectDate(option.key)}
                        className={[
                          "w-full rounded-md border px-2 py-1.5 text-center text-xs transition",
                          isSelected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
                        ].join(" ")}
                        aria-pressed={isSelected}
                      >
                        <div className="font-semibold">{idx === 0 ? "내일" : option.weekday}</div>
                        <div className={isSelected ? "text-sky-100" : "text-stone-500 dark:text-stone-400"}>
                          {option.label}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </header>
  );
}
