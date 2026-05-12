/** 앱 전역: 캘린더/표시는 Asia/Seoul 기준으로 통일 (SSR·클라이언트·UTC 혼선 방지) */
export const SEOUL_TZ = "Asia/Seoul";

export function dateKeyInSeoul(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayDateKeySeoul(): string {
  return dateKeyInSeoul(new Date());
}

/** 서울 달력 기준 내일 `YYYY-MM-DD` (운해 지도는 항상 이 날짜만 사용) */
export function tomorrowDateKeySeoul(): string {
  return addCalendarDaysToDateKey(todayDateKeySeoul(), 1);
}

/** `YYYY-MM-DD`를 서울 달력 그날 정오로 해석 (UTC 자정 파싱으로 하루 어긋남 방지) */
export function noonSeoulFromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00+09:00`);
}

/** 서울 달력 기준으로 `days`일 전의 같은 시각(정오 앵커) */
export function subtractCalendarDaysFromDateInSeoul(d: Date, days: number): Date {
  const key = dateKeyInSeoul(d);
  const noon = new Date(`${key}T12:00:00+09:00`);
  return new Date(noon.getTime() - days * 86400000);
}

/** `YYYY-MM-DD`에 서울 달력 기준 `days`일을 더한 날짜 키 */
export function addCalendarDaysToDateKey(dateKey: string, days: number): string {
  const noon = noonSeoulFromDateKey(dateKey);
  return dateKeyInSeoul(new Date(noon.getTime() + days * 86400000));
}

export function yyyymmddInSeoul(d: Date): string {
  return dateKeyInSeoul(d).replaceAll("-", "");
}

export function getSeoulHourMinute(now: Date): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: SEOUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

/** API허브 등에서 쓰는 `YYYYMMDDHHmm` (서울 시각) */
export function yyyymmddHHmmInSeoul(d: Date): string {
  const day = dateKeyInSeoul(d).replaceAll("-", "");
  const { hour, minute } = getSeoulHourMinute(d);
  return `${day}${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
}
