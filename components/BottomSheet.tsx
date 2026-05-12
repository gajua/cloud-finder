"use client";

import { skyLabelKo, weatherEmojiForSky } from "@/lib/cloudUi";
import { getSunriseLabelForDate } from "@/lib/timeLabels";
import { useWeatherStore } from "@/store/useWeatherStore";
import type { MountainInsight } from "@/store/useWeatherStore";

type BottomSheetProps = {
  insight: MountainInsight | null;
  onClose: () => void;
};

function FactorBar({ label, value }: { label: string; value: number }) {
  const v = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
        <span className="font-medium text-stone-800 dark:text-stone-200">
          {label}
        </span>
        <span className="tabular-nums">{v}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-indigo-500 transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export function BottomSheet({ insight, onClose }: BottomSheetProps) {
  const open = Boolean(insight);
  const weatherEmoji = insight ? weatherEmojiForSky(insight.weather.sky) : "☁️";
  const selectedDateKey = useWeatherStore((s) => s.selectedDateKey);
  const contextLabel = getSunriseLabelForDate(selectedDateKey);

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        className={[
          "fixed inset-0 z-40 bg-black/35 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={[
          "fixed inset-x-0 bottom-0 z-50 max-h-[min(78vh,560px)] rounded-t-2xl border border-stone-200/80 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 dark:border-stone-800 dark:bg-stone-950",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        aria-hidden={!open}
      >
        {insight ? (
          <div className="flex max-h-[min(78vh,560px)] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 pb-3 pt-3 dark:border-stone-900">
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  선택한 산
                </p>
                <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                  <span aria-hidden className="text-2xl leading-none">
                    {weatherEmoji}
                  </span>
                  {insight.mountain.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
              >
                닫기
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {contextLabel} · 운해 가능성
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-2 text-5xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-white">
                    <span aria-hidden className="text-4xl leading-none">
                      {weatherEmoji}
                    </span>
                    <span>
                      {insight.fog.probability}
                      <span className="text-2xl font-semibold text-stone-500">%</span>
                    </span>
                  </p>
                </div>
                <div
                  className={[
                    "rounded-full px-3 py-1 text-sm font-semibold",
                    insight.fog.statusLabel === "좋음"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      : insight.fog.statusLabel === "보통"
                        ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
                        : "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
                  ].join(" ")}
                >
                  {insight.fog.statusLabel}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-stone-100 bg-white/80 p-3 text-xs text-stone-700 shadow-sm dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-200">
                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    그날 날씨
                  </p>
                  <p className="font-semibold">
                    {weatherEmoji} {skyLabelKo(insight.weather.sky)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    최저/최고
                  </p>
                  <p className="font-semibold tabular-nums">
                    {Math.round(insight.weather.tempMinToday)}° /{" "}
                    {Math.round(insight.weather.tempMaxToday)}°
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    일출
                  </p>
                  <p className="font-semibold tabular-nums">
                    {insight.weather.sunriseTime}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-100 bg-stone-50/80 p-3 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
                <p className="font-medium text-stone-800 dark:text-stone-100">
                  조건 요약
                </p>
                <ul className="mt-2 space-y-1.5">
                  {insight.fog.factors.map((f) => (
                    <li key={f.key} className="flex justify-between gap-3">
                      <span>{f.label}</span>
                      <span className="text-right text-stone-500 dark:text-stone-400">
                        {f.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  항목별 유리도
                </p>
                {insight.fog.factors.map((f) => (
                  <FactorBar
                    key={f.key}
                    label={`${f.label} · ${f.detail}`}
                    value={f.favorability}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-dashed border-stone-200 px-3 py-2 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
                데이터: {insight.weather.source.toUpperCase()}. 확률은 참고용이며 기상 상황에 따라
                달라질 수 있습니다.
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
