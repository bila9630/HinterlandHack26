import {
  BEAM,
  BELT,
  BELT_TOP,
  BLUE,
  BOX,
  CARS,
  CHARGER,
  CHARGE_LIGHT,
  CONTAINERS,
  DARK,
  DESK,
  GLASS,
  HEDGE,
  ORANGE,
  PALLET,
  PRIMARY,
  WHITE,
  WRAP,
  YELLOW,
} from "../colors";
import { Triple } from "../iso";
import { Dock, FactoryLayout, PalletRow, Rect, SceneObject, Truck, UV, ZoneName } from "../layout";
import { BoxSpec, Quad, lineQuads, rectQuad } from "./geometry";

// Box models ported from generate_scene.py, in floor cells and mockup px.
const PALLET_HEIGHT = 4;
const WALL_THICKNESS = 0.05;
const WALL: Triple = ["#F7F9FC", "#E9EDF4", "#E9EDF4"];
const WALL_TOP: Triple = [BLUE[0], PRIMARY, PRIMARY];
const BRAND: Triple = ["#3A67E8", "#3A67E8", "#3A67E8"];
// Ground line widths and dashes, from the mockup's px (about 67 px to a cell along the floor).
const PX = 1 / 67;

const moved = (boxes: BoxSpec[], du: number, dv: number): BoxSpec[] =>
  boxes.map(({ at: [u, v, W, D], ...rest }) => ({ ...rest, at: [u + du, v + dv, W, D] }));

// A forklift around its own origin, forks towards +u.
export function forkliftBoxes(loaded: boolean): BoxSpec[] {
  return [
    { at: [-0.25, -0.18, 0.42, 0.36], h: 16, c: YELLOW },
    { at: [-0.2, -0.12, 0.2, 0.24], z: 16, h: 14, c: DARK },
    { at: [-0.22, -0.15, 0.03, 0.03], z: 16, h: 26, c: DARK },
    { at: [-0.22, 0.12, 0.03, 0.03], z: 16, h: 26, c: DARK },
    { at: [-0.24, -0.17, 0.36, 0.34], z: 42, h: 3, c: DARK },
    { at: [0.17, -0.17, 0.04, 0.34], h: 46, c: DARK },
    ...(loaded
      ? [
          { at: [0.22, -0.2, 0.34, 0.4], z: 8, h: 4, c: PALLET } as BoxSpec,
          { at: [0.24, -0.18, 0.3, 0.36], z: 12, h: 22, c: BOX } as BoxSpec,
        ]
      : [
          { at: [0.22, -0.12, 0.32, 0.05], z: 4, h: 2, c: DARK } as BoxSpec,
          { at: [0.22, 0.07, 0.32, 0.05], z: 4, h: 2, c: DARK } as BoxSpec,
        ]),
  ];
}

// A pallet jack's pallet around its own origin, with or without its load.
export function jackBoxes(loaded: boolean): BoxSpec[] {
  return [
    { at: [-0.2, -0.2, 0.4, 0.4], h: 4, c: PALLET },
    ...(loaded ? [{ at: [-0.18, -0.18, 0.36, 0.36], z: 4, h: 26, c: BOX } as BoxSpec] : []),
  ];
}

export const CONVEYOR_ITEM: BoxSpec[] = [{ at: [-0.13, -0.13, 0.26, 0.26], h: 14, c: BOX }];

function rackBoxes({ origin: [u0, v0], size: [W, D], levels, height, uprights }: Extract<SceneObject, { type: "rack" }>) {
  const boxes: BoxSpec[] = levels.map((z) => ({ at: [u0, v0, W, D], z: z + 2, h: 4, c: BEAM }));
  for (const z of levels.slice(0, -1)) {
    for (let u = u0 + 0.06; u + 0.6 <= u0 + W - 0.05; u += 0.62) boxes.push({ at: [u + 0.03, v0 + 0.04, 0.56, D - 0.08], z: z + 6, h: 24, c: BOX });
  }
  const top = levels[levels.length - 1] + 6;
  boxes.push({ at: [u0 + 0.06, v0 + 0.04, 0.56, D - 0.08], z: top, h: 24, c: BOX });
  boxes.push({ at: [u0 + 0.7, v0 + 0.04, 0.56, D - 0.08], z: top, h: 24, c: WRAP });
  for (const du of uprights) {
    boxes.push({ at: [u0 + du, v0, 0.05, 0.05], h: height, c: BLUE });
    boxes.push({ at: [u0 + du, v0 + D - 0.05, 0.05, 0.05], h: height, c: BLUE });
  }
  return boxes;
}

