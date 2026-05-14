"use client";

import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { MOUNTAINS } from "@/data/mountains";
import { probabilityTier } from "@/lib/fogAlgorithm";
import type {
  MountainInsight,
  WeatherLoadStage,
} from "@/store/useWeatherStore";

const TAIL_HTML = `<div class="h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-stone-900/80 drop-shadow" aria-hidden="true"></div>`;

type MountainMarkersLayerProps = {
  insights: Record<string, MountainInsight>;
  loading: boolean;
  loadStage: WeatherLoadStage | null;
  mountainErrors: Record<string, string>;
  onOpenDetail: (id: string) => void;
};

export function MountainMarkersLayer({
  insights,
  loading,
  loadStage,
  mountainErrors,
  onOpenDetail,
}: MountainMarkersLayerProps) {
  const map = useMap();

  useEffect(() => {
    const leafletMarkers: L.Marker[] = [];

    for (const m of MOUNTAINS) {
      const insight = insights[m.id];
      const fetchError = mountainErrors[m.id];
      const isPending = loading && !insight && !fetchError;
      const pendingShort =
        loadStage === "computing" ? "운해 계산 중" : "날씨 불러오는 중";
      const pendingTooltip =
        loadStage === "computing"
          ? "날씨값을 토대로 운해 가능성을 계산 중입니다."
          : "날씨 데이터를 불러오는 중입니다.";

      if (!insight && !isPending && !fetchError) continue;

      let icon: L.DivIcon;
      let tooltipHtml: string;
      const tooltipOptions: L.TooltipOptions = {
        direction: "top",
        offset: L.point(0, -18),
        opacity: 0.95,
        className: "osm-tooltip",
        sticky: true,
      };

      if (insight) {
        const tier = probabilityTier(insight.fog.probability);
        const badgeTone =
          tier === "high"
            ? "bg-emerald-600 text-white ring-emerald-900/20"
            : tier === "mid"
              ? "bg-amber-500 text-stone-900 ring-amber-900/15"
              : "bg-rose-600 text-white ring-rose-900/20";

        icon = L.divIcon({
          html: `
          <div class="flex flex-col items-center gap-0.5 pb-1">
            <div class="flex min-w-[5.5rem] flex-col items-center rounded-xl px-2.5 py-1.5 text-center shadow-md ring-2 ${badgeTone}">
              <span class="max-w-[6.5rem] truncate text-[10px] font-semibold leading-tight opacity-95">${escapeHtml(m.name)}</span>
              <span class="mt-0.5 text-[11px] font-medium leading-tight opacity-90">내일 새벽 운해</span>
              <span class="mt-0.5 text-lg font-bold leading-none tracking-tight tabular-nums">${insight.fog.probability}%</span>
            </div>
            ${TAIL_HTML}
          </div>
        `,
          className: "osm-mountain-marker-icon",
          iconSize: [120, 102],
          iconAnchor: [60, 102],
        });

        tooltipHtml = `
          <div class="space-y-1 text-xs">
            <div class="font-semibold">${escapeHtml(m.name)}</div>
            <div>내일 새벽·일출 전후 <span class="font-semibold tabular-nums">${insight.fog.probability}%</span> (추정)</div>
            <div class="text-[11px] leading-snug text-stone-600 dark:text-stone-300">단기예보를 내부 모델에 넣어 산출한 값으로, 실제 관측과 다를 수 있습니다.</div>
          </div>
        `;
      } else if (isPending) {
        icon = L.divIcon({
          html: `
          <div class="flex flex-col items-center gap-0.5 pb-1" role="status" aria-live="polite" aria-busy="true">
            <div class="flex min-w-[5.5rem] flex-col items-center rounded-xl bg-stone-700 px-2.5 py-1.5 text-center text-white shadow-md ring-2 ring-stone-900/35">
              <span class="max-w-[6.5rem] truncate text-[10px] font-semibold leading-tight text-stone-100">${escapeHtml(m.name)}</span>
              <span class="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-medium text-stone-100">
                <span class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-stone-400 border-t-white" aria-hidden="true"></span>
                ${escapeHtml(pendingShort)}
              </span>
            </div>
            ${TAIL_HTML}
          </div>
        `,
          className: "osm-mountain-marker-icon",
          iconSize: [120, 96],
          iconAnchor: [60, 96],
        });

        tooltipHtml = `<div class="text-xs">${escapeHtml(m.name)}<br/>${escapeHtml(pendingTooltip)}</div>`;
      } else if (fetchError) {
        const shortErr =
          fetchError.length > 48 ? `${escapeHtml(fetchError.slice(0, 48))}…` : escapeHtml(fetchError);
        icon = L.divIcon({
          html: `
          <div class="flex flex-col items-center gap-0.5 pb-1">
            <div class="flex min-w-[5.5rem] flex-col items-center rounded-xl bg-rose-900/90 px-2.5 py-1.5 text-center text-white shadow-md ring-2 ring-rose-950/40">
              <span class="max-w-[6.5rem] truncate text-[10px] font-semibold leading-tight">${escapeHtml(m.name)}</span>
              <span class="mt-1 text-[10px] font-medium leading-snug text-rose-100">불러오기 실패</span>
              <span class="mt-0.5 max-w-[6.5rem] break-words text-[9px] leading-tight text-rose-50/95">${shortErr}</span>
            </div>
            ${TAIL_HTML}
          </div>
        `,
          className: "osm-mountain-marker-icon",
          iconSize: [120, 110],
          iconAnchor: [60, 110],
        });

        tooltipHtml = `<div class="text-xs font-semibold">${escapeHtml(m.name)}</div><div class="mt-1 max-w-[12rem] text-[11px]">${escapeHtml(fetchError)}</div>`;
      } else {
        continue;
      }

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.bindTooltip(tooltipHtml, tooltipOptions);

      if (insight) {
        marker.on("click", () => {
          onOpenDetail(m.id);
        });
      }

      leafletMarkers.push(marker);
    }

    return () => {
      leafletMarkers.forEach((mk) => {
        mk.remove();
      });
    };
  }, [map, insights, loadStage, loading, mountainErrors, onOpenDetail]);

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
