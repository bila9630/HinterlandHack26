import { FacilityLayout } from "../layouts";
import { RoleId, ROLES, Staffing } from "../people";
import { processMetrics } from "../process/metrics";
import { ProcessStep, Station, layoutStations, newStep, suggestedRoute } from "../process/model";
import { PlacedWorkstation, autoPlace } from "../workstations";
import { floorPaths } from "./floorPaths";

export const SHIFT_MINUTES = 8 * 60;
// Pallets are released a little slower than the bottleneck takes them, so no queue builds up.
const BOTTLENECK_LOAD = 0.97;
const MAX_CREW = 6;

// Where one pallet is: handled at a step, or on the leg towards a step (fraction 0–1).
export type LivePallet = { id: number; at: "step" | "leg"; index: number; fraction: number };

// A stop on the route and how many people work there.
export type LiveStop = { station: Station; crew: number };

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
    return { station, crew: Math.min(Math.round(staffed / sharing), MAX_CREW) };
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

  return { placed, stops, paths: floorPaths(layout, placed, stops), palletsAt };
}

export type LivePlan = ReturnType<typeof livePlan>;
