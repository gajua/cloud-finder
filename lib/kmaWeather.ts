import {
  getSeoulHourMinute,
  subtractCalendarDaysFromDateInSeoul,
  yyyymmddHHmmInSeoul,
  yyyymmddInSeoul,
} from "./dateSeoul";
import type { KmaRuntimeConfig } from "./kmaRuntimeConfig";
import { resolveKmaRuntimeFromEnv } from "./kmaRuntimeConfig";

export type WeatherData = {
  temp: number;
  humidity: number;
  windSpeed: number;
  sky: number;
  precipitation: number;
};

export type KmaWeatherSource = "kma";

export type KmaWeatherResult = {
  weather: WeatherData;
  source: KmaWeatherSource;
};

const KMA_VILAGE_FCST_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

/**
 * 산악예보 API(기상청 API허브 typ08 `getMountainWeather`) 요청 파라미터는
 * 활용가이드(2025-03-05 산악예보 API 서비스) 기준으로 다음이 필수입니다.
 * - base_date: 발표일자(KST) YYYYMMDD
 * - base_time: 발표시각(KST) HHmm — 단기예보 발표시각(02·05·08·11·14·17·20·23시)과 동일 계열
 * - mountainNum: 산악예보 지점번호(3자리)
 *
 * 산마다 다른 `mountainNum`이어도 **같은 발표 차수**면 동일 `base_date`/`base_time`으로 응답이 나오므로,
 * 한 번 성공한 발표 시각은 짧은 TTL 동안 재사용해 불필요한 다중 호출·타임아웃을 줄입니다.
 */
const BASE_TIMES = [
  "0200",
  "0500",
  "0800",
  "1100",
  "1400",
  "1700",
  "2000",
  "2300",
] as const;
/** 격자 단기예보(getVilageFcst) 등 일반 호출 */
const KMA_FETCH_TIMEOUT_MS = 12000;
/** 산악예보는 응답이 크거나 허브 지연이 있어 별도 상한(가이드와 무관한 클라이언트 보호) */
const KMA_MOUNTAIN_FETCH_TIMEOUT_MS = 22000;
/** 격자예보 폴백 시 base_time 후보 폭 */
const MAX_BASE_TIME_BACKTRACK_SLOTS = 2;
/** 산악예보(typ08): 산마다 순차 시도 횟수·지연을 줄이기 위해 백트랙을 더 짧게 */
const MAX_MOUNTAIN_BASE_BACKTRACK_SLOTS = 1;

function signalForFetch(
  outer: AbortSignal | undefined,
  innerController: AbortController,
): { signal: AbortSignal; cleanup: () => void } {
  const inner = innerController.signal;
  if (!outer) return { signal: inner, cleanup: () => {} };
  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any([outer, inner]), cleanup: () => {} };
  }
  const onOuter = () => {
    innerController.abort();
  };
  outer.addEventListener("abort", onOuter, { once: true });
  return {
    signal: inner,
    cleanup: () => {
      outer.removeEventListener("abort", onOuter);
    },
  };
}

type MountainBulletinCacheEntry = {
  baseDate: string;
  baseTime: string;
  expiresAtMs: number;
};

const mountainBulletinCache = new Map<string, MountainBulletinCacheEntry>();
const MOUNTAIN_BULLETIN_CACHE_TTL_MS = 12 * 60 * 1000;

type KmaItem = {
  category: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string | number;
  obsrValue?: string | number;
  // some responses contain "value" or similar; keep tolerant parsing.
  [key: string]: unknown;
};

type MountainForecastRecord = Record<string, unknown>;
type KmaResponseShape = {
  response?: {
    body?: {
      items?: {
        item?: unknown;
      } | unknown;
      item?: unknown;
    };
  };
  items?: unknown;
  item?: unknown;
};

function apiHubResultIsError(status: unknown): boolean {
  if (typeof status === "number") return status !== 200 && status !== 0;
  if (typeof status === "string" && status.trim() !== "") {
    const n = Number(status);
    if (Number.isFinite(n)) return n !== 200 && n !== 0;
  }
  return false;
}

