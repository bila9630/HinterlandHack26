import data from "./factoryLayout.json";

// The scene's input: everything placed in the hall and around it. See factoryLayout.json.
export type UV = [number, number];
// [u0, v0, u1, v1]
export type Rect = [number, number, number, number];
// [u0, v0, W, D]
export type Footprint = [number, number, number, number];
export type DockType = "inbound" | "outbound";
export type ZoneName = "inbound" | "outbound" | "production" | "warehouse" | "lane";

export type Dock = { id: string; wall: string; v: [number, number]; type: DockType; open: boolean };
export type Station = {
  n: number;
  name: string;
  label: string;
  anchor: [number, number, number];
  utilisation: number;
  warning?: boolean;
};

type Placed = { sortAt?: UV };
export type Conveyor = Placed & {
  type: "conveyor";
  box: Footprint;
  height: number;
  beltPath: UV[];
  beltZ: number;
  items: number;
  loopSec: number;
};
export type Rack = Placed & {
  type: "rack";
  origin: UV;
  size: UV;
  levels: number[];
  height: number;
  uprights: number[];
};
export type Table = Placed & { type: "table"; box: Footprint; height: number };
// A row of pallets (or loose boxes) from `at`, `step` apart.
export type PalletRow = Placed & {
  type: "palletQueue" | "palletStaging" | "looseBoxes";
  at: UV;
  step: UV;
  count: number;
  load?: "box" | "wrapped";
  loadHeight?: number;
  layers?: number;
  z?: number;
};
export type ChargingForklift = Placed & { type: "chargingForklift"; at: UV };
export type SceneObject = Conveyor | Rack | Table | PalletRow | ChargingForklift;

export type Person = { id: string; name: string; role?: string; at: UV; vest: string; anim?: string };
export type Vehicle = {
  id: string;
  type: "forklift" | "palletJackWithWorker";
  loaded?: boolean;
  route: UV[];
  loopSec: number;
  // Seconds it stands at each stop: where the route repeats a point, and at its start.
  dwellSec?: number;
  task: string;
  sortAt?: UV;
  showRoute?: boolean;
};
// The side of the hall something outside it stands on.
export type HallSide = "-u" | "+u" | "-v" | "+v";
// A truck backed up to the hall. Without `side` it stands on the -u side, `trailer` being the
// trailer's [u0, v0] corner; with it, `trailer` is the middle of the trailer's back end.
export type Truck = {
  trailer: UV;
  cab: "blue" | "orange";
  side?: HallSide;
  docked?: string;
  waiting?: boolean;
  brand?: boolean;
};

export type FactoryLayout = {
  camera: {
    C: number;
    S: number;
    ZS: number;
    L: number;
    viewBox: [number, number, number, number];
    preserveAspectRatio: string;
    labelScale: number;
  };
  hall: {
    cols: number;
    rows: number;
    wallHeight: number;
    wallStyle: string;
    slabColor: string;
    markings: { dashed: [UV, UV][]; solid: [UV, UV][] };
  };
  // Zones by the rule (lane on laneRow and laneCol), or square by square from `grid`: one
  // string per row, one character per column (I, W, P, O or L).
  zones: { laneRow?: number; laneCol?: number; grid?: string[]; colors: Record<ZoneName, string> };
  docks: Dock[];
  stations: Station[];
  objects: SceneObject[];
  people: Person[];
  vehicles: Vehicle[];
  exterior: {
    groundColor: string;
    groundExtent: number;
    sitePaving: { rect: Rect; color: string };
    roadColor: string;
    yardColor: string;
    roads: { rect: Rect; centerLine?: boolean }[];
    // Parking lines run along u, or along v.
    truckYards: { rect: Rect; stripes?: "u" | "v" }[];
    carPark: { rect: Rect; stalls: number; stallWidth: number; cars: number[] };
    chargingArea: {
      rect: Rect;
      bays: { at: UV; size: UV; step: number; count: number };
      containers: { at: UV; color: number; z?: number }[];
    };
    trucks: Truck[];
    guardHouse: { at: UV };
    hedges: Footprint[];
    treeBelts: {
      seed: number;
      from: number;
      to: number;
      spacing: number;
      jitter: number;
      scale: UV;
      lines: { u?: number; v?: number }[];
    };
    trees: { scale: number; at: UV[] };
  };
};

export const factoryLayout = data as unknown as FactoryLayout;

const ZONE_BY_CHAR: Record<string, ZoneName> = { I: "inbound", W: "warehouse", P: "production", O: "outbound", L: "lane" };

// The zone of a floor cell.
export function zoneAt(col: number, row: number, { laneRow = -1, laneCol = -1, grid }: FactoryLayout["zones"]): ZoneName {
  if (grid) return ZONE_BY_CHAR[grid[row][col]];
  if (row === laneRow || col === laneCol) return "lane";
  if (col < laneCol) return row < laneRow ? "outbound" : "inbound";
  return row < laneRow ? "production" : "warehouse";
}

// "bob 1.7s" -> 1.7
export function bobSeconds(anim?: string) {
  const match = anim?.match(/^bob\s+([\d.]+)s$/);
  return match ? Number(match[1]) : null;
}
