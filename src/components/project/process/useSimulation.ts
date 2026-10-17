import { useEffect, useState } from "react";

export type Simulation = { time: number; playing: boolean; speed: number };

// Simulated minutes per real second at 1× speed.
const SIM_RATE = 1 / 6;

// The simulation clock: null while not simulating, otherwise advanced every frame while it plays.
export function useSimulation(duration: number) {
  const [sim, setSim] = useState<Simulation | null>(null);

  useEffect(() => {
    if (!sim?.playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - last) / 1000;
      last = now;
      setSim((current) => {
        if (!current) return current;
        const time = Math.min(current.time + elapsed * current.speed * SIM_RATE, duration);
        return { ...current, time, playing: time < duration };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sim?.playing, duration]);

  return {
    sim,
    start: () => setSim({ time: 0, playing: true, speed: 10 }),
    stop: () => setSim(null),
    setSpeed: (speed: number) => setSim((current) => current && { ...current, speed }),
    seek: (time: number) => setSim((current) => current && { ...current, time, playing: false }),
    // Playing again after the end starts over.
    toggle: () =>
      setSim(
        (current) =>
          current && { ...current, playing: !current.playing, time: current.time >= duration ? 0 : current.time },
      ),
  };
}
