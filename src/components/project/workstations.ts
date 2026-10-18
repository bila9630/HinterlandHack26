import {
  DOCK_DEPTH,
  DOCK_WIDTH,
  DockKind,
  FacilityLayout,
  TILE,
  ZONE_LABELS,
  ZoneKind,
  layoutDocks,
  layoutSize,
  layoutTiles,
} from "./layouts";

export type WorkstationTypeId = "pallet-rack" | "assembly-line" | "packing-table" | "pallet-staging" | "forklift";

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

// Sizes match the factory scene's models (one floor cell is 10 m).
export const RACK_LEVELS = 3;
export const RACK_BAY = 6.2;
const RACK_LENGTH = 26;
export const ASSEMBLY_STATIONS = 3;
const ASSEMBLY_LENGTH = 42;
// The assembly line's conveyor runs along its back; its operators stand in front of it.
export const CONVEYOR_DEPTH = 4;
export const STAGING_PALLETS = 3;

export const WORKSTATION_TYPES: WorkstationType[] = [
  {
    id: "pallet-rack",
    name: "Pallet rack",
    fits: ["warehouse"],
    length: RACK_LENGTH,
    depth: 4.2,
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
    depth: 8,
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
    length: 7,
    depth: 4,
    specs: [
      { label: "Size", value: "7 × 4 m" },
      { label: "Packers", value: "4" },
    ],
    tone: { bg: "#fdf0e2", fg: "#d0782a" },
  },
  {
    id: "pallet-staging",
    name: "Pallet staging",
    fits: ["inbound", "outbound", "production"],
    length: 13,
    depth: 4,
    specs: [
      { label: "Size", value: "13 × 4 m" },
      { label: "Pallet places", value: String(STAGING_PALLETS) },
    ],
    tone: { bg: "#f6eee2", fg: "#a8763c" },
  },
  {
    id: "forklift",
    name: "Forklift",
    fits: ["lane"],
    length: 8,
    depth: 4,
    specs: [
      { label: "Size", value: "8 × 4 m" },
      { label: "Capacity", value: "1.6 t" },
    ],
    tone: { bg: "#fdf6dc", fg: "#c39410" },
  },
];

export function workstationType(id: WorkstationTypeId) {
  return WORKSTATION_TYPES.find((type) => type.id === id)!;
}

// Whether pallets stop at a workstation as a step of the process. Forklifts carry them
// between stops and staging areas hold them, so neither is a stop of its own.
export const isStop = (id: WorkstationTypeId) => id !== "forklift" && id !== "pallet-staging";

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

type Side = "+z" | "+x" | "-z" | "-x";
// Preferred first on a tie: a front towards +z or +x is where the models face.
const SIDES: Side[] = ["+z", "+x", "-z", "-x"];

// The side of a region that borders the most lane squares: its aisle.
function aisleSide(layout: FacilityLayout, region: Region): Side {
  const lanes = new Set(layoutTiles(layout).filter((tile) => tile.kind === "lane").map((tile) => `${tile.x},${tile.z}`));
  const [x0, z0] = [region.minX / TILE, region.minZ / TILE];
  const [x1, z1] = [x0 + region.length / TILE, z0 + region.depth / TILE];
  const count = (side: Side) => {
    let lane = 0;
    if (side === "+z" || side === "-z") {
      for (let x = x0; x < x1; x++) lane += Number(lanes.has(`${x},${side === "+z" ? z1 : z0 - 1}`));
    } else {
      for (let z = z0; z < z1; z++) lane += Number(lanes.has(`${side === "+x" ? x1 : x0 - 1},${z}`));
    }
    return lane;
  };
  return SIDES.reduce((best, side) => (count(side) > count(best) ? side : best));
}

// A region as seen from its aisle: `along` runs beside the aisle and `inward` is the
// distance from it. Workstations placed with `at` run along the aisle, their front
// (+z, or +x when turned) towards it when the aisle is on +z or +x.
function aisleFrame(region: Region, side: Side) {
  const alongZ = side === "+x" || side === "-x";
  const edge = {
    "+z": region.minZ + region.depth,
    "-z": region.minZ,
    "+x": region.minX + region.length,
    "-x": region.minX,
  }[side];
  const sign = side[0] === "+" ? -1 : 1;
  return {
    alongMin: alongZ ? region.minZ : region.minX,
    alongLength: alongZ ? region.depth : region.length,
    depth: alongZ ? region.length : region.depth,
    at: (along: number, inward: number): Placement => {
      const across = edge + sign * inward;
      return alongZ ? { x: across, z: along, rotated: true } : { x: along, z: across, rotated: false };
    },
  };
}