/** API허브 JSON( result.status / result.data )·배열·공공데이터포털 XML JSON 등에서 행 배열 추출 */
function extractMountainForecastRowsFromJson(data: unknown): MountainForecastRecord[] {
  if (Array.isArray(data)) return data as MountainForecastRecord[];

  if (!data || typeof data !== "object") return [];

  const root = data as Record<string, unknown>;
  const result = root.result;
  if (result && typeof result === "object") {
    const rr = result as Record<string, unknown>;
    if (apiHubResultIsError(rr.status)) return [];
    for (const key of ["data", "list", "items", "item"] as const) {
      const v = rr[key];
      if (Array.isArray(v)) return v as MountainForecastRecord[];
    }
  }

  for (const key of ["data", "list", "items", "item"] as const) {
    const v = root[key];
    if (Array.isArray(v)) return v as MountainForecastRecord[];
  }

  const parsed = data as KmaResponseShape;
  const nestedItems = parsed.response?.body?.items;
  if (nestedItems != null && typeof nestedItems === "object" && "item" in nestedItems) {
    const it = (nestedItems as { item?: unknown }).item;
    if (Array.isArray(it)) return it as MountainForecastRecord[];
  }
  const maybeRows =
    parsed.response?.body?.item ?? parsed.items ?? parsed.item;
  if (Array.isArray(maybeRows)) return maybeRows as MountainForecastRecord[];

  return [];
}

function parseMaybeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseStringRecordEnv(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const json = JSON.parse(value) as unknown;
    if (!json || typeof json !== "object") return {};
    return Object.fromEntries(
      Object.entries(json as Record<string, unknown>).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/** typ08 `mountainNum` 우선, 없으면 STN 맵 JSON 문자열 사용 (서버·클라 공통) */
export function buildMountainPointMap(
  numByMountainJson?: string,
  stnByMountainJson?: string,
): Record<string, string> {
  const fromNum = parseStringRecordEnv(numByMountainJson);
  if (Object.keys(fromNum).length > 0) return fromNum;
  return parseStringRecordEnv(stnByMountainJson);
}

function mountainPointMapFromRuntime(runtime: KmaRuntimeConfig): Record<string, string> {
  return buildMountainPointMap(
    runtime.mountainNumByMountainJson,
    runtime.mountainStnByMountainJson,
  );
}

function mountainForecastUrlIsTyp08(u: URL): boolean {
  return u.pathname.includes("getMountainWeather");
}

function parseMountainForecastCsv(raw: string): MountainForecastRecord[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("<"));

  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((v) => v.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cells = row.split(",").map((v) => v.trim());
    const rec: MountainForecastRecord = {};
    for (let i = 0; i < header.length; i += 1) rec[header[i]] = cells[i];
    return rec;
  });
}

function normalizeKeyMap(record: MountainForecastRecord): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const normalized = key.replaceAll(/[^a-zA-Z0-9]/g, "").toUpperCase();
    next[normalized] = value;
  }
  return next;
}

