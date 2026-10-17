import { BLUE, BOX, CARS, CONTAINERS, DARK, GLASS, HEDGE, ORANGE, PALLET, WHITE, WRAP } from "../colors";
import { Triple } from "../iso";
import { UV } from "../layout";
import { pythonRandom } from "../random";
import { BoxSpec, Quad, lineQuads, rectQuad } from "./geometry";
import { wallBoxes } from "./models";

// The site around a hall of any size: yards and trucks outside its dock walls, a car park,
// containers, roads and belts of trees, in the style of the factory scene. In floor squares,
// with the hall from (0, 0) to (columns, rows); u = x, v = z.

export type Side = "x0" | "x1" | "z0" | "z1";
export type SiteDock = { kind: "inbound" | "outbound"; side: Side; span: [number, number]; doors: number[] };
export type SiteTree = { at: UV; scale: number };

const GRASS = "#C6E3B8";
const PAVING = "#E6EAF1";
const ROAD = "#BFC7D3";
const YARD = "#D3D9E3";
const STRIPE = "#F2B53A";
const PX = 1 / 67;
const ROAD_WIDTH = 2.2;
// How far the site reaches out from each kind of wall.
const DEPTH = { dock: 5.2, cars: 2.2, storage: 3, open: 1.4 };
const EXTENT = 90;

// Positions measured from one wall: `a` straight out from it, `b` along it.
function wallFrame(side: Side, columns: number, rows: number) {
  const length = side === "x0" || side === "x1" ? rows : columns;
  const point = (a: number, b: number): UV =>
    side === "x0" ? [-a, b] : side === "x1" ? [columns + a, b] : side === "z0" ? [b, -a] : [b, rows + a];
  const rect = (a0: number, a1: number, b0: number, b1: number): [number, number, number, number] => {
    const [p, q] = [point(a0, b0), point(a1, b1)];
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };
  const box = (a0: number, a1: number, b0: number, b1: number, z: number, h: number, c: Triple): BoxSpec => {
    const [u0, v0, u1, v1] = rect(a0, a1, b0, b1);
    return { at: [u0, v0, u1 - u0, v1 - v0], z, h, c };
  };
  return { length, point, rect, box };
}
type Frame = ReturnType<typeof wallFrame>;

// A truck backed up to the wall, centred on `b`, with the cab furthest out.
function truck(frame: Frame, b: number, cab: Triple): BoxSpec[] {
  const [b0, b1] = [b - 0.5, b + 0.5];
  return [
    frame.box(2.2, 2.45, b0 + 0.05, b1 - 0.05, 0, 10, DARK),
    frame.box(0.2, 2.6, b0, b1, 10, 62, WHITE),
    frame.box(2.6, 3.2, b0 + 0.05, b1 - 0.05, 6, 46, cab),
    frame.box(2.62, 3.18, b0 + 0.07, b1 - 0.07, 52, 6, DARK),
    frame.box(0.65, 0.9, b0 + 0.05, b1 - 0.05, 0, 10, DARK),
    // The brand panel goes on the trailer's side towards the camera.
    frame.box(0.6, 2.1, b1, b1 + 0.006, 30, 30, ["#3A67E8", "#3A67E8", "#3A67E8"]),
  ];
}

function pallet(frame: Frame, a: number, b: number, load: Triple, layers = 1): BoxSpec[] {
  return [
    frame.box(a, a + 0.36, b, b + 0.36, 0, 4, PALLET),
    ...Array.from({ length: layers }, (_, layer) => frame.box(a + 0.02, a + 0.34, b + 0.02, b + 0.34, 4 + layer * 22, 22, load)),
  ];
}

