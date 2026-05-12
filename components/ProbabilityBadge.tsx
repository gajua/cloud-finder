"use client";

import { weatherEmojiForSky } from "@/lib/cloudUi";
import { probabilityTier } from "@/lib/fogAlgorithm";
import type { SkyCondition } from "@/lib/weather";

type ProbabilityBadgeProps = {
  probability: number;
  name: string;
  sky: SkyCondition;
  onPress?: () => void;
};

const tierStyles = {
  low: "bg-rose-600 text-white ring-rose-900/20",
  mid: "bg-amber-500 text-stone-900 ring-amber-900/15",
  high: "bg-emerald-600 text-white ring-emerald-900/20",
} as const;

export function ProbabilityBadge({
  probability,
  name,
  sky,
  onPress,
}: ProbabilityBadgeProps) {
  const tier = probabilityTier(probability);
  const weatherEmoji = weatherEmojiForSky(sky);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      className={[
        "flex min-w-[5.5rem] flex-col items-center rounded-xl px-2.5 py-1.5 text-center shadow-md ring-2 transition hover:brightness-105 active:scale-[0.98]",
        tierStyles[tier],
      ].join(" ")}
      aria-label={`${name} 운해 확률 ${probability}%`}
    >
      <span className="max-w-[6.5rem] truncate text-[10px] font-semibold leading-tight opacity-95">
        {name}
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-lg font-bold leading-none tracking-tight">
        <span aria-hidden className="select-none text-base leading-none">
          {weatherEmoji}
        </span>
        {probability}%
      </span>
    </button>
  );
}