function pickFirstNumberByKeyAliases(record: MountainForecastRecord, aliases: string[]): number | null {
  const normalized = normalizeKeyMap(record);
  for (const alias of aliases) {
    const key = alias.replaceAll(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const value = normalized[key];
    const n = parseMaybeNumber(value);
    if (n != null) return n;
  }
  return null;
}

function parseMountainWeatherData(records: MountainForecastRecord[]): WeatherData | null {
  if (records.length === 0) return null;
  const first = records[0];

  const temp = pickFirstNumberByKeyAliases(first, ["TMP", "TA", "TEMP", "T1H"]);
  const humidity = pickFirstNumberByKeyAliases(first, ["REH", "HM", "HUM", "HUMIDITY"]);
  const windSpeed = pickFirstNumberByKeyAliases(first, ["WSD", "WS", "WIND", "WINDSPEED"]);
  const sky = pickFirstNumberByKeyAliases(first, ["SKY", "SKYCODE", "SKY_CONDITION"]) ?? 3;
  const precipitation =
    pickFirstNumberByKeyAliases(first, ["PCP", "PTY", "RN1", "PRECIPITATION"]) ?? 0;

  if (temp == null || humidity == null || windSpeed == null) return null;

  return {
    temp,
    humidity,
    windSpeed,
    sky,
    precipitation,
  };
}

/** 산악예보 typ08: PCP는 문자 범주·mm 문자열·연장구간 정성코드(0~3) 혼재 */
function parseMountainPcpToMm(raw: unknown): number {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (s === "" || s === "-" || s === "강수없음") return 0;
  if (s === "0" || s === "0.0") return 0;
  if (/^[0-3]$/.test(s)) return Number(s);
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  return 0;
}

function toKmaItemsFromTyp08MountainJson(records: MountainForecastRecord[]): KmaItem[] {
  const items: KmaItem[] = [];
  for (const raw of records) {
    const n = normalizeKeyMap(raw);
    const category = String(n.CATEGORY ?? "").trim();
    if (!category) continue;
    const fcstDateRaw = n.FCSTDATE ?? n.FCSTBASE;
    const fcstDate = fcstDateRaw != null ? String(fcstDateRaw).trim() : "";
    const fcstTimeRaw = n.FCSTTIME;
    let fcstTime = fcstTimeRaw != null ? String(fcstTimeRaw).trim() : "";
    if (/^\d{1,3}$/.test(fcstTime)) fcstTime = fcstTime.padStart(4, "0");
    const rawVal = n.FCSTVALUE;
    const fcstValue =
      typeof rawVal === "string" || typeof rawVal === "number" ? rawVal : undefined;
    items.push({ category, fcstDate: fcstDate || undefined, fcstTime: fcstTime || undefined, fcstValue });
  }
  return items;
}

function looksLikeTyp08MountainJson(records: MountainForecastRecord[]): boolean {
  if (records.length === 0) return false;
  const n = normalizeKeyMap(records[0]);
  return typeof n.CATEGORY === "string" && String(n.CATEGORY).length > 0;
}

/** 선택한 달력일이 오늘(서울)이면 현재 시각에 가까운 예보시각, 아니면 대표값 1400 */
function computeDesiredMountainFcstTime(now: Date, targetDateYYYYMMDD: string): number {
  if (targetDateYYYYMMDD !== yyyymmddInSeoul(now)) return 1400;
  const { hour, minute } = getSeoulHourMinute(now);
  let h = Math.round(hour + minute / 60);
  if (h >= 24) h = 23;
  if (h < 0) h = 0;
  return h * 100;
}

function pickClosestMountainPcp(
  items: KmaItem[],
  desiredFcstDate: string | null,
  desiredFcstTime: number,
): number {
  const candidates = items.filter((it) => it.category === "PCP");
  const dateFiltered =
    desiredFcstDate != null && desiredFcstDate !== ""
      ? candidates.filter((it) => it.fcstDate === desiredFcstDate)
      : candidates;
  const pool = dateFiltered.length > 0 ? dateFiltered : candidates;
  if (pool.length === 0) return 0;

  const scored = pool
    .map((it) => {
      const t = it.fcstTime != null ? Number(it.fcstTime) : NaN;
      const diff = Number.isFinite(t) ? Math.abs(t - desiredFcstTime) : Number.POSITIVE_INFINITY;
      return { it, diff };
    })
    .sort((a, b) => a.diff - b.diff);

  const best = scored[0]?.it;
  if (!best) return 0;
  return parseMountainPcpToMm(best.fcstValue ?? best.obsrValue ?? best.value);
}

function parseWeatherFromTyp08Items(
  items: KmaItem[],
  desiredFcstDate: string,
  desiredFcstTime: number,
): WeatherData | null {
  if (items.length === 0) return null;

  const temp = pickClosestItemByCategory({
    items,
    category: "TMP",
    desiredFcstDate,
    desiredFcstTime,
  });
  const humidity = pickClosestItemByCategory({
    items,
    category: "REH",
    desiredFcstDate,
    desiredFcstTime,
  });
  const windSpeed = pickClosestItemByCategory({
    items,
    category: "WSD",
    desiredFcstDate,
    desiredFcstTime,
  });
  const sky = pickClosestItemByCategory({
    items,
    category: "SKY",
    desiredFcstDate,
    desiredFcstTime,
  });

  if (temp == null || humidity == null || windSpeed == null || sky == null) return null;

  const precipitation = pickClosestMountainPcp(items, desiredFcstDate, desiredFcstTime);

  return {
    temp,
    humidity,
    windSpeed,
    sky,
    precipitation,
  };
}

function getBaseTimeCandidates(now: Date) {
  const { hour, minute } = getSeoulHourMinute(now);
  const nowMinutes = hour * 60 + minute;
  const toMinutes = (hhmm: string) => {
    const h = Number(hhmm.slice(0, 2));
    const m = Number(hhmm.slice(2, 4));
    return h * 60 + m;
  };

  let idx = -1;
  for (let i = 0; i < BASE_TIMES.length; i += 1) {
    const tMin = toMinutes(BASE_TIMES[i]);
    if (tMin <= nowMinutes) idx = i;
  }

  // closest "available" on current time axis.
  // If now is earlier than first base time, we keep "0200" behavior only for non-today requests;
  // actual date shifting is handled by caller.
  if (idx === -1) idx = 0;
  return { idx };
}

function mountainBulletinCacheKey(targetBaseDateYYYYMMDD: string, now: Date): string {
  const seoulToday = yyyymmddInSeoul(now);
  const { idx } = getBaseTimeCandidates(now);
  return `${targetBaseDateYYYYMMDD}|${seoulToday}|${idx}`;
}

function orderMountainCandidatesWithPreferred(
  candidates: Array<{ baseDate: string; baseTime: string }>,
  preferred: { baseDate: string; baseTime: string } | null,
): Array<{ baseDate: string; baseTime: string }> {
  if (!preferred) return candidates;
  const key = (c: { baseDate: string; baseTime: string }) => `${c.baseDate}:${c.baseTime}`;
  const pk = key(preferred);
  const rest = candidates.filter((c) => key(c) !== pk);
  return [preferred, ...rest];
}

function computeBaseDateTime(params: {
  now: Date;
  targetBaseDateYYYYMMDD: string;
  maxBacktrackSlots?: number;
}): Array<{ baseDate: string; baseTime: string }> {
  const { now, targetBaseDateYYYYMMDD, maxBacktrackSlots } = params;
  const targetNowKey = yyyymmddInSeoul(now);

  const { idx } = getBaseTimeCandidates(now);

  const candidates: Array<{ baseDate: string; baseTime: string }> = [];

  // If targetBaseDate is today, allow shifting to previous day for 2300 retry cases.
  const allowPreviousDayShift = targetBaseDateYYYYMMDD === targetNowKey;

  // First candidate: same targetBaseDate with chosen baseTime idx (floor behavior).
  const firstTime = BASE_TIMES[idx];
  candidates.push({ baseDate: targetBaseDateYYYYMMDD, baseTime: firstTime });

  // Retries: walk backward through base times; if we go "before" first slot, shift date (optional).
  let backtrackCount = 0;
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (maxBacktrackSlots != null && backtrackCount >= maxBacktrackSlots) break;
    candidates.push({ baseDate: targetBaseDateYYYYMMDD, baseTime: BASE_TIMES[i] });
    backtrackCount += 1;
  }

  if (allowPreviousDayShift) {
    // If caller needs an even older slot, use previous day 2300.
    candidates.push({
      baseDate: yyyymmddInSeoul(subtractCalendarDaysFromDateInSeoul(now, 1)),
      baseTime: "2300",
    });
  }

  // Deduplicate (in case of same element).
  const uniq = new Map<string, { baseDate: string; baseTime: string }>();
  for (const c of candidates) uniq.set(`${c.baseDate}:${c.baseTime}`, c);
  return [...uniq.values()];
}

