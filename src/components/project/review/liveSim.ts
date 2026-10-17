import { FacilityLayout, layoutDocks } from "../layouts";
import { RoleId, ROLES, Staffing } from "../people";
import { processMetrics } from "../process/metrics";
import { ProcessStep, Station, layoutStations, newStep, suggestedRoute } from "../process/model";
import { PlacedWorkstation, autoPlace } from "../workstations";

export const SHIFT_MINUTES = 8 * 60;
export const CARTONS = 4;
// Pallets are released a little slower than the bottleneck takes them, so no queue builds up.
const BOTTLENECK_LOAD = 0.97;
const MAX_CREW = 6;

// Where one pallet is: handled at a step, or on the leg towards a step (fraction 0–1).
export type LivePallet = { id: number; at: "step" | "leg"; index: number; fraction: number };

type Vec = { x: number; z: number };

// A stop on the route as the live floor draws it, in metres: where the pallet waits,
// which way the station runs, which way is away from it, and how many people work there.
export type LiveStop = {
  station: Station;
  stop: Vec;
  along: Vec;
  outward: Vec;
  crew: number;
  // The dock door goods are carried from or to, for the dock stops.
  door: Vec | null;
};

function unit(x: number, z: number): Vec {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

// Workstations stand in the way of their own centre, so the pallet waits beside the long side.
function liveStop(station: Station, layout: FacilityLayout): Omit<LiveStop, "crew"> {
  if (station.kind === "inbound-dock" || station.kind === "outbound-dock") {
    const dock = layoutDocks(layout).find((item) => `${item.kind}-dock` === station.kind);
    const door = dock?.doors.reduce((best, item) =>
      Math.hypot(item.x - station.x, item.z - station.z) < Math.hypot(best.x - station.x, best.z - station.z)
        ? item
        : best,
    );
    const outward = door ? unit(station.x - door.x, station.z - door.z) : { x: 0, z: 1 };
    return {
      station,
      stop: { x: station.x, z: station.z },
      along: { x: -outward.z, z: outward.x },
      outward,
      door: door ? { x: door.x + outward.x * 1.5, z: door.z + outward.z * 1.5 } : null,
    };
  }
  const { box } = station;
  const wide = box.maxX - box.minX >= box.maxZ - box.minZ;
  return wide
    ? { station, stop: { x: station.x, z: box.maxZ + 2.5 }, along: { x: 1, z: 0 }, outward: { x: 0, z: 1 }, door: null }
    : { station, stop: { x: box.maxX + 2.5, z: station.z }, along: { x: 0, z: 1 }, outward: { x: 1, z: 0 }, door: null };
}

// The process the simulation runs: the user's own when one is complete, otherwise the
// suggested route with every station's usual task. Without placed workstations the floor is auto-planned.
export function livePlan(
  layout: FacilityLayout,
  workstations: PlacedWorkstation[],
  processes: ProcessStep[][],
  staffing: Staffing,
) {
  const placed = workstations.some((item) => item.typeId !== "forklift") ? workstations : autoPlace(layout, workstations);
  const stations = layoutStations(layout, placed);
  const own = processes.find(
    (steps) => steps.length >= 2 && steps.every((step) => stations.some((station) => station.id === step.stationId)),
  );
  const route = own ? own.map((step) => stations.find((station) => station.id === step.stationId)!) : suggestedRoute(stations);
  const steps = own ?? route.map((station, index) => newStep(station, route[index - 1], true));
  const forklifts = placed.filter((item) => item.typeId === "forklift").length;
  const metrics = processMetrics(steps, route, forklifts);

  // The People step staffs each zone; stops in the same zone share its people.
  const stops: LiveStop[] = route.map((station) => {
    const role = ROLES.find((item) => item.zone === station.zone);
    const sharing = route.filter((item) => item.zone === station.zone).length;
    const staffed = role ? staffing.counts[role.id as RoleId] : steps[route.indexOf(station)].operators;
    return { ...liveStop(station, layout), crew: Math.min(Math.round(staffed / sharing), MAX_CREW) };
  });

  const interval = Math.max(...metrics.times, 0.1) / BOTTLENECK_LOAD;
  const segments = metrics.times.flatMap((minutes, index) => {
    const leg = metrics.legs[index];
    return [
      ...(leg ? [{ at: "leg" as const, index, minutes: leg.minutes }] : []),
      { at: "step" as const, index, minutes },
    ];
  });
  const cycle = segments.reduce((sum, segment) => sum + segment.minutes, 0);

  function palletsAt(time: number): LivePallet[] {
    const latest = Math.floor(time / interval);
    const pallets: LivePallet[] = [];
    for (let id = Math.max(0, latest - Math.ceil(cycle / interval)); id <= latest; id++) {
      let local = time - id * interval;
      if (local < 0 || local >= cycle) continue;
      for (const segment of segments) {
        if (local < segment.minutes) {
          pallets.push({ id, at: segment.at, index: segment.index, fraction: local / segment.minutes });
          break;
        }
        local -= segment.minutes;
      }
    }
    return pallets;
  }

  return {
    placed,
    stops,
    steps,
    metrics,
    interval,
    cycle,
    palletsAt,
    // Pallets that have left the hall by this time, and how many fit into one shift.
    done: (time: number) => Math.max(0, Math.floor((time - cycle) / interval) + 1),
    target: Math.max(0, Math.floor((SHIFT_MINUTES - cycle) / interval) + 1),
    throughput: 60 / interval,
    utilisation: metrics.times.map((minutes) => minutes / interval),
    // How many pallets can be on the floor at once, which is how many the floor draws.
    slots: Math.ceil(cycle / interval) + 1,
  };
}

export type LivePlan = ReturnType<typeof livePlan>;

// Pallets travel along the lanes: along x first, then along z. Returns the point and heading.
export function legPoint(from: Vec, to: Vec, fraction: number) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const total = Math.abs(dx) + Math.abs(dz) || 1;
  const travelled = fraction * total;
  if (travelled <= Math.abs(dx)) {
    return { x: from.x + Math.sign(dx) * travelled, z: from.z, dx: Math.sign(dx) || 1, dz: 0 };
  }
  return { x: to.x, z: from.z + Math.sign(dz) * (travelled - Math.abs(dx)), dx: 0, dz: Math.sign(dz) || 1 };
}

export const shiftClock = (minutes: number) => {
  const whole = Math.floor(minutes);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
};
