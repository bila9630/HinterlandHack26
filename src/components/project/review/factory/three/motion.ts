import { UV } from "../layout";

// Seconds a vehicle stands still where its route repeats a point, unless the layout says otherwise.
export const DWELL_SEC = 1.6;

export type Pose = {
  at: UV;
  // Where it is heading: the leg it is on, or while it stands still, the leg it will drive next.
  heading: UV;
  // Whether it carries its load. It drops the load halfway through each stop and picks a new
  // one up halfway through the next, starting loaded.
  loaded: boolean;
};

type Leg = { from: UV; to: UV; length: number; stop: boolean };

// A route as legs, closed back to its start. Repeated points become stops, and so does the
// start when the route ends where it began.
function legsOf(route: UV[]) {
  const points = [...route];
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) points.push(first);
  const legs: Leg[] = points.slice(1).map((to, index) => {
    const from = points[index];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    return { from, to, length, stop: length < 1e-6 };
  });
  return legs;
}

// Where a vehicle on `route` is at `time`: it drives the legs at constant speed and stands
// `dwell` seconds at each stop, going round once every `loopSec` seconds.
export function routePose(route: UV[], loopSec: number, time: number, dwell = DWELL_SEC): Pose {
  const legs = legsOf(route);
  const stops = legs.filter((leg) => leg.stop).length;
  const distance = legs.reduce((sum, leg) => sum + leg.length, 0);
  const stopTime = Math.min(dwell, (loopSec * 0.5) / Math.max(stops, 1));
  const speed = distance / (loopSec - stops * stopTime);
  const duration = (leg: Leg) => (leg.stop ? stopTime : leg.length / speed);
  const nextMove = (index: number) => {
    for (let k = 1; k <= legs.length; k++) {
      const leg = legs[(index + k) % legs.length];
      if (!leg.stop) return leg;
    }
    return legs[index];
  };
  const direction = (leg: Leg): UV =>
    leg.length > 0 ? [(leg.to[0] - leg.from[0]) / leg.length, (leg.to[1] - leg.from[1]) / leg.length] : [1, 0];

  let left = ((time % loopSec) + loopSec) % loopSec;
  let stopsDone = 0;
  for (let index = 0; index < legs.length; index++) {
    const leg = legs[index];
    const spent = duration(leg);
    if (left <= spent || index === legs.length - 1) {
      const t = spent > 0 ? Math.min(left / spent, 1) : 0;
      if (leg.stop) {
        const changes = stopsDone + (t >= 0.5 ? 1 : 0);
        return { at: leg.from, heading: direction(nextMove(index)), loaded: changes % 2 === 0 };
      }
      return {
        at: [leg.from[0] + (leg.to[0] - leg.from[0]) * t, leg.from[1] + (leg.to[1] - leg.from[1]) * t],
        heading: direction(leg),
        loaded: stopsDone % 2 === 0,
      };
    }
    left -= spent;
    if (leg.stop) stopsDone++;
  }
  return { at: route[0], heading: [1, 0], loaded: true };
}

// A point `fraction` of the way along a polyline at constant speed.
export function along(points: UV[], fraction: number): UV {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = (((fraction % 1) + 1) % 1) * total;
  for (let index = 0; index < lengths.length; index++) {
    if (left <= lengths[index] && lengths[index] > 0) {
      const t = left / lengths[index];
      const [from, to] = [points[index], points[index + 1]];
      return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    }
    left -= lengths[index];
  }
  return points[points.length - 1];
}
