/**
 * 기상청 호출에 필요한 런타임 설정(서버 `KMA_*` / 브라우저 `NEXT_PUBLIC_KMA_*`).
 * 브라우저에서 호출 시 인증키가 번들에 포함되므로 배포 시 유의합니다.
 */
export type KmaRuntimeConfig = {
  serviceKey: string;
  apiHubAuthKey: string;
  mountainApiUrl: string;
  mountainNumByMountainJson?: string;
  mountainStnByMountainJson?: string;
};

const DEFAULT_MOUNTAIN_API_URL =
  "https://apihub.kma.go.kr/api/typ08/getMountainWeather";

/** typ08 산악예보 `mountainNum`(기상청 산악지점 표). 소요산(정상)=48 */
export const DEFAULT_KMA_MOUNTAIN_STN_JSON =
  '{"bukhansan":"40","dobongsan":"47","soyosan":"48","gwanaksan":"125","seoraksan":"1","jirisan":"86","deogyusan":"77","chiaksan":"5"}';

function trimOrUndefined(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

/**
 * 서버·클라 공통: 비공개 키 우선, 없으면 `NEXT_PUBLIC_*` (로컬·엣지 호환).
 */
export function resolveKmaRuntimeFromEnv(): KmaRuntimeConfig | null {
  const serviceKey = trimOrUndefined(
    process.env.KMA_SERVICE_KEY ?? process.env.NEXT_PUBLIC_KMA_SERVICE_KEY,
  );
  if (!serviceKey) return null;

  const hub =
    trimOrUndefined(
      process.env.KMA_APIHUB_AUTH_KEY ?? process.env.NEXT_PUBLIC_KMA_APIHUB_AUTH_KEY,
    ) ?? serviceKey;

  const mountainApiUrl =
    trimOrUndefined(
      process.env.KMA_MOUNTAIN_API_URL ?? process.env.NEXT_PUBLIC_KMA_MOUNTAIN_API_URL,
    ) ?? DEFAULT_MOUNTAIN_API_URL;

  return {
    serviceKey,
    apiHubAuthKey: hub,
    mountainApiUrl,
    mountainNumByMountainJson: trimOrUndefined(
      process.env.KMA_MOUNTAIN_NUM_BY_MOUNTAIN ??
        process.env.NEXT_PUBLIC_KMA_MOUNTAIN_NUM_BY_MOUNTAIN,
    ),
    mountainStnByMountainJson: trimOrUndefined(
      process.env.KMA_MOUNTAIN_STN_BY_MOUNTAIN ??
        process.env.NEXT_PUBLIC_KMA_MOUNTAIN_STN_BY_MOUNTAIN,
    ),
  };
}

/**
 * 브라우저 직접 호출용 설정. `NEXT_PUBLIC_KMA_SERVICE_KEY`가 없으면 `null`입니다.
 * (없을 때는 `/api/weather-all` 서버 폴백을 쓰세요.)
 */
export function tryGetPublicKmaRuntime(): KmaRuntimeConfig | null {
  const serviceKey = trimOrUndefined(process.env.NEXT_PUBLIC_KMA_SERVICE_KEY);
  if (!serviceKey) return null;

  const hub =
    trimOrUndefined(process.env.NEXT_PUBLIC_KMA_APIHUB_AUTH_KEY) ?? serviceKey;

  const mountainApiUrl =
    trimOrUndefined(process.env.NEXT_PUBLIC_KMA_MOUNTAIN_API_URL) ??
    DEFAULT_MOUNTAIN_API_URL;

  return {
    serviceKey,
    apiHubAuthKey: hub,
    mountainApiUrl,
    mountainNumByMountainJson: trimOrUndefined(
      process.env.NEXT_PUBLIC_KMA_MOUNTAIN_NUM_BY_MOUNTAIN,
    ),
    mountainStnByMountainJson:
      trimOrUndefined(process.env.NEXT_PUBLIC_KMA_MOUNTAIN_STN_BY_MOUNTAIN) ??
      DEFAULT_KMA_MOUNTAIN_STN_JSON,
  };
}
