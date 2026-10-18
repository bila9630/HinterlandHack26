import { FactoryLayout, HallSide, Rect, Truck, UV, factoryLayout } from "./review/factory/layout";
import { DOCK_WIDTH, DockKind, FacilityLayout, SiteScenery, TILE, layoutDocks } from "./layouts";

// The hall of a layout as the factory scene draws it, in floor squares (u = x, v = z) from
// the hall's corner: its floor, walls and docks, and the site around it. Nothing stands
// inside it yet.
export function siteLayout(layout: FacilityLayout): FactoryLayout {
  const cols = layout.grid[0].length;
  const rows = layout.grid.length;
  const { camera, hall, zones } = factoryLayout;
  const site = layout.site ?? laidOutSite(layout);
  return {
    camera: { ...camera, viewBox: framed(cols, rows) },
    hall: { ...hall, cols, rows, markings: laneMarkings(layout.grid) },
    zones: { grid: layout.grid, colors: zones.colors },
    docks: hallDocks(layout),
    stations: [],
    objects: [...site.props],
    people: [],
    vehicles: [],
    suggestions: [],
    exterior: site.exterior,
  };
}

// The factory scene's view, moved with the hall's centre so another size of hall sits where its hall does.
function framed(cols: number, rows: number): FactoryLayout["camera"]["viewBox"] {
  const { C, S, L, viewBox } = factoryLayout.camera;
  const [du, dv] = [cols / 2 - factoryLayout.hall.cols / 2, rows / 2 - factoryLayout.hall.rows / 2];
  return [viewBox[0] + C * (du - dv) * L, viewBox[1] + S * (du + dv) * L, viewBox[2], viewBox[3]];
}

export type DockGroup = { kind: DockKind; side: HallSide; doors: number[] };

// Each dock area's doors, as positions along the wall they are in.
export function dockGroups(layout: FacilityLayout): DockGroup[] {
  const cols = layout.grid[0].length;
  const rows = layout.grid.length;
  return layoutDocks(layout).map((dock) => {
    const [door] = dock.doors;
    const side: HallSide = door.rotated
      ? door.x / TILE < cols / 2 ? "-u" : "+u"
      : door.z / TILE < rows / 2 ? "-v" : "+v";
    return { kind: dock.kind, side, doors: dock.doors.map((item) => (door.rotated ? item.z : item.x) / TILE) };
  });
}

const WALL_OF: Record<HallSide, (cols: number, rows: number) => string> = {
  "-u": () => "u=0",
  "+u": (cols) => `u=${cols}`,
  "-v": () => "v=0",
  "+v": (_, rows) => `v=${rows}`,
};

// Dock doors in the walls; the first of each dock area stands open.
export function hallDocks(layout: FacilityLayout): FactoryLayout["docks"] {
  const [cols, rows] = [layout.grid[0].length, layout.grid.length];
  const half = DOCK_WIDTH / TILE / 2;
  return dockGroups(layout).flatMap(({ kind, side, doors }) =>
    doors.map((at, index) => ({
      id: `${kind === "inbound" ? "in" : "out"}-${index + 1}`,
      wall: WALL_OF[side](cols, rows),
      v: [at - half, at + half] as [number, number],
      type: kind,
      open: index === 0,
    })),
  );
}

