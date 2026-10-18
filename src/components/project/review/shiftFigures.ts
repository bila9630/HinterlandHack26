import { SHIFT_HOURS } from "../people";
import { StationKind, TRANSPORTS } from "../process/model";
import { PersonProfile, VehicleProfile } from "./factory/layout";
import { LiveStop } from "./liveSim";

// The figures the review's profile cards show, worked out from the simulated shift.

// Wage plus overhead (social security, supervision, space) per hour worked.
const OVERHEAD = 1.3;
// Running cost of the vehicle itself, per hour.
const VEHICLE_COST = { forklift: 8, jack: 2 };
// Shares of the shift on breaks, and of working time spent walking.
const BREAK = 0.08;
const WALKING = 0.15;
// Time a vehicle is not moving pallets is spent waiting for the next one, or idle.
const WAITING = 0.6;

const OUTPUT_LABEL: Record<StationKind, string> = {
  "inbound-dock": "Pallets unloaded",
  "pallet-rack": "Pallets put away",
  "assembly-line": "Units this shift",
  "packing-table": "Orders packed",
  "outbound-dock": "Pallets loaded",
};

export const percent = (share: number) => `${Math.round(share * 100)} %`;

// One of a stop's people: their share of its output, how busy the stop keeps them, and their cost.
export function personProfile({
  stop,
  n,
  area,
  status,
  wage,
  palletsPerHour,
}: {
  stop: LiveStop;
  n: number;
  area: string;
  status: string;
  wage: number;
  palletsPerHour: number;
}): PersonProfile {
  const units = stop.step.basis === "unit" ? stop.step.units : 1;
  const work = 1 - BREAK;
  const busy = stop.utilisation * work;
  return {
    area,
    status,
    task: `Station ${n}${stop.utilisation >= 0.95 ? " · bottleneck" : ""}`,
    outputLabel: OUTPUT_LABEL[stop.station.kind],
    output: String(Math.round((palletsPerHour * SHIFT_HOURS * units) / Math.max(stop.crew, 1))),
    utilisation: stop.utilisation,
    costPerHour: Math.round(wage * OVERHEAD),
    costNote: "wage + overhead",
    shift: { working: busy * (1 - WALKING), walking: busy * WALKING, waiting: work - busy, break: BREAK },
  };
}

// A forklift or pallet jack carrying every pallet of its stop `distance` metres and coming
// back empty: how long a move takes, how busy that keeps it, and its cost with its driver.
export function vehicleProfile({
  jack,
  driver,
  capacity,
  status,
  job,
  distance,
  wage,
  palletsPerHour,
}: {
  jack: boolean;
  driver: string;
  capacity: string;
  status: string;
  job: string;
  distance: number;
  wage: number;
  palletsPerHour: number;
}): VehicleProfile {
  const { speed, handling } = TRANSPORTS[jack ? "pallet-truck" : "forklift"];
  const trip = (2 * distance) / speed + handling;
  const busy = Math.min(1, (palletsPerHour * trip) / 60);
  return {
    hall: "Hall 1",
    driver,
    capacity,
    status,
    job,
    avgMoveMin: distance / speed + handling,
    utilisation: busy,
    costPerHour: Math.round(wage * OVERHEAD + VEHICLE_COST[jack ? "jack" : "forklift"]),
    costNote: jack ? "driver + jack" : "driver + vehicle",
    shift: {
      driving: (busy * (2 * distance)) / speed / trip,
      lifting: (busy * handling) / trip,
      waiting: (1 - busy) * WAITING,
      idle: (1 - busy) * (1 - WAITING),
    },
  };
}

// Pallets a vehicle moves in a shift, and the cost of a round trip with one.
export function tripFigures(profile: VehicleProfile, palletsPerHour: number) {
  const trips = Math.round(palletsPerHour * SHIFT_HOURS);
  // There and back again, at the vehicle's hourly cost.
  const tripCost = ((profile.avgMoveMin * 2) / 60) * profile.costPerHour;
  return { trips, tripCost };
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
