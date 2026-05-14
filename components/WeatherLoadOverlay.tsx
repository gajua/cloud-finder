import type { WeatherLoadStage } from "@/store/useWeatherStore";

type WeatherLoadOverlayProps = {
  loading: boolean;
  loadStage: WeatherLoadStage | null;
};

const STAGE_MESSAGES: Record<
  WeatherLoadStage,
  { step: number; text: string }
> = {
  fetching: {
    step: 1,
    text: "날씨 데이터를 불러오는 중입니다.",
  },
  computing: {
    step: 2,
    text: "날씨값을 토대로 운해 가능성을 계산 중입니다.",
  },
};

function stageHeadline(stage: WeatherLoadStage): string {
  return STAGE_MESSAGES[stage].text;
}

function StageRow({
  stageKey,
  current,
}: {
  stageKey: WeatherLoadStage;
  current: WeatherLoadStage;
}) {
  const { step, text } = STAGE_MESSAGES[stageKey];
  const order: WeatherLoadStage[] = ["fetching", "computing"];
  const isActive = stageKey === current;
  const isDone = order.indexOf(stageKey) < order.indexOf(current);

  return (
    <li
      className={`flex gap-3 text-left text-sm leading-snug transition-colors ${
        isActive
          ? "font-semibold text-stone-900 dark:text-stone-50"
          : isDone
            ? "text-stone-500 dark:text-stone-400"
            : "text-stone-400 dark:text-stone-500"
      }`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {isDone ? (
          <span
            className="text-emerald-600 dark:text-emerald-400"
            aria-hidden
          >
            ✓
          </span>
        ) : isActive ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-sky-600 dark:border-stone-600 dark:border-t-sky-400"
            aria-hidden
          />
        ) : (
          <span
            className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600"
            aria-hidden
          />
        )}
      </span>
      <span>
        <span className="tabular-nums">{step}.</span> {text}
      </span>
    </li>
  );
}

export function WeatherLoadOverlay({
  loading,
  loadStage,
}: WeatherLoadOverlayProps) {
  if (!loading || !loadStage) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1500] flex items-center justify-center bg-stone-950/35 p-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="날씨 및 운해 데이터를 불러오는 중"
    >
      <div className="pointer-events-none max-w-[min(100%,24rem)] rounded-2xl bg-white/95 px-5 py-4 shadow-lg ring-1 ring-black/10 dark:bg-stone-950/95 dark:ring-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
          Cloud Finder
        </p>
        <p className="mt-3 text-[15px] font-semibold leading-snug text-stone-900 dark:text-stone-50 sm:text-base">
          {stageHeadline(loadStage)}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          아래 순서로 진행됩니다.
        </p>
        <ol className="mt-3 list-none space-y-3 border-t border-stone-200/80 pt-3 dark:border-stone-700/80">
          <StageRow stageKey="fetching" current={loadStage} />
          <StageRow stageKey="computing" current={loadStage} />
        </ol>
      </div>
    </div>
  );
}
