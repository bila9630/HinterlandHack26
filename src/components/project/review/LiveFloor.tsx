import { RefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { TILE } from "../layouts";
import { ROLES } from "../people";
import WorkerFigure from "../WorkerFigure";
import WorkstationModel, { Block } from "../WorkstationModel";
import { workstationType } from "../workstations";
import { CARTONS, LivePlan, SHIFT_MINUTES, legPoint } from "./liveSim";

// The simulation clock, in minutes into the shift. The floor advances it every frame;
// the page reads it to show the live numbers.
export type LiveControl = { time: number; playing: boolean; speed: number };

// Simulated minutes per real second at 1× speed.
const RATE = 0.5;
// Pallets and cartons are drawn larger than life, like the workers.
const PALLET_SCALE = 3.5;
const CARTON = "#e39b3d";
const MOVER = "#475569";
const FORKLIFT = workstationType("forklift");
// Where the cartons sit on a pallet, in pallet metres; one per carton.
const CARTON_SPOTS: [number, number][] = [
  [-0.3, -0.3],
  [0.3, -0.3],
  [-0.3, 0.3],
  [0.3, 0.3],
];

type Vec = { x: number; z: number };
const lerp = (from: Vec, to: Vec, t: number) => ({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });

function Clock({ control }: { control: RefObject<LiveControl> }) {
  useFrame((_, delta) => {
    const live = control.current;
    if (!live.playing) return;
    // A long frame (a hidden tab) must not skip ahead.
    live.time = (live.time + Math.min(delta, 0.1) * RATE * live.speed) % SHIFT_MINUTES;
  });
  return null;
}

// A carton held above the head, in metres.
function HeldCarton() {
  return (
    <group scale={1 / TILE}>
      <Block size={[1.4, 1.1, 1.4]} position={[0, 6, 0]} color={CARTON} />
    </group>
  );
}

// One place on the floor a pallet can be drawn at; pallet n uses place n modulo the number of places.
function MovingPallet({ plan, slot, control }: { plan: LivePlan; slot: number; control: RefObject<LiveControl> }) {
  const root = useRef<Group>(null);
  const pallet = useRef<Group>(null);
  const forklift = useRef<Group>(null);
  const walker = useRef<Group>(null);
  const cartons = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const item = plan.palletsAt(control.current.time).find((candidate) => candidate.id % plan.slots === slot);
    if (!root.current || !pallet.current || !forklift.current || !walker.current) return;
    root.current.visible = Boolean(item);
    if (!item) return;

    const stop = plan.stops[item.index];
    let position: Vec = stop.stop;
    let heading: Vec = stop.along;
    let carrier: "none" | "forklift" | "walker" = "none";
    if (item.at === "leg") {
      const point = legPoint(plan.stops[item.index - 1].stop, stop.stop, item.fraction);
      position = point;
      heading = { x: point.dx, z: point.dz };
      const transport = plan.steps[item.index].transport;
      carrier = transport === "forklift" ? "forklift" : transport === "conveyor" ? "none" : "walker";
    }

    // Cartons come off the truck one by one at the inbound dock and go back on at the outbound dock.
    const unloading = item.at === "step" && stop.station.kind === "inbound-dock";
    const loading = item.at === "step" && stop.station.kind === "outbound-dock";
    const shown = unloading
      ? Math.floor(item.fraction * CARTONS)
      : loading
        ? CARTONS - Math.floor(item.fraction * CARTONS)
        : CARTONS;
    cartons.current.forEach((carton, index) => carton && (carton.visible = index < shown));

    const lifted = carrier === "forklift" ? 0.08 : 0;
    pallet.current.position.set(position.x / TILE, lifted, position.z / TILE);
    pallet.current.rotation.y = Math.atan2(heading.z, -heading.x);

    // The forks point along -x of the forklift model, so it drives with that side first.
    forklift.current.visible = carrier === "forklift";
    forklift.current.position.set((position.x - heading.x * 4) / TILE, 0, (position.z - heading.z * 4) / TILE);
    forklift.current.rotation.y = Math.atan2(heading.z, -heading.x);

    walker.current.visible = carrier === "walker";
    walker.current.position.set((position.x - heading.x * 4) / TILE, 0, (position.z - heading.z * 4) / TILE);
  });

  return (
    <group ref={root} visible={false}>
      <group ref={pallet}>
        <group scale={PALLET_SCALE / TILE}>
          <Block size={[1.2, 0.15, 1.2]} position={[0, 0.075, 0]} color="#c49a63" />
          {CARTON_SPOTS.map(([x, z], index) => (
            <group key={index} ref={(node) => void (cartons.current[index] = node)}>
              <Block size={[0.55, 0.45, 0.55]} position={[x, 0.375, z]} color={CARTON} />
            </group>
          ))}
        </group>
      </group>
      <group ref={forklift}>
        <group scale={1 / TILE}>
          <WorkstationModel type={FORKLIFT} />
        </group>
      </group>
      <group ref={walker}>
        <WorkerFigure x={0} z={0} color={MOVER} />
      </group>
    </group>
  );
}

