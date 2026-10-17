import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";

type Listener = (time: number) => void;

// The one simulation clock every moving thing in the scene reads, in seconds. Pause and
// speed only change how fast `time` advances; the drawing follows on the next frame.
export class SimClock {
  time = 0;
  speed = 1;
  paused = false;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.time);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Advances by a real-time step and redraws.
  tick(seconds: number) {
    if (!this.paused) this.time += seconds * this.speed;
    this.listeners.forEach((listener) => listener(this.time));
  }

  seek(time: number) {
    this.time = time;
    this.listeners.forEach((listener) => listener(this.time));
  }
}

// Drives a clock from requestAnimationFrame while mounted.
export function useAnimationFrames(clock: SimClock) {
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // A long frame (a hidden tab) must not skip ahead.
      clock.tick(Math.min((now - last) / 1000, 0.1));
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [clock]);
}

export const ClockContext = createContext<SimClock | null>(null);

// Calls `onTime` on every clock tick without re-rendering; use it to move SVG nodes directly.
export function useClockTime(onTime: Listener) {
  const clock = useContext(ClockContext);
  const latest = useRef(onTime);
  useLayoutEffect(() => {
    latest.current = onTime;
  });
  useLayoutEffect(() => clock?.subscribe((time) => latest.current(time)), [clock]);
}
