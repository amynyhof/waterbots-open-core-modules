/**
 * GPS NUMBERS A VISITOR TYPES, READ BY CODE, NEVER BY A MODEL (the maintainer, 2026-11-24: one of the three ways to give a
 * more exact place). Carried from the open site (`src/lib/gps.ts`, commit 0f16957) with its patterns unchanged. A pair that
 * could be anything else is not read: it has to look like a position (a decimal point, a degree sign or a compass letter
 * on both) and lie on the globe.
 *
 * FINDING THE BASIN NEEDS THE MAP DATA, which waits for the rights check. So the open site's `basinAt`, which loads that
 * data, is not here. `basinContaining` takes the basins as an argument: a site that holds the data passes it in, and turns
 * the basin it finds into a pin the way a click on its map does.
 *
 * It calls no model and has no dependency.
 */

export interface Point {
  lat: number;
  lon: number;
}

/** One number of a position: degrees, perhaps minutes and seconds, perhaps a compass letter before or after. */
const PART =
  "([NSEW])?\\s*([+-−]?\\d{1,3}(?:\\.\\d+)?)\\s*(?:(°|deg(?:rees)?)\\s*(?:(\\d{1,2}(?:\\.\\d+)?)\\s*['’′]\\s*(?:(\\d{1,2}(?:\\.\\d+)?)\\s*(?:\"|”|″|''))?)?)?\\s*([NSEW])?(?![\\w°])";
const PAIR = new RegExp(`(?<![\\w.])${PART}[\\s,;/]+(?:(?:and|lon|long|longitude|lng)\\s*[:=]?\\s*)?${PART}`, "i");

function readPart(m: RegExpMatchArray, at: number): { value: number; axis: "lat" | "lon" | null; marked: boolean } | null {
  const [before, whole, degree, minutes, seconds, after] = m.slice(at, at + 6);
  if (whole === undefined) return null;
  const letter = (before ?? after ?? "").toUpperCase();
  let value = Number(whole.replace("−", "-"));
  if (!Number.isFinite(value)) return null;
  const negative = value < 0 || whole.trim().startsWith("-") || whole.trim().startsWith("−");
  value = Math.abs(value) + Number(minutes ?? 0) / 60 + Number(seconds ?? 0) / 3600;
  if (negative || letter === "S" || letter === "W") value = -value;
  const axis = letter === "N" || letter === "S" ? "lat" : letter === "E" || letter === "W" ? "lon" : null;
  return { value, axis, marked: letter !== "" || degree !== undefined || /\.\d/.test(whole) };
}

/** The one position in a message, or null when there is none. Latitude comes first unless the letters say otherwise. */
export function readGps(message: string): Point | null {
  const m = message.match(PAIR);
  if (!m) return null;
  const a = readPart(m, 1);
  const b = readPart(m, 7);
  if (!a || !b || !a.marked || !b.marked) return null;
  if (a.axis !== null && a.axis === b.axis) return null;
  const swapped = a.axis === "lon" || b.axis === "lat";
  const point = swapped ? { lat: b.value, lon: a.value } : { lat: a.value, lon: b.value };
  return Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180 ? point : null;
}

/** A shape, as GeoJSON gives it: a polygon or a multipolygon, each ring a list of [longitude, latitude]. */
export type Shape =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: string; coordinates?: unknown };

/** Whether a point is inside one ring, by counting the edges a line to the west of it crosses. */
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether a point is inside a shape: in an outer ring and in none of its holes. */
export function inShape(point: Point, shape: Shape | null): boolean {
  if (!shape) return false;
  const polygons =
    shape.type === "Polygon" ? [shape.coordinates as number[][][]] : shape.type === "MultiPolygon" ? (shape.coordinates as number[][][][]) : [];
  return polygons.some(([outer, ...holes]) => outer !== undefined && inRing(point.lon, point.lat, outer) && !holes.some((hole) => inRing(point.lon, point.lat, hole)));
}

/** The first basin whose shape holds the point, or null: the point falls in no basin the site passed in. */
export function basinContaining<B extends { geometry: Shape | null }>(point: Point, basins: readonly B[]): B | null {
  return basins.find((b) => inShape(point, b.geometry)) ?? null;
}
