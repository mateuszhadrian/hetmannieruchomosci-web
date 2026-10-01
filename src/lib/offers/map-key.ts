// Klucz współrzędnych współdzielony przez sync (manifest `data/maps.json`)
// i stronę (wybór mapy dla oferty). Pięć miejsc po przecinku ≈ 1 m —
// oferty w jednym budynku dostają jeden obraz (D36: 7 ofert = 1 mapa).
export function coordKey(lat: number, lon: number): string {
  return `${fix(lat)},${fix(lon)}`;
}

function fix(n: number): string {
  const s = n.toFixed(5);
  return s === "-0.00000" ? "0.00000" : s;
}
