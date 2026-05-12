import type { Mountain } from "@/data/mountains";
import type { KmaRuntimeConfig } from "@/lib/kmaRuntimeConfig";
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
    });

    const mountainWeather = weatherDataToMountainWeather({
      mountain,
      weather: result.weather,
      source: "kma",
      dateKey,
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
