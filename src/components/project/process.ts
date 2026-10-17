import { FacilityLayout, TILE, ZoneKind, layoutDocks, layoutTiles, layoutZones } from "./layouts";
import { PlacedWorkstation, WorkstationTypeId, footprint, workstationType } from "./workstations";

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

export const MTM_CODES = ["KA", "HA1", "HA2", "HA3", "BA2", "BA3", "AA1", "AA2", "AA3", "VA", "ZA"];

export type Workflow = { id: string; kind: StationKind; name: string; subtasks: Omit<Subtask, "id">[] };

const workflow = (kind: StationKind, name: string, subtasks: [string, string, number][]): Workflow => ({
  id: `${kind}:${name}`,
  kind,
  name,
  subtasks: subtasks.map(([code, label, seconds]) => ({ code, label, seconds })),
});

// Standard MTM-UAS workflows per kind of stop, times per pallet.
export const WORKFLOWS: Workflow[] = [
  workflow("inbound-dock", "Unload truck", [
    ["KA", "Walk to truck, 5 m", 4.0],
    ["HA2", "Position pallet jack under pallet", 6.1],
    ["BA2", "Lift pallet with jack", 2.2],
    ["KA", "Pull pallet to staging lane, 12 m", 9.4],
    ["AA3", "Lower and place pallet", 3.5],
    ["VA", "Visual check for damage", 1.8],
  ]),
  workflow("inbound-dock", "Goods receipt check", [
    ["VA", "Compare delivery note", 5.2],
    ["HA1", "Scan pallet label", 3.1],
    ["VA", "Count packages", 6.4],
    ["ZA", "Confirm receipt in WMS", 3.8],
  ]),
  workflow("inbound-dock", "Label & scan pallet", [
    ["HA1", "Pick label", 2.0],
    ["HA2", "Apply label", 3.6],
    ["HA1", "Scan label", 2.4],
    ["ZA", "Confirm in WMS", 4.2],
  ]),
  workflow("inbound-dock", "Stage for put-away", [
    ["BA2", "Lift pallet with jack", 2.2],
    ["KA", "Move to staging, 6 m", 4.8],
    ["AA3", "Lower and place pallet", 2.8],
  ]),
  workflow("pallet-rack", "Put away pallet", [
    ["HA2", "Fork into pallet", 4.5],
    ["KA", "Drive to rack location, 20 m", 14.0],
    ["BA3", "Lift to level 3", 8.5],
    ["AA3", "Place pallet in bay", 4.0],
    ["HA1", "Scan bay label", 2.0],
  ]),
  workflow("pallet-rack", "Pick pallet", [
    ["KA", "Drive to bay, 15 m", 12.0],
    ["BA3", "Lower pallet from level", 7.5],
    ["HA2", "Withdraw forks", 3.0],
    ["HA1", "Scan pallet", 2.0],
  ]),
  workflow("pallet-rack", "Replenish pick face", [
    ["KA", "Fetch reserve pallet", 15.0],
    ["AA3", "Place in pick face", 4.0],
    ["ZA", "Confirm in WMS", 2.0],
  ]),
  workflow("assembly-line", "Assemble module", [
    ["HA2", "Take part from bin", 2.4],
    ["AA2", "Position part", 3.1],
    ["HA3", "Fasten 4 screws", 14.0],
    ["VA", "Check fit", 2.5],
  ]),
  workflow("assembly-line", "Kitting", [
    ["HA1", "Pick 6 parts", 9.6],
    ["AA1", "Place in kit tray", 4.2],
    ["VA", "Check kit", 2.2],
  ]),
  workflow("assembly-line", "Sequence parts", [
    ["HA1", "Scan sequence sheet", 2.0],
    ["KA", "Walk to rack, 4 m", 3.2],
    ["HA2", "Pick part", 2.4],
    ["AA2", "Place in sequence slot", 2.6],
  ]),
  workflow("packing-table", "Pack carton", [
    ["HA2", "Fold carton", 6.0],
    ["AA2", "Place goods", 4.5],
    ["HA2", "Add filler", 3.0],
    ["HA3", "Tape carton", 5.5],
  ]),
  workflow("packing-table", "Label shipment", [
    ["HA1", "Print label", 3.0],
    ["HA2", "Apply label", 2.6],
    ["HA1", "Scan label", 2.0],
  ]),
  workflow("packing-table", "Wrap pallet", [
    ["KA", "Walk around pallet 3 times", 18.0],
    ["HA2", "Cut film", 2.5],
  ]),
  workflow("outbound-dock", "Load truck", [
    ["BA2", "Lift pallet", 2.2],
    ["KA", "Drive into trailer, 10 m", 8.0],
    ["AA3", "Lower and place pallet", 3.5],
    ["KA", "Return to dock, 10 m", 8.0],
  ]),
  workflow("outbound-dock", "Shipping check", [
    ["VA", "Check labels", 4.0],
    ["HA1", "Scan pallet", 2.0],
    ["ZA", "Confirm in WMS", 3.8],
  ]),
  workflow("outbound-dock", "Stage for loading", [
    ["BA2", "Lift pallet", 2.2],
    ["KA", "Move to loading lane, 8 m", 6.4],
    ["AA3", "Lower and place pallet", 2.8],
  ]),
];

