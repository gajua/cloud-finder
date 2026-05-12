import type { WeatherAllResponseBody } from "@/lib/weatherAllTypes";

const STORAGE_PREFIX = "csf:weather-all:v1:";
const COOKIE_NAME = "csf_weather_all";
/** 클라이언트 캐시 TTL(ms). 쿠키 Max-Age와 동일하게 유지합니다. */
export const WEATHER_ALL_CLIENT_CACHE_MS = 5 * 60 * 1000;

function storageKey(dateKey: string) {
  return `${STORAGE_PREFIX}${dateKey}`;
}

/**
 * 쿠키에는 `dateKey`·페치 시각만 두고(4KB 제한 회피), 본문은 sessionStorage에 둡니다.
 */
function parseCookieGate(dateKey: string): number | null {
  if (typeof document === "undefined") return null;
  const parts = `; ${document.cookie}`.split(`; ${COOKIE_NAME}=`);
  if (parts.length < 2) return null;
  const value = parts.pop()?.split(";").shift();
  if (!value) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const dot = decoded.lastIndexOf(".");
  if (dot < 0) return null;
  const dk = decoded.slice(0, dot);
  const t = Number(decoded.slice(dot + 1));
  if (dk !== dateKey || !Number.isFinite(t)) return null;
  return t;
}

export function readWeatherAllClientCache(
  dateKey: string,
): WeatherAllResponseBody | null {
  if (typeof window === "undefined") return null;
  const fetchedAt = parseCookieGate(dateKey);
  if (fetchedAt == null) return null;
  if (Date.now() - fetchedAt > WEATHER_ALL_CLIENT_CACHE_MS) return null;
  const raw = sessionStorage.getItem(storageKey(dateKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeatherAllResponseBody;
  } catch {
    return null;
  }
}

export function writeWeatherAllClientCache(
  dateKey: string,
  body: WeatherAllResponseBody,
): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    sessionStorage.setItem(storageKey(dateKey), JSON.stringify(body));
  } catch {
    return;
  }
  const gate = `${encodeURIComponent(dateKey)}.${now}`;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(gate)}; Max-Age=${Math.floor(WEATHER_ALL_CLIENT_CACHE_MS / 1000)}; Path=/; SameSite=Lax`;
}
