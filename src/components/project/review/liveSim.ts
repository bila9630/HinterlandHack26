import { FacilityLayout, ZoneKind } from "../layouts";
import { ROLES, Staffing } from "../people";
import { processMetrics } from "../process/metrics";
import { ProcessStep, Station, layoutStations, newStep, suggestedRoute } from "../process/model";
import { PlacedWorkstation, autoPlace, isStop } from "../workstations";
import { forkliftPaths } from "./floorPaths";

// Pallets are released a little slower than the bottleneck takes them, so no queue builds up.
export const BOTTLENECK_LOAD = 0.97;
const MAX_CREW = 6;

// A stop on the route: the step done there, how many people work there, and how busy it is (0–1).
export type LiveStop = { station: Station; step: ProcessStep; crew: number; utilisation: number };

// The process the simulation runs: the user's own when one is complete, otherwise the
// suggested route with every station's usual task. Without placed workstations the floor is auto-planned.
export function livePlan(
  layout: FacilityLayout,
  workstations: PlacedWorkstation[],
  processes: ProcessStep[][],
  staffing: Staffing,
) {
  const placed = workstations.some((item) => isStop(item.typeId)) ? workstations : autoPlace(layout, workstations);
  const stations = layoutStations(layout, placed);
  const own = processes.find(
    (steps) => steps.length >= 2 && steps.every((step) => stations.some((station) => station.id === step.stationId)),
  );
  const route = own ? own.map((step) => stations.find((station) => station.id === step.stationId)!) : suggestedRoute(stations);
  const steps = own ?? route.map((station, index) => newStep(station, route[index - 1], true));
  const forklifts = placed.filter((item) => item.typeId === "forklift").length;
  const metrics = processMetrics(steps, route, forklifts);

  // The People step staffs each zone. Its people go to the zone's stops in route order, as
  // many as each step needs, and any left over are shared out among those stops.
  const left = new Map<ZoneKind, number>(ROLES.map((role) => [role.zone, staffing.counts[role.id]]));
  const crews = route.map((station, index) => {
    const staffed = left.get(station.zone);
    if (staffed === undefined) return steps[index].operators;
    const crew = Math.min(steps[index].operators, staffed);
    left.set(station.zone, staffed - crew);
    return crew;
  });
  for (const [zone, count] of left) {
    const inZone = route.flatMap((station, index) => (station.zone === zone ? [index] : []));
    for (let k = 0; k < count && inZone.length > 0; k++) crews[inZone[k % inZone.length]]++;
  }

  const slowest = Math.max(...metrics.times, 0.1);
  const stops: LiveStop[] = route.map((station, index) => ({
    station,
    step: steps[index],
    crew: Math.min(crews[index], MAX_CREW),
    utilisation: (metrics.times[index] / slowest) * BOTTLENECK_LOAD,
  }));

  return { placed, stops, forklifts: forkliftPaths(layout, placed, route), metrics, staffing };
}

export type LivePlan = ReturnType<typeof livePlan>;