// Lane lines like the factory scene's: a dashed centre line along each lane, broken where
// it crosses a lane running along v, and solid edges along the lanes running along v.
function laneMarkings(grid: string[]): FactoryLayout["hall"]["markings"] {
  const [cols, rows] = [grid[0].length, grid.length];
  const isLane = (col: number, row: number) => grid[row]?.[col] === "L";
  const dashed: [UV, UV][] = [];
  const solid: [UV, UV][] = [];
  // Runs of two or more lane squares in a line, as [start, end) along it.
  const runs = (length: number, lane: (i: number) => boolean) => {
    const found: [number, number][] = [];
    let start = -1;
    for (let i = 0; i <= length; i++) {
      if (i < length && lane(i)) {
        if (start < 0) start = i;
      } else {
        if (start >= 0 && i - start >= 2) found.push([start, i]);
        start = -1;
      }
    }
    return found;
  };
  const alongV = new Set<string>();
  for (let col = 0; col < cols; col++) {
    for (const [start, end] of runs(rows, (row) => isLane(col, row))) {
      for (let row = start; row < end; row++) alongV.add(`${col},${row}`);
      dashed.push([[col + 0.5, start + 0.1], [col + 0.5, end - 0.1]]);
      solid.push([[col + 0.1, start], [col + 0.1, end]], [[col + 0.9, start], [col + 0.9, end]]);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (const [start, end] of runs(cols, (col) => isLane(col, row))) {
      let from = start;
      for (let col = start; col <= end; col++) {
        if (col < end && !alongV.has(`${col},${row}`)) continue;
        if (col > from) dashed.push([[from + 0.1, row + 0.5], [col - 0.1, row + 0.5]]);
        from = col + 1;
      }
    }
  }
  return { dashed, solid };
}

// The site, in the factory scene's proportions: truck yards outside the docks, a car park
// on a side without docks (+v first) and the charging area on -v when it is free; paving
// round the hall, a road beyond it on every side, hedges and trees.
const YARD = 5.2;
const ROAD = 2.2;
const CAR_SLOTS = [0, 1, 3, 4, 5, 7, 9, 10, 12, 13, 15];

function laidOutSite(layout: FacilityLayout): SiteScenery {
  const [cols, rows] = [layout.grid[0].length, layout.grid.length];
  const base = factoryLayout.exterior;
  const groups = dockGroups(layout);
  const sides: HallSide[] = ["-u", "+u", "-v", "+v"];
  const docked = (side: HallSide) => groups.some((group) => group.side === side);
  const parkSide = (["+v", "-v"] as HallSide[]).find((side) => !docked(side));
  const chargingSide = !docked("-v") && parkSide !== "-v" ? "-v" : undefined;
  const kind = (side: HallSide) =>
    docked(side) ? "dock" : side === parkSide ? "park" : side === chargingSide ? "charging" : "plain";
  const MARGIN = { dock: YARD, park: 2.2, charging: 3.0, plain: 0.4 };
  const GAP = { dock: 0.2, park: 1.0, charging: 0.6, plain: 1.4 };
  const pave: Rect = [-MARGIN[kind("-u")], -MARGIN[kind("-v")], cols + MARGIN[kind("+u")], rows + MARGIN[kind("+v")]];

  // A point `out` squares outside the wall on `side`, `along` it.
  const outside = (side: HallSide, out: number, along: number): UV =>
    ({ "-u": [-out, along], "+u": [cols + out, along], "-v": [along, -out], "+v": [along, rows + out] })[side] as UV;
  // A rect between `out0` and `out1` outside the wall on `side`, from `a0` to `a1` along it.
  const band = (side: HallSide, out0: number, out1: number, a0: number, a1: number): Rect => {
    const [p, q] = [outside(side, out0, a0), outside(side, out1, a1)];
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };

  const roads = sides.map((side) => {
    const gap = GAP[kind(side)];
    const from = { "-u": -pave[0], "+u": pave[2] - cols, "-v": -pave[1], "+v": pave[3] - rows }[side] + gap;
    return { side, rect: band(side, from, from + ROAD, -40, 40), outer: from + ROAD };
  });

  const truckYards = groups.map(({ side, doors }) => ({
    rect: band(side, 0, YARD, Math.min(...doors) - 1.2, Math.max(...doors) + 1.2),
    stripes: side[1] as "u" | "v",
  }));
  const trucks: Truck[] = groups.flatMap(({ kind: dock, side, doors }) => [
    { trailer: outside(side, 0.2, doors[0]), side, cab: dock === "inbound" ? "blue" : "orange", docked: `${dock}-1` },
    ...(dock === "inbound" && doors[1] !== undefined
      ? [{ trailer: outside(side, 1.6, doors[1] + 0.9), side, cab: "blue" as const, waiting: true, brand: false }]
      : []),
  ]);
  // The guard house stands by the entrance to the first yard (its corner nearest the hall is `at` + 0.6 on the + sides).
  const gateSide = groups[0]?.side ?? "-u";
  const guardHouse = { at: outside(gateSide, gateSide[0] === "-" ? 4.9 : 4.3, -0.4) };

  const parkRect: Rect = parkSide === "-v" ? [0.2, -2.0, cols + 0.2, -0.4] : [0.2, rows + 0.4, cols + 0.2, rows + 2.0];
  const stalls = Math.floor(cols / base.carPark.stallWidth) + 1;
  const cars = parkSide
    ? Array.from({ length: Math.ceil(stalls / 16) }, (_, block) => CAR_SLOTS.map((slot) => slot + block * 16))
        .flat()
        .filter((slot) => slot < stalls - 1)
    : [];

  const hedges: [number, number, number, number][] = [];
  const trees: UV[] = [];
  for (const side of sides) {
    if (kind(side) === "dock" || kind(side) === "charging") continue;
    const parked = kind(side) === "park";
    const out = parked ? 2.0 : 0.6;
    const [u0, v0, u1, v1] = band(side, out, out + (parked ? 0.3 : 0.4), parked ? 0.2 : 0, (side[1] === "u" ? rows : cols) + (parked ? 0.2 : 0));
    hedges.push([u0, v0, u1 - u0, v1 - v0]);
    if (parked) continue;
    for (let along = 1; along < (side[1] === "u" ? rows : cols) + 1; along += 2.2) trees.push(outside(side, 1.0, along));
  }

  const lines = roads.flatMap(({ side, outer }) =>
    [1.4, 3.0].map((extra) => {
      const [u, v] = outside(side, outer + extra, 0);
      return side[1] === "u" ? { u } : { v };
    }),
  );

  return {
    props: [],
    exterior: {
      ...base,
      sitePaving: { ...base.sitePaving, rect: pave },
      roads: roads.map(({ rect }) => ({ rect })),
      truckYards,
      carPark: parkSide
        ? { rect: parkRect, stalls, stallWidth: base.carPark.stallWidth, cars }
        : { rect: [0, 0, 0, 0], stalls: 0, stallWidth: base.carPark.stallWidth, cars: [] },
      chargingArea: chargingSide
        ? {
            rect: [0.5, -2.8, cols + 0.2, -0.3],
            bays: { ...base.chargingArea.bays, at: [cols - 3.0, -1.25] },
            containers: base.chargingArea.containers,
          }
        : { rect: [0, 0, 0, 0], bays: { ...base.chargingArea.bays, count: 0 }, containers: [] },
      trucks,
      guardHouse,
      hedges,
      treeBelts: { ...base.treeBelts, lines },
      trees: { ...base.trees, at: trees },
    },
  };
}
