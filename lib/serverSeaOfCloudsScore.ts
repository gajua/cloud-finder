import type { WeatherData } from "@/lib/kmaWeather";
import type { WeatherAllWireReasons } from "@/lib/weatherAllTypes";

/**
 * 기상 원시값 기반 운해 점수(서버 전용).
 * - 가산은 요구 예시와 유사하되 계수를 낮춰 전체 분포가 대략 50~60% 부근에 오도록 보수적으로 압축합니다.
 * - 상한은 90% 전후로 제한합니다.
 */
export function computeSeaOfCloudsFromIndicators(weather: WeatherData): {
  probability: number;
  status: "low" | "medium" | "high";
  reasons: WeatherAllWireReasons;
} {
  const reasons: WeatherAllWireReasons = {
    humidity: "",
    wind: "",
    sky: "",
    temperature: "",
  };

  let raw = 0;

  if (weather.humidity > 85) {
    raw += 20;
    reasons.humidity = "습도가 매우 높아 수증기가 풍부합니다.";
  } else if (weather.humidity > 75) {
    raw += 12;
    reasons.humidity = "습도가 높은 편이라 운해 형성에 다소 유리합니다.";
  } else if (weather.humidity > 60) {
    raw += 5;
    reasons.humidity = "습도는 보통 수준입니다.";
  } else {
    reasons.humidity = "습도가 낮아 운해 가능성을 다소 낮춥니다.";
  }

  if (weather.windSpeed < 2) {
    raw += 15;
    reasons.wind = "바람이 매우 약해 공기가 안정적입니다.";
  } else if (weather.windSpeed < 3.5) {
    raw += 8;
    reasons.wind = "바람이 약한 편입니다.";
  } else if (weather.windSpeed < 6) {
    raw += 2;
    reasons.wind = "바람 세기는 보통입니다.";
  } else {
    raw -= 4;
    reasons.wind = "바람이 강해 구름층이 흩어지기 쉽습니다.";
  }

  if (weather.sky === 1) {
    raw += 10;
    reasons.sky = "맑은 하늘 상태로 복사냉각에 유리한 조건입니다.";
  } else if (weather.sky === 3) {
    raw += 4;
    reasons.sky = "구름이 다소 있으나 운해 판단은 보통입니다.";
  } else if (weather.sky === 4) {
    raw -= 2;
    reasons.sky = "흐린 편이라 일사·복사 조건이 다소 불리합니다.";
  } else {
    reasons.sky = "하늘 상태는 운해에 중립적으로 작용합니다.";
  }

  if (weather.temp < 10) {
    raw += 5;
    reasons.temperature = "기온이 낮아 포화에 가깝기 쉬운 환경입니다.";
  } else if (weather.temp < 15) {
    raw += 2;
    reasons.temperature = "기온이 다소 낮은 편입니다.";
  } else if (weather.temp > 22) {
    raw -= 3;
    reasons.temperature = "기온이 높아 상대적으로 불리할 수 있습니다.";
  } else {
    reasons.temperature = "기온은 전형적인 산간 야간 조건에 가깝습니다.";
  }

  if (weather.precipitation !== 0) {
    raw -= 3;
  }

  const damped = 36 + raw * 0.42;
  const probability = Math.round(Math.min(90, Math.max(14, damped)));

  const status: "low" | "medium" | "high" =
    probability >= 70 ? "high" : probability >= 40 ? "medium" : "low";

  return { probability, status, reasons };
}