const ROW_DEFAULTS = {
  palletQueue: { size: 0.3, loadHeight: 20 },
  palletStaging: { size: 0.36, loadHeight: 22 },
  looseBoxes: { size: 0.36, loadHeight: 22 },
};

function palletRowBoxes(row: PalletRow) {
  const { size, loadHeight } = ROW_DEFAULTS[row.type];
  const height = row.loadHeight ?? loadHeight;
  const color = row.load === "wrapped" ? WRAP : BOX;
  const z = row.z ?? 0;
  const boxes: BoxSpec[] = [];
  for (let i = 0; i < row.count; i++) {
    const [u, v] = [row.at[0] + i * row.step[0], row.at[1] + i * row.step[1]];
    if (row.type === "looseBoxes") {
      boxes.push({ at: [u, v, size, size], z, h: height, c: color });
      continue;
    }
    boxes.push({ at: [u, v, size, size], z, h: PALLET_HEIGHT, c: PALLET });
    for (let layer = 0; layer < (row.layers ?? 1); layer++) {
      boxes.push({ at: [u + 0.02, v + 0.02, size - 0.04, size - 0.04], z: z + PALLET_HEIGHT + layer * height, h: height, c: color });
    }
  }
  return boxes;
}

// One object of the hall as boxes, in floor cells.
export function objectBoxes(object: SceneObject): BoxSpec[] {
  switch (object.type) {
    case "conveyor": {
      const belt = object.height - 2;
      return [
        { at: object.box, h: belt, c: BELT },
        { at: object.box, z: belt, h: 2, c: BELT_TOP },
      ];
    }
    case "rack":
      return rackBoxes(object);
    case "table": {
      const [u0, v0, W, D] = object.box;
      return [
        { at: [u0, v0, W, D], h: object.height, c: DESK },
        { at: [u0 + 0.15, v0 + 0.07, 0.3, 0.24], z: object.height, h: 14, c: BOX },
      ];
    }
    case "chargingForklift":
      return moved(forkliftBoxes(false), ...object.at);
    default:
      return palletRowBoxes(object);
  }
}

// A truck: a 2.4 × 1.0 trailer along u, the cab on its -u end, an optional brand panel on +v.
function truckBoxes({ trailer: [u, v], cab, brand }: Truck): BoxSpec[] {
  const cabColor = cab === "orange" ? ORANGE : BLUE;
  return [
    { at: [u + 0.15, v + 0.05, 0.25, 0.9], h: 10, c: DARK },
    { at: [u, v, 2.4, 1.0], z: 10, h: 62, c: WHITE },
    { at: [u - 0.6, v + 0.05, 0.6, 0.9], z: 6, h: 46, c: cabColor },
    { at: [u - 0.58, v + 0.07, 0.56, 0.86], z: 52, h: 6, c: DARK },
    { at: [u + 1.7, v + 0.05, 0.25, 0.9], h: 10, c: DARK },
    ...(brand === false ? [] : [{ at: [u + 0.45, v + 1.0, 1.5, 0.006], z: 30, h: 30, c: BRAND } as BoxSpec]),
  ];
}

