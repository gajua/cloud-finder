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
 * 새로고침·매 요청마다 KMA까지 다시 호출(ISR/세그먼트 캐시 비활성).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "content-type": "application/json",
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
} as const;

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const runtime = resolveKmaRuntimeFromEnv();
    if (!runtime) {
      console.error("[api/weather-all] no_runtime", {
        hint: "set KMA_SERVICE_KEY on the server",
      });
      return Response.json(
        { error: "KMA_SERVICE_KEY 환경변수가 설정되지 않았습니다.", dateKey: "", mountains: [] },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    const dateKey = req.nextUrl.searchParams.get("dateKey") ?? todayDateKeySeoul();
    const baseDateYYYYMMDD =
      toYYYYMMDDFromDateKey(dateKey) ?? dateKey.replaceAll("-", "");

    const list = mountainsInFetchOrder();
    console.log("[api/weather-all] start", {
      dateKey,
      baseDateYYYYMMDD,
      mountainCount: list.length,
    });

    const mountains = await Promise.all(
      list.map((mountain) =>
        fetchWeatherAllMountainRow(mountain, dateKey, baseDateYYYYMMDD, runtime, undefined, {
          onVilageFcstJson: (name, data) => {
            console.log(
              name,
              (data as { response?: { header?: unknown } }).response?.header,
            );
          },
        }),
      ),
    );

    const ok = mountains.filter((r) => !("error" in r)).length;
    const fail = mountains.length - ok;
    const failedIds = mountains
      .filter((r): r is { id: string; name: string; error: string } => "error" in r)
      .map((r) => r.id);

    console.log("[api/weather-all] ok", {
      ms: Date.now() - startedAt,
      dateKey,
      successCount: ok,
      failCount: fail,
      failedMountainIds: failedIds,
    });

    const body: WeatherAllResponseBody = { dateKey, mountains };

    return Response.json(body, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error("[api/weather-all] error", {
      ms: Date.now() - startedAt,
      message: e instanceof Error ? e.message : String(e),
    });
    return Response.json(
      {
        error: e instanceof Error ? e.message : "weather-all failed",
        dateKey: todayDateKeySeoul(),
        mountains: [],
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