// The people at one stop. They stand by while it is idle; while a pallet is handled they
// walk to it and back, and at the docks one of them carries cartons between door and pallet.
function Crew({ plan, index, control }: { plan: LivePlan; index: number; control: RefObject<LiveControl> }) {
  const stop = plan.stops[index];
  const color = ROLES.find((role) => role.zone === stop.station.zone)?.tone.fg ?? MOVER;
  const workers = useRef<(Group | null)[]>([]);
  const held = useRef<(Group | null)[]>([]);
  const homes = Array.from({ length: stop.crew }, (_, i) => {
    const offset = (i - (stop.crew - 1) / 2) * 3.5;
    return {
      x: stop.stop.x + stop.outward.x * 4 + stop.along.x * offset,
      z: stop.stop.z + stop.outward.z * 4 + stop.along.z * offset,
    };
  });

  useFrame(({ clock }) => {
    const busy = plan.palletsAt(control.current.time).find((item) => item.at === "step" && item.index === index);
    homes.forEach((home, i) => {
      const worker = workers.current[i];
      const carton = held.current[i];
      if (!worker || !carton) return;
      let position = home;
      let carrying = false;
      if (busy && stop.door && i === 0) {
        // One trip per carton: out to the door and back, carrying on the way the goods go.
        const phase = (busy.fraction * CARTONS) % 1;
        const outbound = stop.station.kind === "outbound-dock";
        position = phase < 0.5 ? lerp(stop.stop, stop.door, phase * 2) : lerp(stop.door, stop.stop, (phase - 0.5) * 2);
        carrying = outbound ? phase < 0.5 : phase >= 0.5;
      } else if (busy) {
        const wave = clock.elapsedTime * 2.4 + i * 1.7;
        position = lerp(home, stop.stop, ((1 - Math.cos(wave)) / 2) * 0.75);
        carrying = Math.sin(wave) > 0;
      }
      worker.position.set(position.x / TILE, 0, position.z / TILE);
      carton.visible = carrying;
    });
  });

  return (
    <>
      {homes.map((home, i) => (
        <group key={i} ref={(node) => void (workers.current[i] = node)} position={[home.x / TILE, 0, home.z / TILE]}>
          <WorkerFigure x={0} z={0} color={color} />
          <group ref={(node) => void (held.current[i] = node)} visible={false}>
            <HeldCarton />
          </group>
        </group>
      ))}
    </>
  );
}

// Everything that moves on the review floor: pallets on their way through the process,
// the forklifts and people carrying them, and the crews at each stop.
export default function LiveFloor({ plan, control }: { plan: LivePlan; control: RefObject<LiveControl> }) {
  return (
    <>
      <Clock control={control} />
      {plan.stops.map((_, index) => (
        <Crew key={index} plan={plan} index={index} control={control} />
      ))}
      {Array.from({ length: plan.slots }, (_, slot) => (
        <MovingPallet key={slot} plan={plan} slot={slot} control={control} />
      ))}
    </>
  );
}
