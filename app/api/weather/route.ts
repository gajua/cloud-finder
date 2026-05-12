import type { NextRequest } from "next/server";

import { todayDateKeySeoul } from "@/lib/dateSeoul";
import { latLngToGrid } from "@/lib/coordToGrid";
import { fetchKmaWeatherByGrid, type WeatherData } from "@/lib/kmaWeather";
import { resolveKmaRuntimeFromEnv } from "@/lib/kmaRuntimeConfig";

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
  try {
    const url = new URL(req.url);
    const lat = safeParseNumber(url.searchParams.get("lat"));
    const lng = safeParseNumber(url.searchParams.get("lng"));

    if (lat == null || lng == null) {
      return new Response(JSON.stringify({ error: "lat/lng are required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const dateKey = url.searchParams.get("dateKey") ?? todayDateKeySeoul();
    const mountainId = url.searchParams.get("mountainId") ?? undefined;
    const baseDateYYYYMMDD = toYYYYMMDD(dateKey) ?? dateKey.replaceAll("-", "");

    const { nx, ny } = latLngToGrid(lat, lng);

    const runtime = resolveKmaRuntimeFromEnv();
    if (!runtime) {
      return new Response(
        JSON.stringify({ error: "KMA_SERVICE_KEY 환경변수가 설정되지 않았습니다." }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const result = await fetchKmaWeatherByGrid({
      nx,
      ny,
      targetBaseDateYYYYMMDD: baseDateYYYYMMDD,
      mountainId,
      runtime,
    });

    // normalized weather JSON for client store
    return new Response(
      JSON.stringify({
        weather: result.weather as WeatherData,
        source: result.source,
        nx,
        ny,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    // last-resort error response; UI must not crash.
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "weather fetch failed",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

