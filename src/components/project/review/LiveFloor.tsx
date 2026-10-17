import { RefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Group } from "three";
import { TILE } from "../layouts";
import { ROLES } from "../people";
import WorkerFigure from "../WorkerFigure";
import WorkstationModel, { Block, FORK_LOAD_AHEAD, ForkLoad } from "../WorkstationModel";
import { workstationType } from "../workstations";
import { FloorPath, ForkliftRoute } from "./floorPaths";
import { LivePlan, SHIFT_MINUTES } from "./liveSim";

// The shift clock, in minutes into the shift, and the seconds things have been moving
// on the floor. The floor advances both every frame; the page reads the clock to show
// the live numbers.
export type LiveControl = { time: number; moving: number };

// Shift minutes per real second.
const RATE = 0.5;
// Metres per second, and seconds a forklift takes to pick up or set down a pallet, or to turn.
const DRIVE_SPEED = 5;
const WALK_SPEED = 2.5;
const FORKLIFT_HANDLING = 1.2;
const FORKLIFT_TURN = 0.6;
const CARTON = "#e39b3d";
const MOVER = "#475569";
const FORKLIFT = workstationType("forklift");

type Vec = { x: number; z: number };
const lerp = (from: Vec, to: Vec, t: number) => ({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
const length = ({ from, to }: FloorPath) => distance(from, to);
// The model's forks point along its -x; this turn points them along the heading.
const facing = (heading: Vec) => Math.atan2(heading.z, -heading.x);
// The way from one point to another, or null when they are the same.
const towards = (from: Vec, to: Vec) => {
  const gap = distance(from, to);
  return gap < 0.01 ? null : { x: (to.x - from.x) / gap, z: (to.z - from.z) / gap };
};

function Clock({ control }: { control: RefObject<LiveControl> }) {
  useFrame((_, delta) => {
    const live = control.current;
    // A long frame (a hidden tab) must not skip ahead.
    const step = Math.min(delta, 0.1);
    live.time = (live.time + step * RATE) % SHIFT_MINUTES;
    live.moving += step;
  });
  return null;
}

// A forklift's route, dotted on the floor.
function RouteLine({ route }: { route: ForkliftRoute }) {
  if (distance(route.home, route.turn) + distance(route.turn, route.drop) < 0.1) return null;
  return (
    <Line
      points={[route.home, route.turn, route.drop].map(
        (point) => [point.x / TILE, 0.006, point.z / TILE] as [number, number, number],
      )}
      color={FORKLIFT.tone.fg}
      lineWidth={2}
      dashed
      dashSize={0.05}
      gapSize={0.05}
    />
  );
}

// A carton held above the head, in metres.
function HeldCarton() {
  return (
    <group scale={1 / TILE}>
      <Block size={[1.4, 1.1, 1.4]} position={[0, 6, 0]} color={CARTON} />
    </group>
  );
}

type Pose = { at: Vec; angle: number };
type Phase = { seconds: number; from: Pose; to: Pose };

// A forklift's round: loaded at home, along the lane, turn, forks first to the drop,
// set the pallet down, back out to the lane, turn back and reverse home.
function forkliftRound(route: ForkliftRoute) {
  const lane = towards(route.home, route.turn);
  const off = towards(route.turn, route.drop);
  const parked = facing(route.rotated ? { x: 0, z: 1 } : { x: -1, z: 0 });
  const laneAngle = lane ? facing(lane) : off ? facing(off) : parked;
  const offAngle = off ? facing(off) : laneAngle;
  const home = { at: route.home, angle: laneAngle };
  const turnLane = { at: route.turn, angle: laneAngle };
  const turnOff = { at: route.turn, angle: offAngle };
  const drop = { at: route.drop, angle: offAngle };
  const drive = (from: Pose, to: Pose) => ({ seconds: distance(from.at, to.at) / DRIVE_SPEED, from, to });
  const turning = lane && off ? FORKLIFT_TURN : 0;
  const phases: Phase[] = [
    { seconds: FORKLIFT_HANDLING, from: home, to: home },
    drive(home, turnLane),
    { seconds: turning, from: turnLane, to: turnOff },
    drive(turnOff, drop),
    { seconds: FORKLIFT_HANDLING, from: drop, to: drop },
    drive(drop, turnOff),
    { seconds: turning, from: turnOff, to: turnLane },
    drive(turnLane, home),
  ];
  const until = (count: number) => phases.slice(0, count).reduce((sum, phase) => sum + phase.seconds, 0);
  return {
    phases,
    moves: lane !== null || off !== null,
    cycle: until(phases.length),
    // The pallet goes on the forks halfway through loading and comes off halfway through setting down.
    loadedAt: FORKLIFT_HANDLING / 2,
    droppedAt: until(4) + FORKLIFT_HANDLING / 2,
    dropAngle: offAngle,
  };
}

function poseAt(phases: Phase[], t: number): Pose {
  for (const phase of phases) {
    if (t < phase.seconds) {
      const share = t / phase.seconds;
      // Turn the short way round.
      const turn = Math.atan2(Math.sin(phase.to.angle - phase.from.angle), Math.cos(phase.to.angle - phase.from.angle));
      return { at: lerp(phase.from.at, phase.to.at, share), angle: phase.from.angle + turn * share };
    }
    t -= phase.seconds;
  }
  return phases[phases.length - 1].to;
}

// A forklift bringing pallets from its spot on the lane to the people at a station.
// The pallet it sets down stays there until it sets off with the next one.
function MovingForklift({
  route,
  index,
  control,
}: {
  route: ForkliftRoute;
  index: number;
  control: RefObject<LiveControl>;
}) {
  const forklift = useRef<Group>(null);
  const carried = useRef<Group>(null);
  const dropped = useRef<Group>(null);
  const round = forkliftRound(route);

  useFrame(() => {
    if (!forklift.current || !carried.current || !dropped.current) return;
    // Forklifts start at different points of their round, so they don't move in step.
    const t = round.moves ? (control.current.moving + index * 3.1) % round.cycle : 0;
    const pose = poseAt(round.phases, t);
    forklift.current.position.set(pose.at.x / TILE, 0, pose.at.z / TILE);
    forklift.current.rotation.y = pose.angle;
    carried.current.visible = round.moves && t >= round.loadedAt && t < round.droppedAt;
    dropped.current.visible = round.moves && t >= round.droppedAt;
  });

  // The pallet rides on the forks ahead of the forklift's centre, and is set down there.
  const ahead = { x: -Math.cos(round.dropAngle) * FORK_LOAD_AHEAD, z: Math.sin(round.dropAngle) * FORK_LOAD_AHEAD };
  return (
    <>
      <group ref={forklift}>
        <group scale={1 / TILE}>
          <WorkstationModel type={FORKLIFT} />
          <group ref={carried} position={[-FORK_LOAD_AHEAD, 0, 0]}>
            <ForkLoad lifted />
          </group>
        </group>
      </group>
      <group
        ref={dropped}
        visible={false}
        position={[(route.drop.x + ahead.x) / TILE, 0, (route.drop.z + ahead.z) / TILE]}
        rotation-y={round.dropAngle}
      >
        <group scale={1 / TILE}>
          <ForkLoad />
        </group>
      </group>
    </>
  );
}

// One worker at a stop. While a pallet is handled there they walk their path back and
// forth, carrying a carton one way; when the stop is idle they head back and wait.
function Worker({
  path,
  index,
  stop,
  plan,
  color,
  control,
}: {
  path: FloorPath;
  index: number;
  stop: number;
  plan: LivePlan;
  color: string;
  control: RefObject<LiveControl>;
}) {
  const worker = useRef<Group>(null);
  const carton = useRef<Group>(null);
  // How far along the path the worker is (0–1), which way they walk, and the last moving time seen.
  const state = useRef({ along: (index * 0.37) % 1, forward: true, seen: control.current.moving });

  useFrame(() => {
    if (!worker.current || !carton.current) return;
    const own = state.current;
    const elapsed = control.current.moving - own.seen;
    own.seen = control.current.moving;
    const busy = plan
      .palletsAt(control.current.time)
      .some((item) => item.at === "step" && item.index === stop);
    const step = (elapsed * WALK_SPEED) / Math.max(length(path), 0.1);
    if (busy) {
      own.along += own.forward ? step : -step;
      if (own.along >= 1) [own.along, own.forward] = [1, false];
      if (own.along <= 0) [own.along, own.forward] = [0, true];
    } else {
      own.along = Math.max(0, own.along - step);
      own.forward = true;
    }
    const position = lerp(path.from, path.to, own.along);
    worker.current.position.set(position.x / TILE, 0, position.z / TILE);
    carton.current.visible = busy && own.forward;
  });

  return (
    <group ref={worker} position={[path.from.x / TILE, 0, path.from.z / TILE]}>
      <WorkerFigure x={0} z={0} color={color} />
      <group ref={carton} visible={false}>
        <HeldCarton />
      </group>
    </group>
  );
}

// Everything that moves on the review floor: forklifts bringing pallets from the lanes
// to the stations, and the crews working at each stop.
export default function LiveFloor({ plan, control }: { plan: LivePlan; control: RefObject<LiveControl> }) {
  return (
    <>
      <Clock control={control} />
      {plan.paths.forklifts.map((route, index) => (
        <group key={`forklift-${index}`}>
          <RouteLine route={route} />
          <MovingForklift route={route} index={index} control={control} />
        </group>
      ))}
      {plan.paths.crews.map((walks, stop) => {
        const color = ROLES.find((role) => role.zone === plan.stops[stop].station.zone)?.tone.fg ?? MOVER;
        return walks.map((path, index) => (
          <Worker
            key={`crew-${stop}-${index}`}
            path={path}
            index={index}
            stop={stop}
            plan={plan}
            color={color}
            control={control}
          />
        ));
      })}
    </>
  );
}
