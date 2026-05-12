export type GridXY = {
  nx: number;
  ny: number;
};

/**
 * DFS-Lambert Conformal Conic projection (KMA grid conversion).
 *
 * @see https://www.data.go.kr (기상/예보 격자 좌표 변환 로직)
 */
export function latLngToGrid(lat: number, lng: number): GridXY {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError("lat/lng must be finite numbers");
  }

  // KMA default constants (DFS grid)
  const RE = 6371.00877; // Earth radius (km)
  const GRID = 5.0; // Grid spacing (km)
  const SLAT1 = 30.0; // Projection latitude 1 (degree)
  const SLAT2 = 60.0; // Projection latitude 2 (degree)
  const OLAT = 38.0; // Origin latitude (degree)
  const OLON = 126.0; // Origin longitude (degree)
  const XO = 43; // Origin x coordinate
  const YO = 136; // Origin y coordinate

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olat = OLAT * DEGRAD;
  const olon = OLON * DEGRAD;

  const sn =
    Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));

  const sf =
    (Math.tan(Math.PI / 4 + slat1 / 2) ** sn) * (Math.cos(slat1) / sn);

  const ro =
    re * sf / (Math.tan(Math.PI / 4 + olat / 2) ** sn);

  const ra =
    re * sf / (Math.tan(Math.PI / 4 + lat * DEGRAD / 2) ** sn);

  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx: x, ny: y };
}

