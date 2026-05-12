export type SkyCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "fog";

/** 기상청 단기예보 SKY 코드 → UI 상태 (1 맑음, 3 구름많음, 4 흐림) */
export function kmaSkyCodeToCondition(code: number): SkyCondition {
  if (code === 1) return "clear";
  if (code === 3) return "partly_cloudy";
  if (code === 4) return "overcast";
  if (code === 2) return "partly_cloudy";
  return "partly_cloudy";
}

export type MountainWeather = {
  tempCurrent: number;
  tempMinToday: number;
  tempMaxToday: number;
  tempMaxYesterday: number;
  humidity: number;
  windSpeedMs: number;
  sky: SkyCondition;
  rainYesterdayMm: number;
  precipitationForecastMm: number;
  sunriseTime: string;
  fetchedAt: string;
  source: "kma";
};

export function estimateSunriseTime(latitude: number, dateKey: string): string {
  // 실제 천문 계산이 아니라 MVP용 보정치입니다.
  // - 북쪽(위도↑)일수록 약간 늦음
  // - 날짜(계절)에 따라 약간 변동
  const d = new Date(dateKey);
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);

  const baseMinutes = 6 * 60; // 06:00
  const latOffset = Math.round((latitude - 36.5) * 2.2); // 대략 ±4~5분 수준
  const seasonal = Math.round(Math.sin(((dayOfYear - 80) / 365) * Math.PI * 2) * -18); // 겨울 늦고 여름 빠름
  const minutes = Math.max(300, Math.min(450, baseMinutes + latOffset + seasonal)); // 05:00~07:30

  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
