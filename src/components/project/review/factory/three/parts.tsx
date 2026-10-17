import { ReactNode, RefObject, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, Line, useCursor } from "@react-three/drei";
import { DoubleSide, Group, InstancedMesh, Mesh, Object3D } from "three";
import { ClockContext } from "../clock";
import { PRIMARY, PRIMARY_DARK, WARNING } from "../colors";
import { Conveyor, FactoryLayout, Person, Station, UV, Vehicle, bobSeconds } from "../layout";
import { pythonRandom } from "../random";
import { SelectionContext } from "../selection";
import { BoxSpec, LAYER, boxGeometry, quadGeometry, worldScale } from "./geometry";
import { CONVEYOR_ITEM, forkliftBoxes, groundQuads, jackBoxes, staticBoxes } from "./models";
import { routePose, along } from "./motion";

export type Scale = ReturnType<typeof worldScale>;
export const ScaleContext = createContext<Scale>(worldScale({ C: 0.866, S: 0.42, ZS: 1.15, L: 70 }));
export const LabelsContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

// Things lying flat on the ground sit just above its painted lines.
const ON_GROUND = 11 * LAYER;
const SHADOW = "#0F1B33";
const noRaycast = () => null;

const useSim = () => useContext(ClockContext)!;

// Scales a DOM label with the camera's zoom, the way the mockup's labels scale with the
// drawing, within readable limits. `transform` places the label before it is scaled.
function useZoomScale(node: RefObject<HTMLElement | null>, base: number, transform: string) {
  const s = useContext(ScaleContext);
  useFrame(({ camera }) => {
    const zoom = Math.min(Math.max(camera.zoom / s.zoom, 0.6), 2.2);
    if (node.current) node.current.style.transform = `${transform} scale(${(zoom * base).toFixed(3)})`;
  });
}

// A merged box model as one mesh; the geometry is freed when it is no longer drawn.
function Boxes({ boxes, visible = true, meshRef }: { boxes: BoxSpec[]; visible?: boolean; meshRef?: RefObject<Mesh | null> }) {
  const scale = useContext(ScaleContext);
  const geometry = useMemo(() => boxGeometry(boxes, scale.z), [boxes, scale]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh ref={meshRef} geometry={geometry} visible={visible}>
      <meshBasicMaterial vertexColors side={DoubleSide} />
    </mesh>
  );
}

// A soft round shadow on the ground, `rx` by `rz` units.
function Shadow({ rx, rz = rx, opacity = 0.18, at = [0, 0] }: { rx: number; rz?: number; opacity?: number; at?: UV }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[at[0], ON_GROUND, at[1]]} scale={[rx, rz, 1]} raycast={noRaycast}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial color={SHADOW} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

// The ground, and everything that stands still, each in one draw call.
export function StaticScene({ layout }: { layout: FactoryLayout }) {
  const ground = useMemo(() => quadGeometry(groundQuads(layout)), [layout]);
  const boxes = useMemo(() => staticBoxes(layout), [layout]);
  useEffect(() => () => ground.dispose(), [ground]);
  return (
    <>
      <mesh geometry={ground} raycast={noRaycast}>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      <Boxes boxes={boxes} />
    </>
  );
}

// The factory scene's trees: belts beyond the roads, jittered like generate_scene.py with the
// same seed, and the ones near the hall.
export function factoryTrees(layout: FactoryLayout) {
  const { treeBelts: belts, trees: near } = layout.exterior;
  const random = pythonRandom(belts.seed);
  const all: { at: UV; scale: number }[] = [];
  for (let k = belts.from; k < belts.to; k++) {
    for (const line of belts.lines) {
      const along = k * belts.spacing + random.uniform(-belts.jitter, belts.jitter);
      const across = (line.u ?? line.v!) + random.uniform(-belts.jitter, belts.jitter);
      all.push({ at: line.u !== undefined ? [across, along] : [along, across], scale: random.uniform(belts.scale[0], belts.scale[1]) });
    }
  }
  near.at.forEach((at) => all.push({ at, scale: near.scale }));
  return all;
}