function pickClosestItemByCategory(params: {
  items: KmaItem[];
  category: string;
  desiredFcstTime?: number | null;
  desiredFcstDate?: string | null;
}): number | null {
  const { items, category, desiredFcstTime, desiredFcstDate } = params;

  const candidates = items.filter((it) => it.category === category);
  const dateFiltered =
    desiredFcstDate != null
      ? candidates.filter((it) => it.fcstDate === desiredFcstDate)
      : candidates;

  const pool = dateFiltered.length > 0 ? dateFiltered : candidates;
  if (pool.length === 0) return null;

  if (desiredFcstTime == null) {
    const first = pool[0];
    const n = parseMaybeNumber(first.fcstValue ?? first.obsrValue ?? first.value);
    return n;
  }

  const scored = pool
    .map((it) => {
      const t = it.fcstTime != null ? Number(it.fcstTime) : NaN;
      const diff = Number.isFinite(t) ? Math.abs(t - desiredFcstTime) : Number.POSITIVE_INFINITY;
      return { it, diff };
    })
    .sort((a, b) => a.diff - b.diff);

  const best = scored[0]?.it;
  if (!best) return null;
  return parseMaybeNumber(best.fcstValue ?? best.obsrValue ?? best.value);
}

async function fetchKmaRequest(params: {
  serviceKey: string;
  baseDateYYYYMMDD: string;
  baseTimeHHmm: string;
  nx: number;
  ny: number;
  outerSignal?: AbortSignal;
}): Promise<KmaItem[] | null> {
  const { serviceKey, baseDateYYYYMMDD, baseTimeHHmm, nx, ny, outerSignal } = params;

  if (outerSignal?.aborted) return null;

  const url = new URL(KMA_VILAGE_FCST_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDateYYYYMMDD);
  url.searchParams.set("base_time", baseTimeHHmm);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KMA_FETCH_TIMEOUT_MS);
  const { signal, cleanup } = signalForFetch(outerSignal, controller);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      signal,
    });
  } catch {
    return null;
  } finally {
    cleanup();
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    return null;
  }

  const data: unknown = await res.json();
  const parsed = data as KmaResponseShape;
  const nestedItems = parsed.response?.body?.items;
  const items =
    nestedItems != null && typeof nestedItems === "object" && "item" in nestedItems
      ? (nestedItems as { item?: unknown }).item
      : undefined;
  if (!Array.isArray(items)) return null;

  return items as KmaItem[];
}