// FloorGenie lays the floor out the way the factory scene does, in metres. Production:
// one assembly line centred along the aisle with its operators towards it, and between
// them and the aisle a packing table near the line's start with pallets staged beside it.
const LINE_SETBACK = 9;
const TABLE_INWARD = 3.5;
const TABLE_START = 7.5;
const STAGING_START = 19;
// Warehouse: rows of racks along the aisle, the first this far from it, then one every
// RACK_PITCH (a rack and a forklift aisle), keeping RACK_SETBACK clear at the far side.
const RACK_SETBACK = 4;
const RACK_PITCH = 15;
const RACK_GAP = 2;
// Docks: pallets staged along the wall in line with the first door, this far in from the
// wall (or nearer where the dock area is shallow); and a forklift on the aisle beside each dock area.
const STAGING_SETBACK: Record<DockKind, number> = { inbound: 11.5, outbound: 3 };
const NEAR_STAGING_SETBACK = 3;

// Plans a floor like the factory scene: an assembly line with its packing table and
// staged pallets in production, rows of racks in the warehouse, staged pallets behind
// the dock doors and a forklift on the aisle of each dock area. Workstations already
// placed are kept; planned ones that would clash with them are left out.
export function autoPlace(layout: FacilityLayout, existing: PlacedWorkstation[]): PlacedWorkstation[] {
  const size = layoutSize(layout);
  const regions = zoneRegions(layout).map((region) => ({ ...region, frame: aisleFrame(region, aisleSide(layout, region)) }));
  const placed = [...existing];

  // Places the workstation at the first of the spots where it fits.
  function tryPlace(typeId: WorkstationTypeId, ...spots: Placement[]) {
    const type = workstationType(typeId);
    for (const spot of spots) {
      const snapped = snapPlacement(layout, type, spot);
      if (placementProblem(layout, type, snapped, placed)) continue;
      placed.push({ ...snapped, typeId, id: crypto.randomUUID() });
      return true;
    }
    return false;
  }

  const line = workstationType("assembly-line");
  const table = workstationType("packing-table");
  const staging = workstationType("pallet-staging");
  const rack = workstationType("pallet-rack");

  for (const { kind, frame } of regions) {
    if (kind !== "production") continue;
    const start = frame.alongMin + (frame.alongLength - line.length) / 2;
    // A zone too shallow for the table in front gets only the line, across its middle.
    const roomy = frame.depth >= LINE_SETBACK + line.depth;
    const inward = roomy ? LINE_SETBACK + line.depth / 2 : frame.depth / 2;
    if (!tryPlace("assembly-line", frame.at(start + line.length / 2, inward)) || !roomy) continue;
    tryPlace("packing-table", frame.at(start + TABLE_START + table.length / 2, TABLE_INWARD));
    tryPlace("pallet-staging", frame.at(start + STAGING_START + staging.length / 2, TABLE_INWARD));
  }

  for (const dock of layoutDocks(layout)) {
    const door = dock.doors[0];
    const inward = door.rotated ? (door.x < size.length / 2 ? 1 : -1) : door.z < size.depth / 2 ? 1 : -1;
    const wall = inward > 0 ? 0 : door.rotated ? size.length : size.depth;
    const spot = (setback: number): Placement => {
      const across = wall + inward * (setback + staging.depth / 2);
      return door.rotated ? { x: across, z: door.z, rotated: true } : { x: door.x, z: across, rotated: false };
    };
    tryPlace("pallet-staging", spot(STAGING_SETBACK[dock.kind]), spot(NEAR_STAGING_SETBACK));
  }

  for (const { kind, frame } of regions) {
    if (kind !== "warehouse") continue;
    const perRow = fitCount(frame.alongLength, rack.length, RACK_GAP);
    for (let inward = RACK_SETBACK; inward + rack.depth + RACK_SETBACK <= frame.depth; inward += RACK_PITCH) {
      for (const along of spread(frame.alongMin, frame.alongLength, rack.length, perRow)) {
        tryPlace("pallet-rack", frame.at(along, inward + rack.depth / 2));
      }
    }
  }

  // The forklift stands in the middle of the lane square beside the dock area's centre.
  for (const { kind, frame } of regions) {
    if (kind !== "inbound" && kind !== "outbound") continue;
    const along = (Math.floor((frame.alongMin + frame.alongLength / 2) / TILE) + 0.5) * TILE;
    tryPlace("forklift", frame.at(along, -TILE / 2));
  }

  return placed;
}