// A low cutaway wall in the plane u = fix or v = fix, outside the hall's edge. Open docks are
// gaps with a coloured frame under the continuous top edge; closed docks are roller doors.
function wallBoxes(axis: "u" | "v", fix: number, length: number, height: number, docks: Dock[], outward: number): BoxSpec[] {
  const thickness = WALL_THICKNESS;
  const across = outward > 0 ? fix : fix - thickness;
  const piece = (t0: number, t1: number, z: number, h: number, c: Triple, grow = 0): BoxSpec => ({
    at:
      axis === "u"
        ? [across - grow, t0, thickness + 2 * grow, t1 - t0]
        : [t0, across - grow, t1 - t0, thickness + 2 * grow],
    z,
    h,
    c,
  });
  const fill = height - 5;
  const gaps = docks.filter((dock) => dock.open).map((dock) => dock.v).sort((a, b) => a[0] - b[0]);
  const boxes: BoxSpec[] = [];
  let from = 0;
  for (const [d0, d1] of [...gaps, [length, length]]) {
    if (d0 > from) boxes.push(piece(from, d0, 0, fill, WALL));
    from = d1;
  }
  boxes.push(piece(0, length, fill, 5, WALL_TOP));
  const door = Math.min(height, 62);
  for (const dock of docks) {
    const c = dock.type === "outbound" ? ORANGE : BLUE;
    const [d0, d1] = dock.v;
    if (dock.open) {
      const frame: Triple = [c[1], c[1], c[1]];
      boxes.push(piece(d0, d0 + 0.04, 0, door, frame, 0.004), piece(d1 - 0.04, d1, 0, door, frame, 0.004));
      boxes.push(piece(d0, d1, door - 3, 3, frame, 0.004), piece(d0, d1, 0, 1, frame, 0.004));
      continue;
    }
    boxes.push(piece(d0, d1, 0, door, [c[1], c[1], c[1]], 0.004));
    for (let z = 8; z < door; z += 8) boxes.push(piece(d0, d1, z, 1, [c[2], c[2], c[2]], 0.008));
  }
  return boxes;
}

// Everything that stands still, as one list of boxes.
export function staticBoxes(layout: FactoryLayout): BoxSpec[] {
  const { exterior, hall } = layout;
  const boxes: BoxSpec[] = [];
  const docksOn = (wall: string) => layout.docks.filter((dock) => dock.wall === wall);

  boxes.push(...wallBoxes("u", 0, hall.rows, hall.wallHeight, docksOn("u=0"), -1));
  boxes.push(...wallBoxes("v", 0, hall.cols, hall.wallHeight, docksOn("v=0"), -1));
  boxes.push(...wallBoxes("u", hall.cols, hall.rows, hall.wallHeight, docksOn(`u=${hall.cols}`), 1));
  boxes.push(...wallBoxes("v", hall.rows, hall.cols, hall.wallHeight, docksOn(`v=${hall.rows}`), 1));

  layout.objects.forEach((object) => boxes.push(...objectBoxes(object)));
  exterior.trucks.forEach((truck) => boxes.push(...truckBoxes(truck)));
  exterior.hedges.forEach((at) => boxes.push({ at, h: 10, c: HEDGE }));

  const park = exterior.carPark;
  park.cars.forEach((slot, index) => {
    const [u, v] = [park.rect[0] + 0.25 + slot * park.stallWidth, park.rect[1] + 0.2];
    boxes.push({ at: [u, v, 0.36, 0.52], h: 11, c: CARS[index % CARS.length] });
    boxes.push({ at: [u + 0.03, v + 0.12, 0.3, 0.28], z: 11, h: 8, c: GLASS });
  });

  const area = exterior.chargingArea;
  for (const { at: [u, v], color, z = 0 } of area.containers) {
    const c = CONTAINERS[color];
    boxes.push({ at: [u, v, 1.3, 0.8], z, h: 40, c });
    for (let j = 0; j < 8; j++) boxes.push({ at: [u + 0.1 + j * 0.15, v + 0.79, 0.04, 0.015], z: z + 4, h: 32, c: [c[2], c[2], c[2]] });
  }
  for (let k = 0; k < area.bays.count; k++) {
    const u = area.bays.at[0] + k * area.bays.step;
    const v = area.bays.at[1];
    boxes.push(...moved(forkliftBoxes(false), u + area.bays.size[0] / 2, v + area.bays.size[1] / 2));
    boxes.push({ at: [u + 0.1, v - 0.3, 0.3, 0.12], h: 26, c: CHARGER });
    boxes.push({ at: [u + 0.15, v - 0.19, 0.2, 0.01], z: 14, h: 6, c: CHARGE_LIGHT });
  }
  const [gu, gv] = exterior.guardHouse.at;
  boxes.push({ at: [gu, gv, 0.6, 0.6], h: 34, c: WHITE }, { at: [gu - 0.05, gv - 0.05, 0.7, 0.7], z: 34, h: 4, c: BLUE });
  return boxes;
}