async function parseMountainForecastResponse(
  res: Response,
  parseOpts?: { desiredFcstDate: string; desiredFcstTime: number },
): Promise<WeatherData | null> {
  const contentType = res.headers.get("content-type") ?? "";
  let records: MountainForecastRecord[] = [];

  if (contentType.includes("application/json")) {
    const data: unknown = await res.json();
    records = extractMountainForecastRowsFromJson(data);
  } else {
    const text = await res.text();
    records = parseMountainForecastCsv(text);
  }

  if (parseOpts && looksLikeTyp08MountainJson(records)) {
    const items = toKmaItemsFromTyp08MountainJson(records);
    return parseWeatherFromTyp08Items(
      items,
      parseOpts.desiredFcstDate,
      parseOpts.desiredFcstTime,
    );
  }

  return parseMountainWeatherData(records);
}

/**
 * 브라우저·서버 공통: 산악예보 URL 템플릿과 API허브 authKey로 조회.
 * (클라이언트 사용 시 인증키는 번들에 노출되므로 배포 시 유의)
 */
export async function fetchKmaMountainWeatherFromTemplate(params: {
  mountainTemplateUrl: string;
  authKey: string;
  mountainNum: string;
  mountainId: string;
  targetBaseDateYYYYMMDD: string;
  now?: Date;
  outerSignal?: AbortSignal;
}): Promise<WeatherData | null> {
  const {
    mountainTemplateUrl,
    authKey,
    mountainNum,
    mountainId,
    targetBaseDateYYYYMMDD,
    now: nowArg,
    outerSignal,
  } = params;
  const now = nowArg ?? new Date();
  if (outerSignal?.aborted) return null;

  let template: URL;
  try {
    template = new URL(mountainTemplateUrl);
  } catch {
    return null;
  }

  if (mountainForecastUrlIsTyp08(template)) {
    const candidates = computeBaseDateTime({
      now,
      targetBaseDateYYYYMMDD,
      maxBacktrackSlots: MAX_MOUNTAIN_BASE_BACKTRACK_SLOTS,
    });
    const desiredFcstTime = computeDesiredMountainFcstTime(now, targetBaseDateYYYYMMDD);

    const bulletinKey = mountainBulletinCacheKey(targetBaseDateYYYYMMDD, now);
    const cached = mountainBulletinCache.get(bulletinKey);
    const nowMs = now.getTime();
    const preferred =
      cached && cached.expiresAtMs > nowMs
        ? { baseDate: cached.baseDate, baseTime: cached.baseTime }
        : null;
    const orderedCandidates = orderMountainCandidatesWithPreferred(candidates, preferred);

    for (const { baseDate, baseTime } of orderedCandidates) {
      const url = new URL(`${template.origin}${template.pathname}`);
      template.searchParams.forEach((value, key) => {
        const k = key.toLowerCase();
        if (["mountainnum", "base_date", "base_time", "authkey"].includes(k)) return;
        url.searchParams.set(key, value);
      });
      url.searchParams.set("mountainNum", mountainNum);
      url.searchParams.set("base_date", baseDate);
      url.searchParams.set("base_time", baseTime);
      url.searchParams.set("authKey", authKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), KMA_MOUNTAIN_FETCH_TIMEOUT_MS);
      const { signal, cleanup } = signalForFetch(outerSignal, controller);
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          signal,
        });
      } catch {
        continue;
      } finally {
        cleanup();
        clearTimeout(timeoutId);
      }
      if (!res.ok) continue;
      const weather = await parseMountainForecastResponse(res, {
        desiredFcstDate: targetBaseDateYYYYMMDD,
        desiredFcstTime,
      });
      if (weather) {
        mountainBulletinCache.set(bulletinKey, {
          baseDate,
          baseTime,
          expiresAtMs: nowMs + MOUNTAIN_BULLETIN_CACHE_TTL_MS,
        });
        console.log("[kma] 산악예보(typ08)", {
          mountainId,
          mountainNum,
          baseDate,
          baseTime,
          targetDate: targetBaseDateYYYYMMDD,
          desiredFcstTime,
          weather,
        });
        return weather;
      }
    }
    return null;
  }

  const tm2 = yyyymmddHHmmInSeoul(now);
  const tm1 = yyyymmddHHmmInSeoul(new Date(now.getTime() - 60 * 60 * 1000));

  const url = new URL(mountainTemplateUrl);
  url.searchParams.set("tm1", tm1);
  url.searchParams.set("tm2", tm2);
  url.searchParams.set("stn", mountainNum);
  url.searchParams.set("disp", "0");
  url.searchParams.set("help", "0");
  url.searchParams.set("authKey", authKey);
  url.searchParams.set("key", authKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KMA_MOUNTAIN_FETCH_TIMEOUT_MS);
  const { signal, cleanup } = signalForFetch(outerSignal, controller);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal,
    });
  } catch {
    return null;
  } finally {
    cleanup();
    clearTimeout(timeoutId);
  }
  if (!res.ok) return null;

  const legacyWeather = await parseMountainForecastResponse(res);
  if (legacyWeather) {
    console.log("[kma] 산악예보(legacy)", {
      mountainId,
      stn: mountainNum,
      targetDate: targetBaseDateYYYYMMDD,
      weather: legacyWeather,
    });
  }
  return legacyWeather;
}