export function siteScenery(columns: number, rows: number, docks: SiteDock[], wallHeight = 26) {
  const sides: Side[] = ["x0", "x1", "z0", "z1"];
  const dockSides = new Set(docks.map((dock) => dock.side));
  const free = sides.filter((side) => !dockSides.has(side));
  // Cars park in front of the hall, where the camera looks from; storage goes behind it.
  const carSide = (["z1", "x1", "z0", "x0"] as Side[]).find((side) => free.includes(side));
  const storageSide = (["z0", "x0", "x1", "z1"] as Side[]).find((side) => free.includes(side) && side !== carSide);
  const role = (side: Side) =>
    dockSides.has(side) ? "dock" : side === carSide ? "cars" : side === storageSide ? "storage" : "open";
  const depth = (side: Side) => DEPTH[role(side)];

  const quads: Quad[] = [];
  const boxes: BoxSpec[] = [];
  const trees: SiteTree[] = [];

  quads.push(rectQuad([-EXTENT, -EXTENT, EXTENT, EXTENT], GRASS, 0));
  quads.push(rectQuad([-depth("x0"), -depth("z0"), columns + depth("x1"), rows + depth("z1")], PAVING, 1));

  const random = pythonRandom(4);
  for (const side of sides) {
    const frame = wallFrame(side, columns, rows);
    const out = depth(side);

    // A road beyond the paving, running past the whole site, and belts of trees beyond it.
    const [r0, r1] = [out + 0.6, out + 0.6 + ROAD_WIDTH];
    quads.push(rectQuad(frame.rect(r0, r1, -EXTENT, EXTENT), ROAD, 2));
    quads.push(...lineQuads(frame.point((r0 + r1) / 2, -EXTENT), frame.point((r0 + r1) / 2, EXTENT), "#FFFFFF", 3 * PX, 3, [16 * PX, 14 * PX]));
    for (const belt of [r1 + 1.4, r1 + 3]) {
      for (let k = -30; k < 30; k++) {
        const b = k * 1.1 + random.uniform(-0.3, 0.3);
        trees.push({ at: frame.point(belt + random.uniform(-0.3, 0.3), b), scale: random.uniform(0.9, 1.3) });
      }
    }

    if (role(side) === "cars") {
      quads.push(rectQuad(frame.rect(0.3, 1.9, 0.2, frame.length - 0.2), YARD, 4));
      const stalls = Math.floor((frame.length - 0.6) / 0.48);
      for (let k = 0; k <= stalls; k++) {
        const b = 0.4 + k * 0.48;
        quads.push(...lineQuads(frame.point(0.4, b), frame.point(1.05, b), "#FFFFFF", 2 * PX, 5));
        // Most stalls are taken.
        if (k < stalls && k % 3 !== 2) {
          boxes.push(frame.box(0.45, 0.97, b + 0.06, b + 0.42, 0, 11, CARS[k % CARS.length]));
          boxes.push(frame.box(0.57, 0.85, b + 0.09, b + 0.39, 11, 8, GLASS));
        }
      }
      boxes.push(frame.box(1.95, 2.2, 0.2, frame.length - 0.2, 0, 10, HEDGE));
    }

    if (role(side) === "storage") {
      quads.push(rectQuad(frame.rect(0.4, 2.8, 0.4, frame.length - 0.4), YARD, 4));
      const containers: [number, number, number][] = [[0.8, 0, 0], [2.2, 0, 1], [0.8, 40, 2]];
      for (const [b, z, color] of containers) {
        const c = CONTAINERS[color];
        boxes.push(frame.box(1.6, 2.4, b, b + 1.3, z, 40, c));
        for (let j = 0; j < 8; j++) boxes.push(frame.box(1.585, 1.6, b + 0.1 + j * 0.15, b + 0.14 + j * 0.15, z + 4, 32, [c[2], c[2], c[2]]));
      }
      for (let i = 0; i < 4; i++) boxes.push(...pallet(frame, 1.8, 3.8 + i * 0.5, WRAP, 2));
    }

    if (role(side) === "open") {
      boxes.push(frame.box(0.9, 1.2, 0, frame.length, 0, 10, HEDGE));
      for (let b = 1; b < frame.length; b += 2.2) trees.push({ at: frame.point(0.45, b), scale: 1.15 });
    }
  }

  // A yard with parking stripes outside each group of docks, a truck at the first door and
  // pallets waiting at the next.
  for (const dock of docks) {
    const frame = wallFrame(dock.side, columns, rows);
    const out = depth(dock.side);
    const [b0, b1] = [Math.max(dock.span[0] - 0.4, 0), Math.min(dock.span[1] + 0.4, frame.length)];
    quads.push(rectQuad(frame.rect(0, out, b0, b1), YARD, 4));
    for (let b = b0 + 0.2; b <= b1 - 0.2; b += 1.25) quads.push(...lineQuads(frame.point(0.3, b), frame.point(out - 0.4, b), STRIPE, 2.5 * PX, 5));
    const [first, ...rest] = dock.doors;
    boxes.push(...truck(frame, first, dock.kind === "inbound" ? BLUE : ORANGE));
    rest.forEach((b) => boxes.push(...pallet(frame, 0.4, b - 0.4, dock.kind === "inbound" ? BOX : WRAP), ...pallet(frame, 0.4, b + 0.05, BOX)));
  }

  // Low walls around the hall; the scene draws its own dock doors.
  boxes.push(...wallBoxes("u", 0, rows, wallHeight, [], -1));
  boxes.push(...wallBoxes("v", 0, columns, wallHeight, [], -1));
  boxes.push(...wallBoxes("u", columns, rows, wallHeight, [], 1));
  boxes.push(...wallBoxes("v", rows, columns, wallHeight, [], 1));

  return { quads, boxes, trees };
}
