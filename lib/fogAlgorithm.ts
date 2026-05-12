import type { MountainWeather, SkyCondition } from "./weather";

export type { SkyCondition } from "./weather";

export type FogFactorKey =
  | "tempRange"
  | "humidity"
  | "wind"
  | "sky"
  | "rain";

export type FogFactorRow = {
  key: FogFactorKey;
  label: string;
  detail: string;
  /** 0–100, 높을수록 운해 형성에 유리 */
  favorability: number;
  /** 짧은 요약: 예) "높음 (좋음)" */
  summary: string;
};

export type FogComputation = {
  probability: number;
  statusLabel: "좋음" | "보통" | "어려움";
  factors: FogFactorRow[];
  /** 내부 점수(디버그·튜닝용) */
  rawPoints: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function skyBaseScore(sky: SkyCondition): number {
  switch (sky) {
    case "clear":
      return 12;
    case "partly_cloudy":
      return 8;
    case "fog":
      return 10;
    case "cloudy":
      return 4;
    case "overcast":
      return 2;
    default:
      return 4;
  }
}

/**
 * 보수적으로 0–100%로 정규화합니다.
 * 전국 주요 산 평균이 대략 50–60% 부근에 오도록 가중·압축을 맞췄습니다.
 */
export function computeFogSeaProbability(
  weather: MountainWeather,
): FogComputation {
  const diurnalRange = Math.max(
    0,
    weather.tempMaxYesterday - weather.tempMinToday,
  );

  // 일교차: 너무 작으면 점수↓, 너무 커도 한계(과낙관 방지)
  const rangeScore = clamp((diurnalRange - 6) / 16, 0, 1);
  const rangePoints = lerp(2, 18, Math.pow(rangeScore, 0.85));

  const humScore = clamp((weather.humidity - 42) / 48, 0, 1);
  const humidityPoints = lerp(1, 16, Math.pow(humScore, 1.05));

  const windScore = clamp(1 - weather.windSpeedMs / 10.5, 0, 1);
  const windPoints = lerp(0, 16, Math.pow(windScore, 1.15));

  const skyPoints = skyBaseScore(weather.sky);

  const rainBoost =
    weather.rainYesterdayMm <= 0.2
      ? 1.5
      : clamp(4 + weather.rainYesterdayMm * 0.85, 4, 14);

  const rawPoints =
    rangePoints + humidityPoints + windPoints + skyPoints + rainBoost;

  // 상한을 낮춰 과도한 낙관을 줄이고, 전체 분포를 중앙으로 당깁니다.
  const shaped = 30 + rawPoints * 0.62;
  const damped = lerp(shaped, 52, 0.12);
  const probability = Math.round(clamp(damped, 5, 92));

  const statusLabel: FogComputation["statusLabel"] =
    probability >= 70 ? "좋음" : probability >= 40 ? "보통" : "어려움";

  const tempFav = clamp((diurnalRange / 22) * 100, 0, 100);
  const humFav = clamp(((weather.humidity - 35) / 55) * 100, 0, 100);
  const windFav = clamp((1 - weather.windSpeedMs / 12) * 100, 0, 100);

  const skyFav =
    weather.sky === "clear"
      ? 92
      : weather.sky === "partly_cloudy"
        ? 72
        : weather.sky === "fog"
          ? 78
          : weather.sky === "cloudy"
            ? 48
            : 28;

  const rainFav = clamp(
    weather.rainYesterdayMm > 0
      ? 40 + Math.min(55, weather.rainYesterdayMm * 5)
      : 18,
    0,
    100,
  );

  const tempDetail =
    diurnalRange >= 14
      ? "큼"
      : diurnalRange >= 9
        ? "보통"
        : diurnalRange >= 6
          ? "작음"
          : "매우 작음";

  const humDetail =
    weather.humidity >= 82
      ? "매우 높음"
      : weather.humidity >= 68
        ? "높음"
        : weather.humidity >= 55
          ? "보통"
          : "낮음";

  const windDetail =
    weather.windSpeedMs < 2.2
      ? "약함"
      : weather.windSpeedMs < 4.5
        ? "보통"
        : weather.windSpeedMs < 7
          ? "다소 강함"
          : "강함";

  const skyLabelKo: Record<SkyCondition, string> = {
    clear: "맑음",
    partly_cloudy: "구름 조금",
    cloudy: "흐림",
    overcast: "짙은 구름",
    fog: "안개",
  };

  const rainDetail =
    weather.rainYesterdayMm < 0.2
      ? "거의 없음"
      : weather.rainYesterdayMm < 5
        ? "소량"
        : "많음";

  const tone = (fav: number) =>
    fav >= 66 ? "좋음" : fav >= 40 ? "보통" : "어려움";

  const factors: FogFactorRow[] = [
    {
      key: "tempRange",
      label: "일교차",
      detail: tempDetail,
      favorability: tempFav,
      summary: `${tempDetail} (${tone(tempFav)})`,
    },
    {
      key: "humidity",
      label: "습도",
      detail: humDetail,
      favorability: humFav,
      summary: `${humDetail} (${tone(humFav)})`,
    },
    {
      key: "wind",
      label: "바람",
      detail: windDetail,
      favorability: windFav,
      summary: `${windDetail} (${tone(windFav)})`,
    },
    {
      key: "sky",
      label: "하늘 상태",
      detail: skyLabelKo[weather.sky],
      favorability: skyFav,
      summary: `${skyLabelKo[weather.sky]} (${tone(skyFav)})`,
    },
    {
      key: "rain",
      label: "전일 강수",
      detail: rainDetail,
      favorability: rainFav,
      summary: `${rainDetail} (${tone(rainFav)})`,
    },
  ];

  return {
    probability,
    statusLabel,
    factors,
    rawPoints,
  };
}

export type ProbabilityTier = "low" | "mid" | "high";

export function probabilityTier(probability: number): ProbabilityTier {
  if (probability >= 70) return "high";
  if (probability >= 40) return "mid";
  return "low";
}
