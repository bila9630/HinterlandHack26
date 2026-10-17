import { FacilityLayout, TILE, ZoneKind, layoutDocks, layoutTiles, layoutZones } from "../layouts";
import { PlacedWorkstation, WorkstationTypeId, footprint, workstationType } from "../workstations";

// Everything a pallet can stop at: the docks plus the placed workstations (forklifts
// carry the pallet between stops, so they are not stops themselves).
export type StationKind = "inbound-dock" | Exclude<WorkstationTypeId, "forklift"> | "outbound-dock";

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

// Positions in metres; the stop is where the pallet is handled, the box is the area it belongs to.
export type Station = { id: string; kind: StationKind; zone: ZoneKind; x: number; z: number; box: Box };

export const STATION_ORDER: StationKind[] = [
  "inbound-dock",
  "pallet-rack",
  "assembly-line",
  "packing-table",
  "outbound-dock",
];

const DOCK_TONES = {
  "inbound-dock": { bg: "#e6ecfd", fg: "#2c4fd6" },
  "outbound-dock": { bg: "#fdeedd", fg: "#e8891f" },
};

export function stationInfo(kind: StationKind) {
  if (kind === "inbound-dock" || kind === "outbound-dock") {
    return { name: kind === "inbound-dock" ? "Inbound dock" : "Outbound dock", tone: DOCK_TONES[kind] };
  }
  const type = workstationType(kind);
  return { name: type.name, tone: type.tone };
}

export const stationName = (kind: StationKind) => stationInfo(kind).name;

// How far in front of the dock doors (into the hall) the dock's stop sits, in metres.
const DOCK_STOP_DEPTH = 6;

export function layoutStations(layout: FacilityLayout, workstations: PlacedWorkstation[]): Station[] {
  const zones = layoutZones(layout);
  const tiles = layoutTiles(layout);
  const zoneAt = (x: number, z: number) =>
    tiles.find((tile) => tile.x === Math.floor(x / TILE) && tile.z === Math.floor(z / TILE))?.kind ?? "lane";
  const docks: Station[] = layoutDocks(layout).map((dock) => {
    const zone = zones.find((item) => item.kind === dock.kind)!;
    const towards = { x: zone.centre[0] * TILE - dock.label.x, z: zone.centre[1] * TILE - dock.label.z };
    const length = Math.hypot(towards.x, towards.z) || 1;
    const x = dock.label.x + (towards.x / length) * DOCK_STOP_DEPTH;
    const z = dock.label.z + (towards.z / length) * DOCK_STOP_DEPTH;
    // The dock area runs along the wall with the doors.
    const [halfX, halfZ] = Math.abs(towards.z) > Math.abs(towards.x) ? [9, 6] : [6, 9];
    return {
      id: `dock-${dock.kind}`,
      kind: `${dock.kind}-dock` as StationKind,
      zone: dock.kind,
      x,
      z,
      box: { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ },
    };
  });
  const placed: Station[] = workstations
    .filter((item) => item.typeId !== "forklift")
    .map((item) => ({
      id: item.id,
      kind: item.typeId as StationKind,
      zone: zoneAt(item.x, item.z),
      x: item.x,
      z: item.z,
      box: footprint(workstationType(item.typeId), item),
    }));
  return [...docks, ...placed].sort((a, b) => STATION_ORDER.indexOf(a.kind) - STATION_ORDER.indexOf(b.kind));
}

// Pallets travel along the lanes, so distance is measured along x, then along z.
export const travelDistance = (from: Station, to: Station) => Math.abs(from.x - to.x) + Math.abs(from.z - to.z);

export type Transport = "forklift" | "pallet-truck" | "conveyor" | "by-hand";

// Speed in metres per minute and minutes to pick up and set down the pallet.
export const TRANSPORTS: Record<Transport, { name: string; speed: number; handling: number }> = {
  forklift: { name: "Forklift", speed: 100, handling: 0.5 },
  "pallet-truck": { name: "Pallet truck", speed: 60, handling: 0.3 },
  conveyor: { name: "Conveyor", speed: 20, handling: 0 },
  "by-hand": { name: "By hand", speed: 50, handling: 0.2 },
};

