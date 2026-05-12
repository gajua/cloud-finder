"use client";

import { tomorrowDateKeySeoul } from "@/lib/dateSeoul";
import { getSunriseLabelForDate } from "@/lib/timeLabels";
import type { MountainInsight } from "@/store/useWeatherStore";

type BottomSheetProps = {
  insight: MountainInsight | null;
  onClose: () => void;
};

const REASON_LABELS: { key: keyof MountainInsight["fogReasons"]; label: string }[] = [
  { key: "humidity", label: "습도·수증기" },
  { key: "wind", label: "바람·안정도" },
  { key: "sky", label: "하늘 상태" },
  { key: "temperature", label: "기온 경향" },
];

export function BottomSheet({ insight, onClose }: BottomSheetProps) {
  const open = Boolean(insight);
  const contextLabel = getSunriseLabelForDate(tomorrowDateKeySeoul());

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
                  내일 새벽 운해 관측 가능성
                </p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
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
                  <p className="text-xs text-stone-500 dark:text-stone-400">{contextLabel}</p>
                  <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-white">
                    {insight.fog.probability}
                    <span className="text-2xl font-semibold text-stone-500">%</span>
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

              <div className="rounded-xl border border-stone-100 bg-stone-50/90 p-3 text-xs leading-relaxed text-stone-700 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300">
                <p className="font-semibold text-stone-900 dark:text-stone-100">이 숫자는 무엇인가요?</p>
                <p className="mt-2">
                  기상청 <strong>단기예보·산악예보</strong>로 받은 값을 내부 규칙에 넣어 산출한{" "}
                  <strong>내일 새벽·일출 전후 운해(운해·운층)</strong>를 보러 갔을 때의{" "}
                  <strong>상대적 가능성</strong>입니다. 예보는 실제와 어긋날 수 있고, 산마다 미세기후가
                  달라 이 지도는 참고용입니다.
                </p>
                <p className="mt-2 text-stone-600 dark:text-stone-400">
                  화면에는 기온·하늘 등 <strong>현재 날씨처럼 보일 수 있는 수치는 표시하지 않습니다.</strong>{" "}
                  (예보값이 실관측과 다르게 느껴지는 경우가 많기 때문입니다.)
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  확률에 반영한 요인(요약)
                </p>
                <ul className="mt-2 space-y-2.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {REASON_LABELS.map(({ key, label }) => {
                    const text = insight.fogReasons[key]?.trim();
                    if (!text) return null;
                    return (
                      <li key={key}>
                        <span className="font-medium text-stone-900 dark:text-stone-100">{label}</span>
                        <span className="text-stone-600 dark:text-stone-400"> — </span>
                        {text}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-xl border border-dashed border-stone-200 px-3 py-2 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
                안전한 등산·관측을 위해서는 현장 안개·풍향·기온을 반드시 확인하세요. 수치는 법적·행정적
                판단의 근거로 사용할 수 없습니다.
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
