"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";

import {
  insightsRecordFromWeatherData,
  useWeatherStore,
} from "@/store/useWeatherStore";

import { BottomSheet } from "./BottomSheet";
import { MountainMarkersLayer } from "./MountainMarkersLayer";

const CENTER: [number, number] = [37.35, 127.85];
const DEFAULT_ZOOM = 7;
const MIN_ZOOM = 7;
const MAX_ZOOM = 11;

// 대한민국 주변만 보이도록 제한 (대략적 경계: 남/서/북/동)
// [southWestLat, southWestLng], [northEastLat, northEastLng]
const KOREA_BOUNDS: [[number, number], [number, number]] = [
  [33.0, 124.3],
  [39.8, 132.2],
];

function MapWeatherLoader() {
  const selectedDateKey = useWeatherStore((s) => s.selectedDateKey);
  const loadWeatherAll = useWeatherStore((s) => s.loadWeatherAll);

  // 마운트·날짜 변경: NEXT_PUBLIC 키가 있으면 브라우저에서 KMA 직접, 없으면 `/api/weather-all` 서버 폴백.
  useEffect(() => {
    void loadWeatherAll();
  }, [loadWeatherAll, selectedDateKey]);

  return null;
}

export function CloudFinderMap() {
  const weatherData = useWeatherStore((s) => s.weatherData);
  const loading = useWeatherStore((s) => s.loading);
  const selectedId = useWeatherStore((s) => s.selectedMountainId);
  const selectMountain = useWeatherStore((s) => s.selectMountain);
  const mountainErrors = useWeatherStore((s) => s.mountainErrors);
  const error = useWeatherStore((s) => s.error);

  const insights = useMemo(
    () => insightsRecordFromWeatherData(weatherData),
    [weatherData],
  );

  const selectedInsight = useMemo(() => {
    if (!selectedId) return null;
    return insights[selectedId] ?? null;
  }, [insights, selectedId]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      selectMountain(id);
    },
    [selectMountain],
  );

  const handleCloseDetail = useCallback(() => {
    selectMountain(null);
  }, [selectMountain]);

  return (
    <div className="relative z-0 h-full w-full">
      <MapContainer
        center={CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={KOREA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={20}
        />
        <ZoomControl position="topright" />
        <MapWeatherLoader />
        <MountainMarkersLayer
          insights={insights}
          loading={loading}
          mountainErrors={mountainErrors}
          onOpenDetail={handleOpenDetail}
        />
      </MapContainer>

      {error ? (
        <div className="pointer-events-none absolute left-3 top-3 z-1000 max-w-sm rounded-lg bg-white/90 px-3 py-2 text-xs text-stone-800 shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-stone-950/90 dark:text-stone-100 dark:ring-white/10">
          <span className="text-rose-700 dark:text-rose-300">{error}</span>
        </div>
      ) : null}

      <BottomSheet insight={selectedInsight} onClose={handleCloseDetail} />
    </div>
  );
}

export default CloudFinderMap;
