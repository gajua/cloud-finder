import { MOUNTAINS, type Mountain } from "@/data/mountains";

/**
 * 산별 일괄 조회 순서(요구사항 순서와 동일).
 * 북한산 → 도봉산 → 설악산 → 지리산 → 관악산 → 치악산 → 덕유산 → 소요산
 */
export const WEATHER_ALL_MOUNTAIN_ORDER = [
  "bukhansan",
  "dobongsan",
  "seoraksan",
  "jirisan",
  "gwanaksan",
  "chiaksan",
  "deogyusan",
  "soyosan",
] as const;

export function toYYYYMMDDFromDateKey(dateKey: string): string | null {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}

export function mountainsInFetchOrder(): Mountain[] {
  const byId = new Map(MOUNTAINS.map((m) => [m.id, m]));
  return WEATHER_ALL_MOUNTAIN_ORDER.map((id) => {
    const mountain = byId.get(id);
    if (!mountain) {
      throw new Error(`산 정의 누락: ${id}`);
    }
    return mountain;
  });
}