async function fetchKmaMountainForecast(params: {
  runtime: KmaRuntimeConfig;
  mountainId?: string;
  now: Date;
  targetBaseDateYYYYMMDD: string;
  outerSignal?: AbortSignal;
}): Promise<WeatherData | null> {
  const { runtime, mountainId, now, targetBaseDateYYYYMMDD, outerSignal } = params;
  if (!mountainId) return null;

  const pointMap = mountainPointMapFromRuntime(runtime);
  const point = pointMap[mountainId];
  if (!point) return null;

  return fetchKmaMountainWeatherFromTemplate({
    mountainTemplateUrl: runtime.mountainApiUrl,
    authKey: runtime.apiHubAuthKey,
    mountainNum: point,
    mountainId,
    targetBaseDateYYYYMMDD,
    now,
    outerSignal,
  });
}

function parseWeatherDataFromItems(params: {
  items: KmaItem[];
  desiredFcstDate: string;
  desiredFcstTime: number;
}): WeatherData | null {
  const { items, desiredFcstDate, desiredFcstTime } = params;

  const temp = pickClosestItemByCategory({
    items,
    category: "TMP",
    desiredFcstDate,
    desiredFcstTime,
  });
  const humidity = pickClosestItemByCategory({
    items,
    category: "REH",
    desiredFcstDate,
    desiredFcstTime,
  });
  const windSpeed = pickClosestItemByCategory({
    items,
    category: "WSD",
    desiredFcstDate,
    desiredFcstTime,
  });
  const sky = pickClosestItemByCategory({
    items,
    category: "SKY",
    desiredFcstDate,
    desiredFcstTime,
  });
  const precipitation = pickClosestItemByCategory({
    items,
    category: "PTY",
    desiredFcstDate,
    desiredFcstTime,
  });

  if (temp == null || humidity == null || windSpeed == null || sky == null) {
    return null;
  }

  return {
    temp,
    humidity,
    windSpeed,
    sky,
    precipitation: precipitation ?? 0,
  };
}

