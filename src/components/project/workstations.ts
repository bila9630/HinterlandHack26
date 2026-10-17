import {
  DOCK_DEPTH,
  DOCK_WIDTH,
  FacilityLayout,
  TILE,
  ZONE_LABELS,
  ZoneKind,
  layoutDocks,
  layoutSize,
  layoutTiles,
} from "./layouts";

export type WorkstationTypeId = "pallet-rack" | "assembly-line" | "packing-table" | "forklift";

export type WorkstationType = {
  id: WorkstationTypeId;
  name: string;
  fits: ZoneKind[];
  // Footprint in metres before rotation: length along x, depth along z.
  length: number;
  depth: number;
  specs: { label: string; value: string }[];
  tone: { bg: string; fg: string };
};

export const RACK_LEVELS = 3;
export const RACK_BAY = 2.7;
const RACK_LENGTH = 22;
export const ASSEMBLY_STATIONS = 3;
const ASSEMBLY_LENGTH = 40;

export const WORKSTATION_TYPES: WorkstationType[] = [
  {
    id: "pallet-rack",
    name: "Pallet rack",
    fits: ["warehouse"],
    length: RACK_LENGTH,
    depth: 2,
    specs: [
      { label: "Length", value: `${RACK_LENGTH} m` },
      { label: "Levels", value: String(RACK_LEVELS) },
      { label: "Pallet places", value: String(Math.floor(RACK_LENGTH / RACK_BAY) * RACK_LEVELS) },
    ],
    tone: { bg: "#e3f5ec", fg: "#2f8f62" },
  },
  {
    id: "assembly-line",
    name: "Assembly line",
    fits: ["production"],
    length: ASSEMBLY_LENGTH,
    depth: 5,
    specs: [
      { label: "Length", value: `${ASSEMBLY_LENGTH} m` },
      { label: "Stations", value: String(ASSEMBLY_STATIONS) },
    ],
    tone: { bg: "#eef6d9", fg: "#6c8a22" },
  },
  {
    id: "packing-table",
    name: "Packing table",
    fits: ["production", "inbound", "outbound"],
    length: 9,
    depth: 4,
    specs: [
      { label: "Size", value: "9 × 4 m" },
      { label: "Packers", value: "4" },
    ],
    tone: { bg: "#fdf0e2", fg: "#d0782a" },
  },
  {
    id: "forklift",
    name: "Forklift",
    fits: ["lane"],
    length: 5,
    depth: 3,
    specs: [
      { label: "Size", value: "5 × 3 m" },
      { label: "Capacity", value: "1.6 t" },
    ],
    tone: { bg: "#fdf6dc", fg: "#c39410" },
  },
];

export function workstationType(id: WorkstationTypeId) {
  return WORKSTATION_TYPES.find((type) => type.id === id)!;
}

export function fitsLabel(type: WorkstationType) {
  return type.fits.map((kind) => (kind === "lane" ? "Forklift lanes" : ZONE_LABELS[kind])).join(" · ");
}

// Position is the footprint centre in metres; rotated turns the footprint by 90°.
export type Placement = { x: number; z: number; rotated: boolean };
export type PlacedWorkstation = Placement & { id: string; typeId: WorkstationTypeId };

export function footprint(type: WorkstationType, { x, z, rotated }: Placement) {
  const length = rotated ? type.depth : type.length;
  const depth = rotated ? type.length : type.depth;
  return { minX: x - length / 2, maxX: x + length / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
}

// Snaps the footprint's corner to the 1 m grid and keeps it on the floor.
export function snapPlacement(layout: FacilityLayout, type: WorkstationType, placement: Placement): Placement {
  const size = layoutSize(layout);
  const length = placement.rotated ? type.depth : type.length;
  const depth = placement.rotated ? type.length : type.depth;
  const minX = Math.min(Math.max(Math.round(placement.x - length / 2), 0), size.length - length);
  const minZ = Math.min(Math.max(Math.round(placement.z - depth / 2), 0), size.depth - depth);
  return { ...placement, x: minX + length / 2, z: minZ + depth / 2 };
}

// Only the footprint matters for dock doors, which are fixed parts of the layout.
const DOCK_TYPE = { length: DOCK_WIDTH, depth: DOCK_DEPTH } as WorkstationType;

// Why the workstation can't go here, or null when it fits.
export function placementProblem(
  layout: FacilityLayout,
  type: WorkstationType,
  placement: Placement,
  others: PlacedWorkstation[],
) {
  const box = footprint(type, placement);
  const epsilon = 1e-6;
  const outside = layoutTiles(layout).some(
    (tile) =>
      tile.x * TILE < box.maxX - epsilon &&
      (tile.x + 1) * TILE > box.minX + epsilon &&
      tile.z * TILE < box.maxZ - epsilon &&
      (tile.z + 1) * TILE > box.minZ + epsilon &&
      !type.fits.includes(tile.kind),
  );
  if (outside) return `Needs ${fitsLabel(type)}`;

  const hits = (other: ReturnType<typeof footprint>) =>
    other.minX < box.maxX - epsilon &&
    other.maxX > box.minX + epsilon &&
    other.minZ < box.maxZ - epsilon &&
    other.maxZ > box.minZ + epsilon;

  if (others.some((other) => hits(footprint(workstationType(other.typeId), other)))) {
    return "Overlaps another workstation";
  }
  const dockDoors = layoutDocks(layout).flatMap((dock) => dock.doors);
  if (dockDoors.some((door) => hits(footprint(DOCK_TYPE, door)))) return "Blocks a dock door";
  return null;
}

// A connected area of one zone kind, as a bounding box in metres.
type Region = { kind: ZoneKind; minX: number; minZ: number; length: number; depth: number };

function zoneRegions(layout: FacilityLayout): Region[] {
  const tiles = layoutTiles(layout);
  const key = (x: number, z: number) => `${x},${z}`;
  const kindAt = new Map(tiles.map((tile) => [key(tile.x, tile.z), tile.kind]));
  const seen = new Set<string>();
  const regions: Region[] = [];

  for (const start of tiles) {
    if (seen.has(key(start.x, start.z))) continue;
    seen.add(key(start.x, start.z));
    const stack = [start];
    const own: typeof tiles = [];
    while (stack.length > 0) {
      const tile = stack.pop()!;
      own.push(tile);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = tile.x + dx;
        const z = tile.z + dz;
        if (kindAt.get(key(x, z)) !== start.kind || seen.has(key(x, z))) continue;
        seen.add(key(x, z));
        stack.push({ kind: start.kind, x, z });
      }
    }
    const xs = own.map((tile) => tile.x);
    const zs = own.map((tile) => tile.z);
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    regions.push({
      kind: start.kind,
      minX: minX * TILE,
      minZ: minZ * TILE,
      length: (Math.max(...xs) - minX + 1) * TILE,
      depth: (Math.max(...zs) - minZ + 1) * TILE,
    });
  }
  return regions;
}

