import { ProcessStep, Station, TRANSPORTS, Transport, travelDistance } from "./model";

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

export const round1 = (value: number) => Math.round(value * 10) / 10;

export const minutesLabel = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} min`;
