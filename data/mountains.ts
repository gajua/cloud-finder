/** 최소 필드만 유지 (지도·날씨 좌표·표시명) */
export type Mountain = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export const MOUNTAINS: Mountain[] = [
  { id: "bukhansan", name: "북한산", lat: 37.6588, lng: 126.982 },
  { id: "dobongsan", name: "도봉산", lat: 37.6919, lng: 127.0472 },
  { id: "suraksan", name: "수락산", lat: 37.6775, lng: 127.0812 },
  { id: "gwanaksan", name: "관악산", lat: 37.4367, lng: 126.963 },
  { id: "seoraksan", name: "설악산", lat: 38.1199, lng: 128.4655 },
  /* 최고봉 천왕봉 — en.wikipedia.org/wiki/Jirisan 인포박스 좌표 */
  { id: "jirisan", name: "지리산", lat: 35.33694, lng: 127.73056 },
  { id: "deogyusan", name: "덕유산", lat: 35.86, lng: 127.73 },
  { id: "chiaksan", name: "치악산", lat: 37.3792, lng: 128.0524 },
];
