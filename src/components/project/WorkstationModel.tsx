import { createContext, useContext, useEffect, useMemo } from "react";
import { Color, DoubleSide } from "three";
import { DOCK_DEPTH, DOCK_WIDTH, TILE } from "./layouts";
import { CONVEYOR_DEPTH, RACK_LEVELS, WorkstationType } from "./workstations";
import { BOX, PALLET } from "./review/factory/colors";
import { CAMERA, Triple } from "./review/factory/iso";
import { BoxSpec, boxGeometry, worldScale } from "./review/factory/three/geometry";
import { CONVEYOR_ITEM, forkliftBoxes, objectBoxes } from "./review/factory/three/models";

// Ghost models are see-through and ignore the pointer, so the floor below keeps receiving it.
const GhostContext = createContext(false);
const noRaycast = () => null;

type Vec3 = [number, number, number];

// Flat-shaded box: lighter top, darker +x side, base colour on the +z side.
export function Block({ size, position, color }: { size: Vec3; position: Vec3; color: string }) {
  const ghost = useContext(GhostContext);
  const shades = useMemo(() => {
    const base = new Color(color);
    return {
      top: base.clone().lerp(new Color("#ffffff"), 0.3).getStyle(),
      left: base.getStyle(),
      right: base.clone().lerp(new Color("#000000"), 0.18).getStyle(),
    };
  }, [color]);
  const material = { transparent: ghost, opacity: ghost ? 0.8 : 1 };

  return (
    <mesh position={position} raycast={ghost ? noRaycast : undefined}>
      <boxGeometry args={size} />
      <meshBasicMaterial attach="material-0" color={shades.right} {...material} />
      <meshBasicMaterial attach="material-1" color={shades.right} {...material} />
      <meshBasicMaterial attach="material-2" color={shades.top} {...material} />
      <meshBasicMaterial attach="material-3" color={shades.right} {...material} />
      <meshBasicMaterial attach="material-4" color={shades.left} {...material} />
      <meshBasicMaterial attach="material-5" color={shades.left} {...material} />
    </mesh>
  );
}

// The workstations are the factory scene's box models: footprints in floor cells and
// heights in the mockup's px, drawn here in metres.
const PX = worldScale(CAMERA).z * TILE;
const BELT_ITEMS = 5;
const LINE_MARKING: Triple = ["#F2B53A", "#F2B53A", "#F2B53A"];
// The forklift model has its forks towards -x and is shifted so its footprint is centred.
const FORKLIFT_SHIFT = 0.155;
// Where the pallet sits on the forks, in metres ahead of the forklift's centre.
export const FORK_LOAD_AHEAD = (0.39 - FORKLIFT_SHIFT) * TILE;

const moved = (boxes: BoxSpec[], du: number, dv: number, dz = 0): BoxSpec[] =>
  boxes.map(({ at: [u, v, W, D], z = 0, ...rest }) => ({ ...rest, at: [u + du, v + dv, W, D], z: z + dz }));

