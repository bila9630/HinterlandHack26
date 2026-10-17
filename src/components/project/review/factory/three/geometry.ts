import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { Camera } from "../iso";
import { UV } from "../layout";

// World units in three.js: x = u, z = v (one floor cell each), y = up.
// A box in the mockup's terms: footprint [u0, v0, W, D], base z and height H in mockup px,
// and its [top, left (+v), right (+u)] colours.
export type BoxSpec = { at: [number, number, number, number]; z?: number; h: number; c: readonly [string, string, string] };
// A flat quad on the ground, corners in (u, v), drawn at `layer` above the grass.
export type Quad = { corners: [UV, UV, UV, UV]; color: string; layer: number };

// How the mockup's pixels map to world units, for a camera that frames the floor exactly
// like the mockup does at its viewBox scale.
export function worldScale({ C, S, ZS, L }: Camera) {
  // An orthographic camera at 45° azimuth shows one unit along u as C·L px across, so:
  const zoom = (C * L) / Math.SQRT1_2;
  // ...and S/C is the sine of its elevation.
  const elevation = Math.asin(S / C);
  const vertical = Math.cos(elevation) * zoom;
  return {
    zoom,
    elevation,
    // Mockup heights (z, scaled by ZS on screen) to world y.
    z: ZS / vertical,
    // Sprite px to world units: across the screen, and upright.
    across: 1 / zoom,
    up: 1 / vertical,
  };
}

// Flat layers sit this far apart, so they never fight in the depth buffer.
export const LAYER = 0.0015;

function pushColor(colors: number[], color: Color, count: number) {
  for (let i = 0; i < count; i++) colors.push(color.r, color.g, color.b);
}

// All boxes merged into one geometry with vertex colours: one draw call for the lot.
export function boxGeometry(boxes: BoxSpec[], zScale: number) {
  const positions: number[] = [];
  const colors: number[] = [];
  const cache = new Map<string, Color>();
  const color = (hex: string) => {
    if (!cache.has(hex)) cache.set(hex, new Color(hex));
    return cache.get(hex)!;
  };
  const face = (corners: number[][], hex: string) => {
    const [a, b, c, d] = corners;
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    pushColor(colors, color(hex), 6);
  };
  for (const { at: [u0, v0, W, D], z = 0, h, c } of boxes) {
    const [x0, x1, z0, z1] = [u0, u0 + W, v0, v0 + D];
    const [y0, y1] = [z * zScale, (z + h) * zScale];
    face([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], c[0]);
    face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c[1]);
    face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c[2]);
    // The far sides only show once the camera turns.
    face([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], c[1]);
    face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], c[2]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

// Ground quads merged into one geometry. Draw it double-sided: the corners may go round either way.
export function quadGeometry(quads: Quad[]) {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const { corners, color, layer } of quads) {
    const y = layer * LAYER;
    const [a, b, c, d] = corners.map(([u, v]) => [u, y, v]);
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    pushColor(colors, new Color(color), 6);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export const rectQuad = ([u0, v0, u1, v1]: [number, number, number, number], color: string, layer: number): Quad => ({
  corners: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]],
  color,
  layer,
});

// A painted line on the ground, `width` units wide, optionally dashed (dash and gap in units).
export function lineQuads(from: UV, to: UV, color: string, width: number, layer: number, dash?: [number, number]): Quad[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const [du, dv] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const [nu, nv] = [(-dv * width) / 2, (du * width) / 2];
  const piece = (a: number, b: number): Quad => ({
    corners: [
      [from[0] + du * a + nu, from[1] + dv * a + nv],
      [from[0] + du * b + nu, from[1] + dv * b + nv],
      [from[0] + du * b - nu, from[1] + dv * b - nv],
      [from[0] + du * a - nu, from[1] + dv * a - nv],
    ],
    color,
    layer,
  });
  if (!dash) return [piece(0, length)];
  const quads: Quad[] = [];
  for (let at = 0; at < length; at += dash[0] + dash[1]) quads.push(piece(at, Math.min(at + dash[0], length)));
  return quads;
}
