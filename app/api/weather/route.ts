import type { NextRequest } from "next/server";

import { latLngToGrid } from "@/lib/coordToGrid";
import { todayDateKeySeoul } from "@/lib/dateSeoul";
import { fetchKmaWeatherByGrid, type WeatherData } from "@/lib/kmaWeather";
import { resolveKmaRuntimeFromEnv } from "@/lib/kmaRuntimeConfig";

/** 새로고침·매 요청마다 KMA까지 다시 호출(ISR/세그먼트 캐시 비활성) */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_NO_STORE = {
  "content-type": "application/json",
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
} as const;

function toYYYYMMDD(dateKey: string): string | null {
  // expected: YYYY-MM-DD
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}

function safeParseNumber(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const url = new URL(req.url);
    const lat = safeParseNumber(url.searchParams.get("lat"));
    const lng = safeParseNumber(url.searchParams.get("lng"));

    if (lat == null || lng == null) {
      console.warn("[api/weather] bad_request", { reason: "lat/lng missing or invalid" });
      return new Response(JSON.stringify({ error: "lat/lng are required" }), {
        status: 400,
        headers: JSON_NO_STORE,
      });
    }

    const dateKey = url.searchParams.get("dateKey") ?? todayDateKeySeoul();
    const mountainId = url.searchParams.get("mountainId") ?? undefined;
    const baseDateYYYYMMDD = toYYYYMMDD(dateKey) ?? dateKey.replaceAll("-", "");

    const { nx, ny } = latLngToGrid(lat, lng);

    const runtime = resolveKmaRuntimeFromEnv();
    console.log("[api/weather] start", {
      lat,
      lng,
      nx,
      ny,
      dateKey,
      mountainId: mountainId ?? null,
      baseDateYYYYMMDD,
      hasKmaRuntime: Boolean(runtime),
    });

    if (!runtime) {
      console.error("[api/weather] no_runtime", {
        hint: "set KMA_SERVICE_KEY (or NEXT_PUBLIC_KMA_SERVICE_KEY on server)",
      });
      return new Response(
        JSON.stringify({ error: "KMA_SERVICE_KEY 환경변수가 설정되지 않았습니다." }),
        { status: 500, headers: JSON_NO_STORE },
      );
    }

    const result = await fetchKmaWeatherByGrid({
      nx,
      ny,
      targetBaseDateYYYYMMDD: baseDateYYYYMMDD,
      mountainId,
      runtime,
    });

    console.log("[api/weather] ok", {
      ms: Date.now() - startedAt,
      source: result.source,
      nx,
      ny,
      temp: result.weather.temp,
      sky: result.weather.sky,
    });

    // normalized weather JSON for client store
    return new Response(
      JSON.stringify({
        weather: result.weather as WeatherData,
        source: result.source,
        nx,
        ny,
      }),
      { headers: JSON_NO_STORE },
    );
  } catch (e) {
    console.error("[api/weather] error", {
      ms: Date.now() - startedAt,
      message: e instanceof Error ? e.message : String(e),
    });
    // last-resort error response; UI must not crash.
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "weather fetch failed",
      }),
      { status: 500, headers: JSON_NO_STORE },
    );
  }
}
