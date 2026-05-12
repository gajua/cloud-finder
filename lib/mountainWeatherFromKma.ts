import type { Mountain } from "@/data/mountains";
import type { WeatherData } from "@/lib/kmaWeather";
import { estimateSunriseTime, kmaSkyCodeToCondition, type MountainWeather } from "@/lib/weather";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function weatherDataToMountainWeather(params: {
  mountain: Mountain;
  weather: WeatherData;
  source: "kma";
  /** 기상 데이터가 해석되는 달력일(선택한 참조일) */
  dateKey: string;
  /** 일출 시각·계절 보정: 운해를 말하는 **대상일**(예: 참조일 다음날) */
  sunriseDateKey?: string;
}): MountainWeather {
  const { mountain, weather, source, dateKey, sunriseDateKey } = params;

  const sky = kmaSkyCodeToCondition(weather.sky);
  const rainYesterdayMm = weather.precipitation !== 0 ? 10 : 0;
  const precipitationForecastMm = weather.precipitation !== 0 ? 8 : 0;

  const tempCurrent = round1(weather.temp);
  const windSpeedMs = round1(weather.windSpeed);

  return {
    tempCurrent,
    tempMinToday: round1(tempCurrent - 2),
    tempMaxToday: round1(tempCurrent + 2),
    tempMaxYesterday: round1(tempCurrent + 3),
    humidity: Math.round(weather.humidity),
    windSpeedMs,
    sky,
    rainYesterdayMm,
    precipitationForecastMm,
    sunriseTime: estimateSunriseTime(mountain.lat, sunriseDateKey ?? dateKey),
    fetchedAt: new Date().toISOString(),
    source,
  };
}
