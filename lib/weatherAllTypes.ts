import type { FogComputation } from "@/lib/fogAlgorithm";
import type { MountainWeather } from "@/lib/weather";

/** 산별 일괄 날씨 집계 응답(클라이언트 캐시·스토어·`/api/weather-all` 스키마) */
export type WeatherAllWireWeather = {
  temp: number;
  humidity: number;
  windSpeed: number;
  sky: number;
  precipitation: number;
};

export type WeatherAllWireReasons = {
  humidity: string;
  wind: string;
  sky: string;
  temperature: string;
};

export type WeatherAllMountainSuccess = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  probability: number;
  status: "low" | "medium" | "high";
  weather: WeatherAllWireWeather;
  reasons: WeatherAllWireReasons;
  /** 바텀시트·마커용 정규화 날씨(서버에서만 조립) */
  mountainWeather: MountainWeather;
  fog: FogComputation;
};

export type WeatherAllMountainFailure = {
  id: string;
  name: string;
  error: string;
};

export type WeatherAllMountainRow = WeatherAllMountainSuccess | WeatherAllMountainFailure;

export type WeatherAllResponseBody = {
  dateKey: string;
  mountains: WeatherAllMountainRow[];
};
