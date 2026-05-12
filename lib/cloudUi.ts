import type { ProbabilityTier } from "./fogAlgorithm";
import type { SkyCondition } from "./weather";

/** 운해(구름) 느낌의 티어별 이모지 — UI 장식용 */
export function cloudEmojiForTier(tier: ProbabilityTier): string {
  if (tier === "high") return "☁️";
  if (tier === "mid") return "🌥️";
  return "🌤️";
}

/** 산/날짜별 sky 상태를 직접 보여주는 날씨 이모지 */
export function weatherEmojiForSky(sky: SkyCondition): string {
  if (sky === "clear") return "☀️";
  if (sky === "partly_cloudy") return "⛅";
  if (sky === "cloudy" || sky === "fog" || sky === "overcast") return "☁️";
  return "☁️";
}

export function skyLabelKo(sky: SkyCondition): string {
  if (sky === "clear") return "맑음";
  if (sky === "partly_cloudy") return "구름 조금";
  if (sky === "cloudy") return "흐림";
  if (sky === "overcast") return "흐림";
  return "흐림";
}