export const subtaskSeconds = (subtasks: { seconds: number }[]) =>
  subtasks.reduce((sum, subtask) => sum + subtask.seconds, 0);

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

export const stepMinutes = (step: ProcessStep) => (step.basis === "unit" ? step.minutes * step.units : step.minutes);

export type Leg = { distance: number; minutes: number; transport: Transport };

export function processMetrics(steps: ProcessStep[], route: Station[], forklifts: number) {
  // legs[i] is how the pallet reaches step i; the first step has none.
  const legs: (Leg | null)[] = steps.map((step, index) => {
    if (index === 0) return null;
    const distance = travelDistance(route[index - 1], route[index]);
    const transport = TRANSPORTS[step.transport];
    return { distance, minutes: distance / transport.speed + transport.handling, transport: step.transport };
  });
  const times = steps.map(stepMinutes);
  const total = times.reduce((sum, value) => sum + value, 0);
  const slowest = Math.max(0, ...times);
  const bottleneck = slowest > 0 ? times.indexOf(slowest) : null;
  // Pallets per hour, limited by the slowest step.
  const throughput = slowest > 0 ? 60 / slowest : 0;
  const forkliftLegs = legs.filter((leg): leg is Leg => leg?.transport === "forklift");
  const forkliftMinutes = forkliftLegs.reduce((sum, leg) => sum + leg.minutes, 0);
  const forkliftBusy = forklifts > 0 ? Math.min((forkliftMinutes * throughput) / (60 * forklifts), 1) : null;
  const travel = legs.reduce((sum, leg) => sum + (leg?.minutes ?? 0), 0);
  return {
    legs,
    times,
    total,
    travel,
    bottleneck,
    throughput,
    forkliftBusy,
    distance: legs.reduce((sum, leg) => sum + (leg?.distance ?? 0), 0),
    forkliftTrips: forkliftLegs.length,
    people: steps.reduce((sum, step) => sum + step.operators, 0),
  };
}

export type Metrics = ReturnType<typeof processMetrics>;

// The simulation releases one pallet every bottleneck interval, so no pallet ever waits.
export const SIM_PALLETS = 10;

// Where one pallet is: handled at a step, or on the leg towards a step (fraction 0–1).
export type PalletPosition = { at: "step" | "leg"; index: number; fraction: number };

export function simulation(metrics: Metrics) {
  const interval = metrics.times[metrics.bottleneck ?? 0] || 1;
  const segments = metrics.times.flatMap((minutes, index) => {
    const leg = metrics.legs[index];
    return [
      ...(leg ? [{ at: "leg" as const, index, minutes: leg.minutes }] : []),
      { at: "step" as const, index, minutes },
    ];
  });
  const cycle = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  const duration = (SIM_PALLETS - 1) * interval + cycle;

  function position(pallet: number, time: number): PalletPosition | null {
    let local = time - pallet * interval;
    if (local < 0 || local >= cycle) return null;
    for (const segment of segments) {
      if (local < segment.minutes) return { at: segment.at, index: segment.index, fraction: local / segment.minutes };
      local -= segment.minutes;
    }
    return null;
  }

  // The oldest pallet still in the hall is the one the view follows.
  function state(time: number) {
    const pallets = Array.from({ length: SIM_PALLETS }, (_, pallet) => position(pallet, time));
    const busy = new Set(pallets.flatMap((item) => (item?.at === "step" ? [item.index] : [])));
    const followed = pallets.findIndex((item) => item !== null);
    return { busy, pallet: followed, position: followed >= 0 ? pallets[followed] : null };
  }

  return { duration, state };
}

export const minutesLabel = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} min`;