export type Equipment = "none" | "forklift" | "pallet-truck" | "scanner";

export const EQUIPMENT: Record<Equipment, string> = {
  none: "None",
  forklift: "Forklift",
  "pallet-truck": "Pallet truck",
  scanner: "Scanner",
};

export type Subtask = { id: string; code: string; label: string; seconds: number };

export type ProcessStep = {
  id: string;
  stationId: string;
  // What happens to the pallet here; empty until a task is chosen.
  action: string;
  // Handling time is either per pallet, or per unit times the units on a pallet.
  basis: "pallet" | "unit";
  minutes: number;
  units: number;
  operators: number;
  equipment: Equipment;
  // How the pallet gets here from the previous step.
  transport: Transport;
  // MTM-UAS breakdown, when the step was built from a workflow.
  subtasks: Subtask[];
};

type StationDefaults = Pick<ProcessStep, "action" | "basis" | "minutes" | "operators" | "equipment"> & {
  actions: string[];
};

export const STATION_DEFAULTS: Record<StationKind, StationDefaults> = {
  "inbound-dock": {
    actions: ["Unload & check", "Unload", "Goods receipt check", "Label & scan"],
    action: "Unload & check",
    basis: "pallet",
    minutes: 4,
    operators: 1,
    equipment: "none",
  },
  "pallet-rack": {
    actions: ["Put away", "Store", "Pick", "Replenish"],
    action: "Put away",
    basis: "pallet",
    minutes: 3,
    operators: 1,
    equipment: "forklift",
  },
  "assembly-line": {
    actions: ["Assemble", "Kitting", "Sequence"],
    action: "Assemble",
    basis: "unit",
    minutes: 6,
    operators: 3,
    equipment: "none",
  },
  "packing-table": {
    actions: ["Pack", "Repack", "Label"],
    action: "Pack",
    basis: "unit",
    minutes: 2,
    operators: 1,
    equipment: "none",
  },
  "outbound-dock": {
    actions: ["Load", "Stage", "Shipping check"],
    action: "Load",
    basis: "pallet",
    minutes: 4,
    operators: 1,
    equipment: "forklift",
  },
};

// A short walk is done by hand; anything further goes by forklift.
export const defaultTransport = (distance: number): Transport => (distance < 10 ? "by-hand" : "forklift");

// A new step at a station; with a task it starts from the station's usual action.
export function newStep(station: Station, previous: Station | undefined, withTask: boolean): ProcessStep {
  const { actions: _actions, ...defaults } = STATION_DEFAULTS[station.kind];
  return {
    id: crypto.randomUUID(),
    stationId: station.id,
    ...defaults,
    ...(withTask ? {} : { action: "", minutes: 0 }),
    units: 1,
    transport: defaultTransport(previous ? travelDistance(previous, station) : 0),
    subtasks: [],
  };
}

// Inbound dock first, then the closest stop of each next kind.
export function suggestedRoute(stations: Station[]) {
  const route: Station[] = [];
  for (const kind of STATION_ORDER) {
    const last = route[route.length - 1];
    const candidates = stations.filter((station) => station.kind === kind);
    if (candidates.length === 0) continue;
    route.push(
      candidates.reduce((best, station) =>
        last && travelDistance(last, station) < travelDistance(last, best) ? station : best,
      ),
    );
  }
  return route;
}

export type NextOption = { station: Station; distance: number };

// Nearest stops of each kind from the end of the route, for choosing the next one.
export function nextOptions(stations: Station[], last: Station | undefined): NextOption[] {
  const byKind = new Map<string, Station>();
  for (const station of stations) {
    if (station.id === last?.id) continue;
    const best = byKind.get(station.kind);
    if (!best || (last && travelDistance(last, station) < travelDistance(last, best))) byKind.set(station.kind, station);
  }
  return [...byKind.values()]
    .map((station) => ({ station, distance: last ? Math.round(travelDistance(last, station)) : 0 }))
    .sort((a, b) => a.distance - b.distance);
}
