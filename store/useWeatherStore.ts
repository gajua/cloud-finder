import { create } from "zustand";

import type { Mountain } from "@/data/mountains";
import { todayDateKeySeoul } from "@/lib/dateSeoul";
import type { FogComputation } from "@/lib/fogAlgorithm";
import { fetchWeatherAllMountainRow } from "@/lib/fetchWeatherAllMountain";
import { tryGetPublicKmaRuntime } from "@/lib/kmaRuntimeConfig";
import {
  mountainsInFetchOrder,
  toYYYYMMDDFromDateKey,
} from "@/lib/weatherAllMountainsOrder";
import type {
  WeatherAllMountainSuccess,
  WeatherAllResponseBody,
  WeatherAllWireReasons,
} from "@/lib/weatherAllTypes";

export type MountainInsight = {
  mountain: Mountain;
  fog: FogComputation;
  /** 단기예보 기반 운해 확률 근거(서술형) */
  fogReasons: WeatherAllWireReasons;
};

/** 로딩 UI 단계: ① API·KMA에서 날씨 수신 ② 응답을 산별 인사이트로 정리 */
export type WeatherLoadStage = "fetching" | "computing";

type WeatherState = {
  weatherData: MountainInsight[];
  loading: boolean;
  loadStage: WeatherLoadStage | null;
  error: string | null;
  selectedMountainId: string | null;
  mountainErrors: Record<string, string>;
  selectMountain: (id: string | null) => void;
  loadWeatherAll: () => Promise<void>;
};

const WEATHER_ALL_TIMEOUT_MS = 120000;
const WEATHER_ALL_ENDPOINT = "/api/weather-all";
/** 2단계 UI가 한 프레임만 깜빡이지 않도록 최소 표시 시간(ms) */
const MIN_COMPUTING_STAGE_MS = 650;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 오늘(서울) 기준 단기예보 조회는 하나뿐 — StrictMode·중복 호출 병합 */
let inFlightTodayWeather: Promise<void> | null = null;

function rowToInsight(row: WeatherAllMountainSuccess): MountainInsight {
  return {
    mountain: {
      id: row.id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
    },
    fog: row.fog,
    fogReasons: row.reasons,
  };
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weatherData: [],
  loading: false,
  loadStage: null,
  error: null,
  selectedMountainId: null,
  mountainErrors: {},

  selectMountain: (id) => {
    set({ selectedMountainId: id });
  },

  loadWeatherAll: async () => {
    const dk = todayDateKeySeoul();

    const existing = inFlightTodayWeather;
    if (existing) {
      await existing;
      return;
    }

    const run = async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        set({
          loading: true,
          loadStage: "fetching",
          error: null,
          mountainErrors: {},
          weatherData: [],
        });

        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), WEATHER_ALL_TIMEOUT_MS);

        const runtime = tryGetPublicKmaRuntime();
        let data: WeatherAllResponseBody;

        if (runtime) {
          const baseDateYYYYMMDD =
            toYYYYMMDDFromDateKey(dk) ?? dk.replaceAll("-", "");
          const list = mountainsInFetchOrder();
          const mountains = await Promise.all(
            list.map((mountain) =>
              fetchWeatherAllMountainRow(
                mountain,
                dk,
                baseDateYYYYMMDD,
                runtime,
                controller.signal,
              ),
            ),
          );
          data = { dateKey: dk, mountains };
        } else {
          const url = `${WEATHER_ALL_ENDPOINT}?dateKey=${encodeURIComponent(dk)}`;
          const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          });
          const parsed = (await res.json()) as WeatherAllResponseBody & {
            error?: string;
          };
          if (!res.ok || !Array.isArray(parsed.mountains)) {
            throw new Error(parsed.error ?? `날씨 일괄 API 실패(${res.status})`);
          }
          data = parsed;
        }

        const computingStartedAt = Date.now();
        set({ loadStage: "computing" });
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        const nextData: MountainInsight[] = [];
        const mountainErrors: Record<string, string> = {};

        for (const row of data.mountains) {
          if ("error" in row) {
            mountainErrors[row.id] = row.error;
          } else {
            nextData.push(rowToInsight(row));
          }
        }

        const computingElapsed = Date.now() - computingStartedAt;
        if (computingElapsed < MIN_COMPUTING_STAGE_MS) {
          await sleep(MIN_COMPUTING_STAGE_MS - computingElapsed);
        }

        const hasSuccess = nextData.length > 0;
        const errValues = Object.values(mountainErrors);
        const errSummary =
          errValues.length > 0 ? errValues.slice(0, 2).join(" | ") : null;

        set({
          weatherData: nextData,
          mountainErrors,
          loading: false,
          loadStage: null,
          error: hasSuccess ? errSummary : errSummary ?? "날씨 데이터를 불러오지 못했습니다.",
        });
      } catch (e) {
        const message =
          e instanceof Error && e.name === "AbortError"
            ? "날씨 요청이 시간 초과되었습니다."
            : e instanceof Error
              ? e.message
              : "날씨 데이터를 불러오지 못했습니다.";
        set({
          loading: false,
          loadStage: null,
          weatherData: [],
          mountainErrors: {},
          error: message,
        });
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        inFlightTodayWeather = null;
      }
    };

    const p = run();
    inFlightTodayWeather = p;
    await p;
  },
}));

/** 지도 마커용: 산 id → 인사이트 */
export function insightsRecordFromWeatherData(
  weatherData: MountainInsight[],
): Record<string, MountainInsight> {
  return Object.fromEntries(weatherData.map((i) => [i.mountain.id, i]));
}
