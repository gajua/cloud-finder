import type { Mountain } from "@/data/mountains";
import type { KmaRuntimeConfig } from "@/lib/kmaRuntimeConfig";
import { addCalendarDaysToDateKey } from "@/lib/dateSeoul";
import { computeFogSeaProbability, type FogComputation } from "@/lib/fogAlgorithm";
import { latLngToGrid } from "@/lib/coordToGrid";
import { fetchKmaWeatherByGrid } from "@/lib/kmaWeather";
import { weatherDataToMountainWeather } from "@/lib/mountainWeatherFromKma";
import { computeSeaOfCloudsFromIndicators } from "@/lib/serverSeaOfCloudsScore";
import type {
  WeatherAllMountainFailure,
  WeatherAllMountainSuccess,
} from "@/lib/weatherAllTypes";

export async function fetchWeatherAllMountainRow(
  mountain: Mountain,
  dateKey: string,
  baseDateYYYYMMDD: string,
  runtime?: KmaRuntimeConfig | null,
  outerSignal?: AbortSignal,
  options?: {
    /** `getVilageFcst` JSON 수신 시(격자 폴백일 때만) 호출 */
    onVilageFcstJson?: (mountainName: string, payload: unknown) => void;
  },
): Promise<WeatherAllMountainSuccess | WeatherAllMountainFailure> {
  try {
    const { nx, ny } = latLngToGrid(mountain.lat, mountain.lng);
    const result = await fetchKmaWeatherByGrid({
      nx,
      ny,
      targetBaseDateYYYYMMDD: baseDateYYYYMMDD,
      mountainId: mountain.id,
      runtime: runtime ?? undefined,
      outerSignal,
      onVilageFcstJson: options?.onVilageFcstJson
        ? (payload) => options.onVilageFcstJson!(mountain.name, payload)
        : undefined,
    });

    const mountainWeather = weatherDataToMountainWeather({
      mountain,
      weather: result.weather,
      source: "kma",
      /** 기상 조회 기준일(오늘) */
      dateKey,
      /** 운해·일출 맥락은 익일(내일 새벽 관측) */
      sunriseDateKey: addCalendarDaysToDateKey(dateKey, 1),
    });

    const fogBase = computeFogSeaProbability(mountainWeather);
    const { probability, status, reasons } = computeSeaOfCloudsFromIndicators(result.weather);

    const statusLabel: FogComputation["statusLabel"] =
      status === "high" ? "좋음" : status === "medium" ? "보통" : "어려움";

    const fog: FogComputation = {
      ...fogBase,
      probability,
      statusLabel,
    };

    return {
      id: mountain.id,
      name: mountain.name,
      lat: mountain.lat,
      lng: mountain.lng,
      probability,
      status,
      weather: {
        temp: result.weather.temp,
        humidity: result.weather.humidity,
        windSpeed: result.weather.windSpeed,
        sky: result.weather.sky,
        precipitation: result.weather.precipitation,
      },
      reasons,
      mountainWeather,
      fog,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "기상 데이터를 가져오지 못했습니다.";
    return {
      id: mountain.id,
      name: mountain.name,
      error: message,
    };
  }
}
