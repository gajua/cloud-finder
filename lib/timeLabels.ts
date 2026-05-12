import {
  SEOUL_TZ,
  addCalendarDaysToDateKey,
  dateKeyInSeoul,
  noonSeoulFromDateKey,
} from "./dateSeoul";

export type DateOption = {
  key: string;
  label: string;
  weekday: string;
};

/** 내일부터 `days`일간(오늘 칸 없음) */
export function getForecastDateOptions(days = 8): DateOption[] {
  const todayKey = dateKeyInSeoul(new Date());
  const tomorrowKey = addCalendarDaysToDateKey(todayKey, 1);
  const start = noonSeoulFromDateKey(tomorrowKey);

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const key = dateKeyInSeoul(d);
    return {
      key,
      label: new Intl.DateTimeFormat("ko-KR", {
        timeZone: SEOUL_TZ,
        month: "numeric",
        day: "numeric",
      }).format(d),
      weekday: new Intl.DateTimeFormat("ko-KR", {
        timeZone: SEOUL_TZ,
        weekday: "short",
      }).format(d),
    };
  });
}

export function getSunriseLabelForDate(dateKey: string): string {
  const d = noonSeoulFromDateKey(dateKey);
  const dateStr = new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
  return `일출(~06:00) 기준 · ${dateStr}`;
}