function zoneOf(col: number, row: number, { laneRow, laneCol }: FactoryLayout["zones"]): ZoneName {
  if (row === laneRow || col === laneCol) return "lane";
  if (col < laneCol) return row < laneRow ? "outbound" : "inbound";
  return row < laneRow ? "production" : "warehouse";
}

// The ground, bottom layer first: grass, site paving, roads, yards, car park, charging area,
// hall slab, floor cells and lane lines.
export function groundQuads({ exterior, hall, zones }: FactoryLayout): Quad[] {
  const quads: Quad[] = [];
  const e = exterior.groundExtent;
  quads.push(rectQuad([-e, -e, e, e], exterior.groundColor, 0));
  quads.push(rectQuad(exterior.sitePaving.rect, exterior.sitePaving.color, 1));
  for (const { rect, centerLine = true } of exterior.roads) {
    const [u0, v0, u1, v1] = rect;
    quads.push(rectQuad(rect, exterior.roadColor, 2));
    if (!centerLine) continue;
    const [from, to]: [UV, UV] = u1 - u0 < v1 - v0 ? [[(u0 + u1) / 2, v0], [(u0 + u1) / 2, v1]] : [[u0, (v0 + v1) / 2], [u1, (v0 + v1) / 2]];
    quads.push(...lineQuads(from, to, "#FFFFFF", 3 * PX, 3, [16 * PX, 14 * PX]));
  }
  for (const { rect } of exterior.truckYards) {
    const [u0, v0, u1, v1] = rect;
    quads.push(rectQuad(rect, exterior.yardColor, 4));
    for (let v = v0 + 0.2; v <= v1 - 0.2; v += 1.25) quads.push(...lineQuads([u0 + 0.4, v], [u1 - 0.3, v], "#F2B53A", 2.5 * PX, 5));
  }
  const park = exterior.carPark;
  quads.push(rectQuad(park.rect, exterior.yardColor, 4));
  for (let k = 0; k < park.stalls; k++) {
    const u = park.rect[0] + 0.2 + k * park.stallWidth;
    quads.push(...lineQuads([u, park.rect[1] + 0.1], [u, park.rect[1] + 0.75], "#FFFFFF", 2 * PX, 5));
  }
  const area = exterior.chargingArea;
  quads.push(rectQuad(area.rect, exterior.yardColor, 4));
  for (let k = 0; k < area.bays.count; k++) {
    const [u0, v0] = [area.bays.at[0] + k * area.bays.step, area.bays.at[1]];
    const [u1, v1] = [u0 + area.bays.size[0], v0 + area.bays.size[1]];
    const corners: UV[] = [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]];
    corners.slice(1).forEach((to, i) => quads.push(...lineQuads(corners[i], to, "#F2B53A", 2 * PX, 5)));
  }
  quads.push(rectQuad([-0.08, -0.08, hall.cols + 0.08, hall.rows + 0.08], hall.slabColor, 6));
  quads.push(rectQuad([0, 0, hall.cols, hall.rows], "#FFFFFF", 7));
  const inset = PX;
  for (let row = 0; row < hall.rows; row++) {
    for (let col = 0; col < hall.cols; col++) {
      const cell: Rect = [col + inset, row + inset, col + 1 - inset, row + 1 - inset];
      quads.push(rectQuad(cell, zones.colors[zoneOf(col, row, zones)], 8));
    }
  }
  hall.markings.dashed.forEach(([from, to]) => quads.push(...lineQuads(from, to, "#FFFFFF", 3 * PX, 9, [12 * PX, 9 * PX])));
  hall.markings.solid.forEach(([from, to]) => quads.push(...lineQuads(from, to, "#F2B53A", 2 * PX, 9)));
  return quads;
}
