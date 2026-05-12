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

/** `.env.example`과 동일한 기본 산악 지점 매핑(JSON 문자열) */
export const DEFAULT_KMA_MOUNTAIN_STN_JSON =
  '{"bukhansan":"108","dobongsan":"108","suraksan":"108","gwanaksan":"108","seoraksan":"90","jirisan":"192","deogyusan":"146","chiaksan":"114"}';

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
