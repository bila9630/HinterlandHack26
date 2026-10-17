// Isometric projection of the factory scene, ported from generate_scene.py.
// World units: one floor cell per unit. u runs to the screen's lower right, v to its lower
// left, and z is height in pixels before it is scaled by ZS.

export type Pt = [number, number];
// Colours of a box: [top, left (+v) face, right (+u) face].
export type Triple = readonly [string, string, string];
export type Faces = { top: Pt[]; left: Pt[]; right: Pt[] };
export type Camera = { C: number; S: number; ZS: number; L: number };

export const CAMERA: Camera = { C: 0.866, S: 0.42, ZS: 1.15, L: 70 };

export type Iso = {
  // A world point on screen.
  iso: (u: number, v: number, z?: number) => Pt;
  // The three visible faces of a box standing on (u0, v0) at height z0.
  box: (u0: number, v0: number, W: number, D: number, z0: number, H: number) => Faces;
};

export function createIso({ C, S, ZS, L }: Camera = CAMERA): Iso {
  const iso = (u: number, v: number, z = 0): Pt => [C * (u - v) * L, S * (u + v) * L - z * ZS];
  const box = (u0: number, v0: number, W: number, D: number, z0: number, H: number): Faces => {
    const z1 = z0 + H;
    return {
      top: [iso(u0, v0, z1), iso(u0 + W, v0, z1), iso(u0 + W, v0 + D, z1), iso(u0, v0 + D, z1)],
      left: [iso(u0, v0 + D, z0), iso(u0 + W, v0 + D, z0), iso(u0 + W, v0 + D, z1), iso(u0, v0 + D, z1)],
      right: [iso(u0 + W, v0, z0), iso(u0 + W, v0 + D, z0), iso(u0 + W, v0 + D, z1), iso(u0 + W, v0, z1)],
    };
  };
  return { iso, box };
}

const standard = createIso();
export const iso = standard.iso;
export const box = standard.box;

// SVG points and path data.
export const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
export const pathData = (list: Pt[], closed = false) =>
  "M" + list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + (closed ? " Z" : "");

// Python's "{:.0f}": round half to even.
export function round0(x: number) {
  const floor = Math.floor(x);
  const rest = x - floor;
  if (rest !== 0.5) return rest > 0.5 ? floor + 1 : floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

// Where a point is after travelling `fraction` of a polyline at constant speed, the way
// SVG's animateMotion moves along a path (calcMode "paced"): repeated points take no time.
export function alongPath(points: Pt[], fraction: number): Pt {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return points[0];
  let left = (((fraction % 1) + 1) % 1) * total;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (left <= length && length > 0) {
      const [from, to] = [points[index], points[index + 1]];
      const t = left / length;
      return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    }
    left -= length;
  }
  return points[points.length - 1];
}