/**
 * Fetch KMA (data.go.kr) short-term village forecast via `getVilageFcst`.
 * - Chooses base_time based on current server time.
 * - Retries with older base_time when response is empty/invalid.
 * - Throws when API/데이터가 유효하지 않을 때 (mock 사용 안 함).
 */
export async function fetchKmaWeatherByGrid(params: {
  nx: number;
  ny: number;
  targetBaseDateYYYYMMDD: string;
  mountainId?: string;
  now?: Date;
  /** 명시하지 않으면 `resolveKmaRuntimeFromEnv()`(서버 전용 키 우선)를 사용합니다. */
  runtime?: KmaRuntimeConfig | null;
  /** 일괄 조회 등 상위에서 타임아웃을 걸 때 전달합니다. */
  outerSignal?: AbortSignal;
}): Promise<KmaWeatherResult> {
  const {
    nx,
    ny,
    targetBaseDateYYYYMMDD,
    mountainId,
    now,
    runtime: runtimeArg,
    outerSignal,
  } = params;

  const runtime = runtimeArg ?? resolveKmaRuntimeFromEnv();
  if (!runtime) {
    throw new Error(
      "KMA_SERVICE_KEY(서버) 또는 NEXT_PUBLIC_KMA_SERVICE_KEY(브라우저)가 설정되지 않았습니다.",
    );
  }

  const nowDate = now ?? new Date();

  // 1) 산악예보 우선 시도
  const mountainWeather = await fetchKmaMountainForecast({
    runtime,
    mountainId,
    now: nowDate,
    targetBaseDateYYYYMMDD,
    outerSignal,
  });
  if (mountainWeather) {
    return { weather: mountainWeather, source: "kma" };
  }

  // 2) 기존 격자예보 폴백
  const candidates = computeBaseDateTime({
    now: nowDate,
    targetBaseDateYYYYMMDD,
    maxBacktrackSlots: MAX_BASE_TIME_BACKTRACK_SLOTS,
  });

  // For fcstTime selection we anchor to the chosen base_time (MVP).
  const desiredFcstTime = Number(candidates[0]?.baseTime ?? BASE_TIMES[0]);

  // Try candidates in order (newer => older).
  for (let i = 0; i < candidates.length; i += 1) {
    const { baseDate, baseTime } = candidates[i];
    const desired = Number(baseTime);
    const items = await fetchKmaRequest({
      serviceKey: runtime.serviceKey,
      baseDateYYYYMMDD: baseDate,
      baseTimeHHmm: baseTime,
      nx,
      ny,
      outerSignal,
    });

    if (!items || items.length === 0) continue;

    const weather = parseWeatherDataFromItems({
      items,
      desiredFcstDate: baseDate,
      desiredFcstTime: Number.isFinite(desired) ? desired : desiredFcstTime,
    });

    if (!weather) continue;

    return { weather, source: "kma" };
  }
  throw new Error("기상청 단기예보에서 유효한 날씨 데이터를 찾지 못했습니다.");
}

