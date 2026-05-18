import { mountainNamesForSeo, siteConfig } from "@/lib/site";

/** 지도는 클라이언트 전용이므로, 검색·스크린리더용 본문을 서버에서 제공합니다. */
export function SeoContent() {
  return (
    <section
      className="sr-only"
      aria-label={`${siteConfig.shortName} 서비스 소개`}
    >
      <h2>{siteConfig.shortName}</h2>
      <p>{siteConfig.description}</p>
      <h3>지원 산</h3>
      <ul>
        {mountainNamesForSeo.map((name) => (
          <li key={name}>{name} 운해 가능성</li>
        ))}
      </ul>
      <p>
        오늘 발표된 기상청 단기예보와 산악예보를 이용해, 내일 새벽 시간대 운해
        관측 가능성을 백분율로 계산합니다. 습도, 풍속, 하늘상태, 강수 이력,
        기온 범위를 함께 고려합니다.
      </p>
    </section>
  );
}
