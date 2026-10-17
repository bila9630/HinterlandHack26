import { Metrics } from "./metrics";

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

export type SimState = ReturnType<ReturnType<typeof simulation>["state"]>;