// The model of a workstation in floor cells, around its footprint centre: length along u
// (x), depth along v (z), and the side where the work happens towards +v.
function modelBoxes(type: WorkstationType): BoxSpec[] {
  const [L, D] = [type.length / TILE, type.depth / TILE];
  switch (type.id) {
    case "pallet-rack":
      return objectBoxes({
        type: "rack",
        origin: [-L / 2, -D / 2],
        size: [L, D],
        levels: Array.from({ length: RACK_LEVELS }, (_, level) => level * 32),
        height: RACK_LEVELS * 32,
        uprights: [0, L / 2 - 0.02, L - 0.06],
      });
    case "assembly-line": {
      // The conveyor along the back with goods on the belt, and the operators' area in
      // front of it marked out on the floor.
      const belt = CONVEYOR_DEPTH / TILE;
      const height = 24;
      const conveyor = objectBoxes({
        type: "conveyor",
        box: [-L / 2, -D / 2, L, belt],
        height,
        beltPath: [],
        beltZ: height,
        items: BELT_ITEMS,
        loopSec: 10,
      });
      const items = Array.from({ length: BELT_ITEMS }, (_, index) =>
        moved(CONVEYOR_ITEM, -L / 2 + 0.1 + ((index + 0.5) * (L - 0.2)) / BELT_ITEMS, -D / 2 + belt / 2, height),
      ).flat();
      const [front, line] = [D / 2 - 0.03, 0.03];
      const marking: BoxSpec[] = [
        { at: [-L / 2, front, L, line], h: 0.5, c: LINE_MARKING },
        { at: [-L / 2, -D / 2 + belt, line, D - belt], h: 0.5, c: LINE_MARKING },
        { at: [L / 2 - line, -D / 2 + belt, line, D - belt], h: 0.5, c: LINE_MARKING },
      ];
      return [...conveyor, ...items, ...marking];
    }
    case "packing-table":
      return objectBoxes({ type: "table", box: [-L / 2, -D / 2, L, D], height: 20 });
    case "forklift":
      return forkliftBoxes(false).map(({ at: [u, v, W, Dp], ...rest }) => ({
        ...rest,
        at: [-(u + W) + FORKLIFT_SHIFT, v, W, Dp],
      }));
  }
}

// Boxes in floor cells to metres, turned by 90° (the way a group turns by π/2 about y)
// when rotated. Turning the boxes rather than the model keeps each side's shade.
function placedBoxes(boxes: BoxSpec[], rotated: boolean): BoxSpec[] {
  return boxes.map(({ at: [u, v, W, D], ...rest }) => ({
    ...rest,
    at: rotated ? [v * TILE, -(u + W) * TILE, D * TILE, W * TILE] : [u * TILE, v * TILE, W * TILE, D * TILE],
  }));
}

// Boxes in metres as one mesh; the geometry is freed when it is no longer drawn.
function Boxes({ boxes }: { boxes: BoxSpec[] }) {
  const ghost = useContext(GhostContext);
  const geometry = useMemo(() => boxGeometry(boxes, PX), [boxes]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} raycast={ghost ? noRaycast : undefined}>
      <meshBasicMaterial vertexColors side={DoubleSide} transparent={ghost} opacity={ghost ? 0.8 : 1} />
    </mesh>
  );
}

// A pallet with its load, in metres around its centre; lifted, it rides on the forks.
const FORK_LOAD: BoxSpec[] = [
  { at: [-0.17, -0.2, 0.34, 0.4], h: 4, c: PALLET },
  { at: [-0.15, -0.18, 0.3, 0.36], z: 4, h: 22, c: BOX },
];
const LIFTED_LOAD = placedBoxes(moved(FORK_LOAD, 0, 0, 8), false);
const SET_DOWN_LOAD = placedBoxes(FORK_LOAD, false);

export function ForkLoad({ lifted = false }: { lifted?: boolean }) {
  return <Boxes boxes={lifted ? LIFTED_LOAD : SET_DOWN_LOAD} />;
}

const DOCK_HEIGHT = 6;

// A dock door standing on the outer wall, running along x, or along z when rotated.
export function DockDoor({ color, rotated = false }: { color: string; rotated?: boolean }) {
  return (
    <group rotation-y={rotated ? Math.PI / 2 : 0}>
      <Block size={[DOCK_WIDTH, DOCK_HEIGHT, DOCK_DEPTH]} position={[0, DOCK_HEIGHT / 2, 0]} color={color} />
    </group>
  );
}

// A workstation in metres around its footprint centre; rotated turns it by 90°.
export default function WorkstationModel({
  type,
  rotated = false,
  ghost = false,
}: {
  type: WorkstationType;
  rotated?: boolean;
  ghost?: boolean;
}) {
  const boxes = useMemo(() => placedBoxes(modelBoxes(type), rotated), [type, rotated]);
  return (
    <GhostContext.Provider value={ghost}>
      <Boxes boxes={boxes} />
    </GhostContext.Provider>
  );
}