// Trees in four instanced meshes: trunks, crowns, highlights and shadows.
export function Trees({ trees }: { trees: { at: UV; scale: number }[] }) {
  const s = useContext(ScaleContext);
  const refs = [useRef<InstancedMesh>(null), useRef<InstancedMesh>(null), useRef<InstancedMesh>(null), useRef<InstancedMesh>(null)];

  useLayoutEffect(() => {
    const [trunks, crowns, highlights, shadows] = refs.map((ref) => ref.current!);
    const dummy = new Object3D();
    const place = (mesh: InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => {
      dummy.position.set(x, y, z);
      // Shadows lie flat; turning each instance (not the whole mesh) keeps them in place.
      dummy.rotation.set(mesh === shadows ? -Math.PI / 2 : 0, 0, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    };
    trees.forEach(({ at: [u, v], scale }, index) => {
      const r = 14 * scale;
      const trunk = 22 * scale * s.up;
      place(trunks, index, u, trunk / 2, v, 2.5 * s.across, trunk, 2.5 * s.across);
      place(crowns, index, u, (22 * scale + r - 4) * s.up, v, r * s.across);
      // The highlight sits up and to the left of the crown, towards the camera.
      const left = 0.35 * r * s.across * Math.SQRT1_2;
      const front = 0.55 * r * s.across * Math.SQRT1_2;
      place(highlights, index, u - left + front, (22 * scale + 1.3 * r - 4) * s.up, v + left + front, 0.5 * r * s.across);
      place(shadows, index, u, ON_GROUND, v, 12 * scale * s.across);
    });
    [trunks, crowns, highlights, shadows].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [trees, s]);

  return (
    <group raycast={noRaycast}>
      <instancedMesh ref={refs[0]} args={[undefined, undefined, trees.length]} raycast={noRaycast}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color="#9B7A57" />
      </instancedMesh>
      <instancedMesh ref={refs[1]} args={[undefined, undefined, trees.length]} raycast={noRaycast}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#5FB585" />
      </instancedMesh>
      <instancedMesh ref={refs[2]} args={[undefined, undefined, trees.length]} raycast={noRaycast}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#86CFA3" />
      </instancedMesh>
      <instancedMesh ref={refs[3]} args={[undefined, undefined, trees.length]} raycast={noRaycast}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color={SHADOW} transparent opacity={0.15} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// A worker in a vest and hard hat, standing on the origin and bobbing every `bob` seconds.
function WorkerModel({ vest = "#FFB020", bob }: { vest?: string; bob?: number | null }) {
  const s = useContext(ScaleContext);
  const sim = useSim();
  const body = useRef<Group>(null);
  useFrame(() => {
    if (!bob || !body.current) return;
    const phase = (sim.time % bob) / bob;
    body.current.position.y = 3 * s.up * (1 - Math.abs(2 * phase - 1));
  });
  const [legs, chest, head] = [4.5 * s.across, 6 * s.across, 5 * s.across];
  return (
    <group>
      <Shadow rx={8 * s.across} />
      <group ref={body}>
        <mesh position-y={8.5 * s.up}>
          <capsuleGeometry args={[legs, 13 * s.up - 2 * legs, 4, 12]} />
          <meshBasicMaterial color="#2C364B" />
        </mesh>
        <mesh position-y={20.5 * s.up}>
          <capsuleGeometry args={[chest, 15 * s.up - 2 * chest, 4, 12]} />
          <meshBasicMaterial color={vest} />
        </mesh>
        <mesh position-y={33 * s.up}>
          <sphereGeometry args={[head, 16, 12]} />
          <meshBasicMaterial color="#F2C9A0" />
        </mesh>
        <mesh position-y={35 * s.up}>
          <sphereGeometry args={[head * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#FFD45C" />
        </mesh>
      </group>
    </group>
  );
}

// Clicking picks it; hovering shows a pointer and lifts it a little.
function Pickable({ id, onSelect, children }: { id: string; onSelect?: (id: string) => void; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return (
    <group
      scale={hovered ? 1.08 : 1}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        // A drag that ends here was the camera turning, not a pick.
        if (event.delta > 4) return;
        event.stopPropagation();
        onSelect?.(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  );
}

// A pulsing ring on the ground around whatever is selected.
function SelectionRing({ radius }: { radius: number }) {
  const pulse = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = (clock.elapsedTime % 1.4) / 1.4;
    pulse.current.scale.setScalar(1 + t * 0.8);
    (pulse.current.material as { opacity: number }).opacity = 0.8 * (1 - t);
  });
  return (
    <group position-y={ON_GROUND + LAYER} raycast={noRaycast}>
      <mesh rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <circleGeometry args={[radius, 40]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[radius - 0.025, radius, 40]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[radius - 0.025, radius, 40]} />
        <meshBasicMaterial color={PRIMARY} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

// A dark name tag floating at `y` above its parent.
function NameTag({ y, name, detail }: { y: number; name: string; detail?: string }) {
  const labels = useContext(LabelsContext);
  const tag = useRef<HTMLDivElement>(null);
  useZoomScale(tag, 1, "translate(-50%, -100%)");
  return (
    <Html portal={labels as RefObject<HTMLElement>} position={[0, y, 0]} zIndexRange={[20, 10]}>
      <div ref={tag} className="pointer-events-none origin-bottom" style={{ transform: "translate(-50%, -100%)" }}>
        <div
          className="flex items-baseline gap-1.5 rounded-lg px-2.5 py-1 whitespace-nowrap shadow-md"
          style={{ backgroundColor: PRIMARY_DARK }}
        >
          <span className="text-[12px] font-extrabold text-white">{name}</span>
          {detail && <span className="text-[11px] font-semibold text-[#C9D8FF]">{detail}</span>}
        </div>
        <div
          className="mx-auto h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent"
          style={{ borderTopColor: PRIMARY_DARK }}
        />
      </div>
    </Html>
  );
}

export function PersonItem({ person, onSelect }: { person: Person; onSelect?: (id: string) => void }) {
  const s = useContext(ScaleContext);
  const selected = useContext(SelectionContext) === person.id;
  return (
    <group position={[person.at[0], 0, person.at[1]]}>
      {selected && <SelectionRing radius={0.17} />}
      <Pickable id={person.id} onSelect={onSelect}>
        <WorkerModel vest={person.vest} bob={bobSeconds(person.anim)} />
      </Pickable>
      {selected && <NameTag y={46 * s.up} name={person.name} detail={person.role} />}
    </group>
  );
}

// A forklift or pallet jack driving its route: it turns towards where it is going, stands at
// each stop, and drops or picks up its load there.
export function VehicleItem({ vehicle, onSelect }: { vehicle: Vehicle; onSelect?: (id: string) => void }) {
  const s = useContext(ScaleContext);
  const sim = useSim();
  const selected = useContext(SelectionContext) === vehicle.id;
  const forklift = vehicle.type === "forklift";
  const [full, empty] = useMemo(
    () => (forklift ? [forkliftBoxes(true), forkliftBoxes(false)] : [jackBoxes(true), jackBoxes(false)]),
    [forklift],
  );
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const fullMesh = useRef<Mesh>(null);
  const emptyMesh = useRef<Mesh>(null);
  const heading = useRef<number | null>(null);

  useFrame((_, delta) => {
    const pose = routePose(vehicle.route, vehicle.loopSec, sim.time, vehicle.dwellSec);
    group.current?.position.set(pose.at[0], 0, pose.at[1]);
    // Forklifts lead with their forks; the pallet jack's worker walks in front, pulling it.
    const target = Math.atan2(-pose.heading[1], pose.heading[0]) + (forklift ? 0 : Math.PI);
    if (heading.current === null) heading.current = target;
    const turn = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
    heading.current += turn * (1 - Math.exp(-Math.min(delta, 0.1) * 9));
    if (body.current) body.current.rotation.y = heading.current;
    const carries = vehicle.loaded !== false && pose.loaded;
    if (fullMesh.current) fullMesh.current.visible = carries;
    if (emptyMesh.current) emptyMesh.current.visible = !carries;
  });

  return (
    <>
      {vehicle.showRoute && (
        <Line
          points={vehicle.route.map(([u, v]) => [u, ON_GROUND, v] as [number, number, number])}
          color={PRIMARY}
          lineWidth={2}
          dashed
          dashSize={0.05}
          gapSize={0.1}
          transparent
          opacity={0.45}
          raycast={noRaycast}
        />
      )}
      <group ref={group}>
        {selected && <SelectionRing radius={0.42} />}
        <Pickable id={vehicle.id} onSelect={onSelect}>
          <group ref={body}>
            <Shadow rx={0.3} rz={0.24} opacity={forklift ? 0.18 : 0.15} />
            <Boxes boxes={full} meshRef={fullMesh} />
            <Boxes boxes={empty} meshRef={emptyMesh} visible={false} />
            {!forklift && (
              <group position-x={-0.45}>
                <WorkerModel />
              </group>
            )}
          </group>
        </Pickable>
        {selected && <NameTag y={forklift ? 56 * s.z : 46 * s.up} name={vehicle.id} detail={vehicle.task} />}
      </group>
    </>
  );
}

// Boxes riding the belt, evenly spaced over its loop.
export function ConveyorItems({ conveyor }: { conveyor: Conveyor }) {
  const s = useContext(ScaleContext);
  const sim = useSim();
  const items = useRef<(Group | null)[]>([]);
  useFrame(() => {
    items.current.forEach((item, index) => {
      if (!item) return;
      const [u, v] = along(conveyor.beltPath, (sim.time + (index * conveyor.loopSec) / conveyor.items) / conveyor.loopSec);
      item.position.set(u, conveyor.beltZ * s.z, v);
    });
  });
  return (
    <>
      {Array.from({ length: conveyor.items }, (_, index) => (
        <group key={index} ref={(node) => void (items.current[index] = node)}>
          <Boxes boxes={CONVEYOR_ITEM} />
        </group>
      ))}
    </>
  );
}

// A station's pill label with its number, orange when the station needs attention. It grows
// and shrinks with the camera's zoom, the way the mockup's labels do, within readable limits.
export function StationLabel({ station, scale }: { station: Station; scale: number }) {
  const s = useContext(ScaleContext);
  const labels = useContext(LabelsContext);
  const pill = useRef<HTMLDivElement>(null);
  useZoomScale(pill, scale, "translate(-50%, calc(-100% - 2px))");
  const [u, v, z] = station.anchor;
  const color = station.warning ? WARNING : PRIMARY;
  return (
    <Html portal={labels as RefObject<HTMLElement>} position={[u, z * s.z, v]} zIndexRange={[9, 0]}>
      <div
        ref={pill}
        className="pointer-events-none flex h-6 origin-bottom items-center gap-1.5 rounded-full border-[1.5px] bg-white pr-3 pl-1 whitespace-nowrap"
        style={{ borderColor: color, transform: `translate(-50%, calc(-100% - 2px)) scale(${scale})` }}
      >
        <span
          className="flex h-[17px] w-[17px] items-center justify-center rounded-full text-[10px] font-extrabold text-white"
          style={{ backgroundColor: color }}
        >
          {station.n}
        </span>
        <span className="text-[11.5px] font-bold text-[#0F1B33]">{station.label}</span>
      </div>
    </Html>
  );
}
