/** 사이트 URL·메타데이터 공통 설정 (SEO) */
function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Cloud Finder",
  shortName: "운해 지도",
  title: "운해 지도 · Cloud Finder",
  titleTemplate: "%s · Cloud Finder",
  description:
    "기상청 단기예보·산악예보를 바탕으로 한국 주요 산의 내일 새벽 운해 관측 가능성을 지도에서 확인하세요. 습도·풍속·하늘상태·강수·기온을 반영해 확률(%)로 표시합니다.",
  locale: "ko_KR",
  language: "ko",
  keywords: [
    "운해",
    "운해 지도",
    "산 운해",
    "내일 운해",
    "운해 가능성",
    "운해 예보",
    "북한산 운해",
    "설악산 운해",
    "지리산 운해",
    "관악산 운해",
    "기상청 단기예보",
    "산악예보",
    "Cloud Finder",
  ],
  contactEmail: "sewon0325@gmail.com",
  get url() {
    return resolveSiteUrl();
  },
} as const;

export const mountainNamesForSeo = [
  "북한산",
  "도봉산",
  "소요산",
  "관악산",
  "설악산",
  "지리산",
  "덕유산",
  "치악산",
] as const;