// How many items of a size fit in a span when every gap (edges included) is at least `gap`.
function fitCount(span: number, size: number, gap: number) {
  return Math.max(0, Math.floor((span - gap) / (size + gap)));
}

// Centres of n items spread evenly over a span, with equal space around each.
function spread(start: number, span: number, size: number, n: number) {
  const gap = (span - n * size) / (n + 1);
  return Array.from({ length: n }, (_, index) => start + gap * (index + 1) + size * (index + 0.5));
}

// A footprint laid out in a grid: length runs along the row, depth across it.
type Unit = { length: number; depth: number; gapAlong: number; gapAcross: number };

// Centres for up to `count` units in rows across the region, as many per row as fit and
// the rows spread evenly. rotated runs the rows along z. Prefers the orientation that
// fits the most units, then the one with more units per row.
function gridCentres(region: Region, unit: Unit, count: number) {
  const options = [false, true].map((rotated) => {
    const spanAlong = rotated ? region.depth : region.length;
    const spanAcross = rotated ? region.length : region.depth;
    const perRow = Math.min(fitCount(spanAlong, unit.length, unit.gapAlong), count);
    const rows = perRow && Math.min(fitCount(spanAcross, unit.depth, unit.gapAcross), Math.ceil(count / perRow));
    const alongs = spread(rotated ? region.minZ : region.minX, spanAlong, unit.length, perRow);
    const acrosses = spread(rotated ? region.minX : region.minZ, spanAcross, unit.depth, rows);
    const centres = acrosses
      .flatMap((across) => alongs.map((along) => (rotated ? { x: across, z: along } : { x: along, z: across })))
      .slice(0, count);
    return { rotated, perRow, centres };
  });
  return options.reduce((best, option) =>
    option.centres.length > best.centres.length ||
    (option.centres.length === best.centres.length && option.perRow > best.perRow)
      ? option
      : best,
  );
}

// Pallet racks per warehouse area and assembly lines per production area.
const RACKS_PER_ZONE = 6;
const LINES_PER_ZONE = 2;
// Packing tables at a dock stand right behind the door, which is this far from the wall.
const DOCK_CLEARANCE = DOCK_DEPTH;

