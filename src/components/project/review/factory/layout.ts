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

// What the profile card shows about a person. Placeholders until the simulation computes them.
export type PersonProfile = {
  area: string;
  status: string;
  task: string;
  // The person's main output figure, e.g. "Units this shift": "186".
  outputLabel: string;
  output: string;
  utilisation: number;
  costPerHour: number;
  costNote: string;
  // Shares of the shift so far, adding up to 1.
  shift: { working: number; walking: number; waiting: number; break: number };
};
export type Person = {
  id: string;
  name: string;
  role?: string;
  at: UV;
  vest: string;
  anim?: string;
  profile?: PersonProfile;
};
// What the profile card shows about a vehicle. Placeholders until the simulation computes them.
export type VehicleProfile = {
  hall: string;
  driver: string;
  capacity: string;
  status: string;
  job: string;
  avgMoveMin: number;
  utilisation: number;
  costPerHour: number;
  costNote: string;
  // Shares of the shift so far, adding up to 1.
  shift: { driving: number; lifting: number; waiting: number; idle: number };
};
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
  profile?: VehicleProfile;
};
export type Truck = { trailer: UV; cab: "blue" | "orange"; docked?: string; waiting?: boolean; brand?: boolean };

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
  zones: { laneRow: number; laneCol: number; colors: Record<ZoneName, string> };
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
    truckYards: { rect: Rect }[];
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

// "bob 1.7s" -> 1.7
export function bobSeconds(anim?: string) {
  const match = anim?.match(/^bob\s+([\d.]+)s$/);
  return match ? Number(match[1]) : null;
}
