import { create } from "zustand";

import type { Mountain } from "@/data/mountains";
import { addCalendarDaysToDateKey, todayDateKeySeoul } from "@/lib/dateSeoul";
import type { FogComputation } from "@/lib/fogAlgorithm";
import type { MountainWeather } from "@/lib/weather";
import { fetchWeatherAllMountainRow } from "@/lib/fetchWeatherAllMountain";
import { tryGetPublicKmaRuntime } from "@/lib/kmaRuntimeConfig";
import {
  mountainsInFetchOrder,
  toYYYYMMDDFromDateKey,
} from "@/lib/weatherAllMountainsOrder";
import {
  readWeatherAllClientCache,
  writeWeatherAllClientCache,
} from "@/lib/weatherClientCache";
import type { WeatherAllMountainSuccess, WeatherAllResponseBody } from "@/lib/weatherAllTypes";

export type MountainInsight = {
  mountain: Mountain;
  weather: MountainWeather;
  fog: FogComputation;
};

type WeatherState = {
  weatherData: MountainInsight[];
  loading: boolean;
  error: string | null;
  selectedMountainId: string | null;
  selectedDateKey: string;
  mountainErrors: Record<string, string>;
  selectMountain: (id: string | null) => void;
  selectDate: (dateKey: string) => void;
  loadWeatherAll: (dateKeyOverride?: string) => Promise<void>;
};

const WEATHER_ALL_TIMEOUT_MS = 120000;
const WEATHER_ALL_ENDPOINT = "/api/weather-all";

/** 동일 dateKey에 대한 StrictMode·중복 호출 병합 */
const inFlightByDateKey = new Map<string, Promise<void>>();

function dateKeyToYYYYMMDD(dateKey: string): boolean {
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(dateKey);
}

function rowToInsight(row: WeatherAllMountainSuccess): MountainInsight {
  return {
    mountain: {
      id: row.id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
    },
    weather: row.mountainWeather,
    fog: row.fog,
  };
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  weatherData: [],
  loading: false,
  error: null,
  selectedMountainId: null,
  selectedDateKey: addCalendarDaysToDateKey(todayDateKeySeoul(), 1),
  mountainErrors: {},

  selectMountain: (id) => {
    set({ selectedMountainId: id });
  },

  selectDate: (dateKey) => {
    const dk = dateKeyToYYYYMMDD(dateKey)
      ? dateKey
      : addCalendarDaysToDateKey(todayDateKeySeoul(), 1);
    if (dk === get().selectedDateKey) return;
    set({ selectedDateKey: dk });
  },

  loadWeatherAll: async (dateKeyOverride) => {
    const requested =
      dateKeyOverride ??
      get().selectedDateKey ??
      todayDateKeySeoul();
    const dk = dateKeyToYYYYMMDD(requested) ? requested : todayDateKeySeoul();

    const existing = inFlightByDateKey.get(dk);
    if (existing) {
      await existing;
      return;
    }

    const run = async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const cached = readWeatherAllClientCache(dk);
        if (cached && get().selectedDateKey === dk) {
          const nextData: MountainInsight[] = [];
          const mountainErrors: Record<string, string> = {};

          for (const row of cached.mountains) {
            if ("error" in row) {
              mountainErrors[row.id] = row.error;
            } else {
              nextData.push(rowToInsight(row));
            }
          }

          const hasSuccess = nextData.length > 0;
          const errValues = Object.values(mountainErrors);
          const errSummary =
            errValues.length > 0 ? errValues.slice(0, 2).join(" | ") : null;

          set({
            weatherData: nextData,
            mountainErrors,
            loading: false,
            error: hasSuccess ? errSummary : errSummary ?? "날씨 데이터를 불러오지 못했습니다.",
          });
          return;
        }

        set({
          loading: true,
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

        if (get().selectedDateKey !== dk) {
          return;
        }

        writeWeatherAllClientCache(dk, data);

        const nextData: MountainInsight[] = [];
        const mountainErrors: Record<string, string> = {};

        for (const row of data.mountains) {
          if ("error" in row) {
            mountainErrors[row.id] = row.error;
          } else {
            nextData.push(rowToInsight(row));
          }
        }

        const hasSuccess = nextData.length > 0;
        const errValues = Object.values(mountainErrors);
        const errSummary =
          errValues.length > 0 ? errValues.slice(0, 2).join(" | ") : null;

        set({
          weatherData: nextData,
          mountainErrors,
          loading: false,
          error: hasSuccess ? errSummary : errSummary ?? "날씨 데이터를 불러오지 못했습니다.",
        });
      } catch (e) {
        if (get().selectedDateKey !== dk) {
          return;
        }
        const message =
          e instanceof Error && e.name === "AbortError"
            ? "날씨 요청이 시간 초과되었습니다."
            : e instanceof Error
              ? e.message
              : "날씨 데이터를 불러오지 못했습니다.";
        set({
          loading: false,
          weatherData: [],
          mountainErrors: {},
          error: message,
        });
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        inFlightByDateKey.delete(dk);
      }
    };

    const p = run();
    inFlightByDateKey.set(dk, p);
    await p;
  },
}));

/** 지도 마커용: 산 id → 인사이트 */
export function insightsRecordFromWeatherData(
  weatherData: MountainInsight[],
): Record<string, MountainInsight> {
  return Object.fromEntries(weatherData.map((i) => [i.mountain.id, i]));
}