// Plans a tidy floor: racks in evenly spaced rows, assembly lines with a packing table
// at their end, a packing table behind each dock door and forklifts spread over the
// lanes. Workstations already placed are kept; planned ones that would clash with them
// are left out.
export function autoPlace(layout: FacilityLayout, existing: PlacedWorkstation[]): PlacedWorkstation[] {
  const size = layoutSize(layout);
  const regions = zoneRegions(layout);
  const placed = [...existing];

  function tryPlace(typeId: WorkstationTypeId, candidates: Placement[]) {
    const type = workstationType(typeId);
    for (const candidate of candidates) {
      const placement = snapPlacement(layout, type, candidate);
      if (placementProblem(layout, type, placement, placed)) continue;
      placed.push({ ...placement, typeId, id: crypto.randomUUID() });
      return true;
    }
    return false;
  }

  const line = workstationType("assembly-line");
  const table = workstationType("packing-table");
  const rack = workstationType("pallet-rack");

  // Assembly lines, each with a packing table running the same way at its end: straight
  // after the line (which may then reach the zone edges), or beside its last stretch
  // when the zone is too short for that.
  for (const region of regions.filter((item) => item.kind === "production")) {
    const besideDepth = line.depth + 1 + table.depth;
    // The line's conveyor runs along its back (-z, or -x when turned), 40% of its depth wide.
    const conveyorAcross = -line.depth / 2 + (line.depth * 0.4) / 2;
    const options = [
      {
        unit: { length: line.length + 1 + table.length, depth: line.depth, gapAlong: 0, gapAcross: 3 },
        lineAcross: 0,
        tableAcross: conveyorAcross,
      },
      {
        unit: { length: line.length + 3, depth: besideDepth, gapAlong: 2, gapAcross: 3 },
        lineAcross: (line.depth - besideDepth) / 2,
        tableAcross: (besideDepth - table.depth) / 2,
      },
    ].map((option) => ({ ...option, grid: gridCentres(region, option.unit, LINES_PER_ZONE) }));
    const best = options.reduce((a, b) => (b.grid.centres.length > a.grid.centres.length ? b : a));
    const { rotated } = best.grid;
    for (const unitCentre of best.grid.centres) {
      // Line and table both snap to the 1 m grid; starting from a half metre lets them
      // snap without shifting, so the table stays in line with the conveyor.
      const half = (value: number) => Math.round(value - 0.5) + 0.5;
      const centre = rotated ? { ...unitCentre, x: half(unitCentre.x) } : { ...unitCentre, z: half(unitCentre.z) };
      const start = (rotated ? centre.z : centre.x) - best.unit.length / 2;
      const at = (along: number, across: number) =>
        rotated ? { x: centre.x + across, z: along, rotated } : { x: along, z: centre.z + across, rotated };
      if (tryPlace("assembly-line", [at(start + line.length / 2, best.lineAcross)])) {
        tryPlace("packing-table", [at(start + best.unit.length - table.length / 2, best.tableAcross)]);
      }
    }
  }

  // A packing table behind each dock door, all square to the wall or else all along it.
  for (const dock of layoutDocks(layout)) {
    const at = (door: (typeof dock.doors)[number], along: boolean) => {
      const depth = along ? table.depth : table.length;
      const inward = door.rotated ? (door.x < size.length / 2 ? 1 : -1) : door.z < size.depth / 2 ? 1 : -1;
      const wall = inward > 0 ? 0 : door.rotated ? size.length : size.depth;
      const offset = wall + inward * (DOCK_CLEARANCE + depth / 2);
      const rotated = along === door.rotated;
      return door.rotated ? { x: offset, z: door.z, rotated } : { x: door.x, z: offset, rotated };
    };
    const before = placed.length;
    if (dock.doors.every((door) => tryPlace("packing-table", [at(door, false)]))) continue;
    placed.length = before;
    for (const door of dock.doors) tryPlace("packing-table", [at(door, true)]);
  }

  // Pallet racks in rows with aisles between them.
  for (const region of regions.filter((item) => item.kind === "warehouse")) {
    const unit = { length: rack.length, depth: rack.depth, gapAlong: 2, gapAcross: 3 };
    const grid = gridCentres(region, unit, RACKS_PER_ZONE);
    for (const centre of grid.centres) tryPlace("pallet-rack", [{ ...centre, rotated: grid.rotated }]);
  }

  // Forklifts spread over the lanes: the first on the busiest crossing, each next one on
  // the lane square farthest from the others. Squares along the outer wall are avoided.
  const columns = size.length / TILE;
  const rows = size.depth / TILE;
  const lanes = layoutTiles(layout).filter((tile) => tile.kind === "lane");
  const isLane = (x: number, z: number) => lanes.some((tile) => tile.x === x && tile.z === z);
  const inner = lanes.filter((tile) => tile.x > 0 && tile.z > 0 && tile.x < columns - 1 && tile.z < rows - 1);
  const pool = inner.length > 0 ? inner : lanes;
  const links = (tile: { x: number; z: number }) => ({
    x: Number(isLane(tile.x - 1, tile.z)) + Number(isLane(tile.x + 1, tile.z)),
    z: Number(isLane(tile.x, tile.z - 1)) + Number(isLane(tile.x, tile.z + 1)),
  });
  const forklifts = Math.min(Math.max(Math.round(lanes.length / 5), 2), 4, pool.length);
  const chosen: typeof lanes = [];
  while (chosen.length < forklifts) {
    const score = (tile: (typeof lanes)[number]) =>
      chosen.length === 0
        ? links(tile).x + links(tile).z
        : Math.min(...chosen.map((other) => Math.hypot(other.x - tile.x, other.z - tile.z)));
    const next = pool
      .filter((tile) => !chosen.includes(tile))
      .reduce((best, tile) => (score(tile) > score(best) ? tile : best));
    chosen.push(next);
    // Face the forklift along the lane.
    const { x, z } = links(next);
    tryPlace("forklift", [{ x: (next.x + 0.5) * TILE, z: (next.z + 0.5) * TILE, rotated: z > x }]);
  }

  return placed;
}
