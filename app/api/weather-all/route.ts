import type { NextRequest } from "next/server";

import { todayDateKeySeoul } from "@/lib/dateSeoul";
import { fetchWeatherAllMountainRow } from "@/lib/fetchWeatherAllMountain";
import { resolveKmaRuntimeFromEnv } from "@/lib/kmaRuntimeConfig";
import {
  mountainsInFetchOrder,
  toYYYYMMDDFromDateKey,
} from "@/lib/weatherAllMountainsOrder";
import type { WeatherAllResponseBody } from "@/lib/weatherAllTypes";

/**
 * `NEXT_PUBLIC_KMA_SERVICE_KEY` 없이 배포할 때 클라이언트가 사용하는 서버 집계 경로.
 */
export async function GET(req: NextRequest) {
  try {
    const runtime = resolveKmaRuntimeFromEnv();
    if (!runtime) {
      return Response.json(
        { error: "KMA_SERVICE_KEY 환경변수가 설정되지 않았습니다.", dateKey: "", mountains: [] },
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const dateKey = req.nextUrl.searchParams.get("dateKey") ?? todayDateKeySeoul();
    const baseDateYYYYMMDD =
      toYYYYMMDDFromDateKey(dateKey) ?? dateKey.replaceAll("-", "");

    const list = mountainsInFetchOrder();
    const mountains = await Promise.all(
      list.map((mountain) =>
        fetchWeatherAllMountainRow(mountain, dateKey, baseDateYYYYMMDD, runtime),
      ),
    );

    const body: WeatherAllResponseBody = { dateKey, mountains };

    return Response.json(body, {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : "weather-all failed",
        dateKey: todayDateKeySeoul(),
        mountains: [],
      },
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
