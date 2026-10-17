import { createContext, useContext, useMemo } from "react";
import { Color } from "three";
import { DOCK_DEPTH, DOCK_WIDTH } from "./layouts";
import { ASSEMBLY_STATIONS, RACK_BAY, RACK_LEVELS, WorkstationType } from "./workstations";

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

const CARTON = "#e39b3d";
const FRAME = "#3a4252";

function PalletRack({ length, depth }: { length: number; depth: number }) {
  const bays = Math.floor(length / RACK_BAY);
  const level = 1.6;
  const upright = 0.3;
  const bayLength = (length - upright * 2) / bays;

  return (
    <>
      {[-1, 1].map((side) => (
        <Block
          key={side}
          size={[upright, level * RACK_LEVELS, depth]}
          position={[side * (length / 2 - upright / 2), (level * RACK_LEVELS) / 2, 0]}
          color={FRAME}
        />
      ))}
      {Array.from({ length: RACK_LEVELS }, (_, row) => (
        <group key={row}>
          <Block size={[length - upright * 2, 0.1, depth]} position={[0, row * level + 0.05, 0]} color="#64708a" />
          {Array.from({ length: bays }, (_, bay) => (
            <Block
              key={bay}
              size={[bayLength - 0.25, 1.15, depth - 0.3]}
              position={[-length / 2 + upright + (bay + 0.5) * bayLength, row * level + 0.1 + 0.575, 0]}
              color={CARTON}
            />
          ))}
        </group>
      ))}
    </>
  );
}

// A raised conveyor along the back with work cells spread along the front.
function AssemblyLine({ length, depth }: { length: number; depth: number }) {
  const conveyor = depth * 0.4;
  const cell = 3;
  return (
    <>
      <Block
        size={[length, 1.6, conveyor]}
        position={[0, 0.8, -depth / 2 + conveyor / 2]}
        color="#8cb33a"
      />
      {Array.from({ length: ASSEMBLY_STATIONS }, (_, index) => (
        <Block
          key={index}
          size={[cell, 2.4, cell * 0.8]}
          position={[-length / 2 + ((index + 0.5) * length) / ASSEMBLY_STATIONS, 1.2, depth / 2 - (cell * 0.8) / 2]}
          color="#d3d9e4"
        />
      ))}
    </>
  );
}

const DOCK_HEIGHT = 6;

// A dock door standing on the outer wall, running along x.
export function DockDoor({ color }: { color: string }) {
  return <Block size={[DOCK_WIDTH, DOCK_HEIGHT, DOCK_DEPTH]} position={[0, DOCK_HEIGHT / 2, 0]} color={color} />;
}

export default function WorkstationModel({ type, ghost = false }: { type: WorkstationType; ghost?: boolean }) {
  const { length, depth } = type;

  return (
    <GhostContext.Provider value={ghost}>
      {type.id === "pallet-rack" && <PalletRack length={length} depth={depth} />}
      {type.id === "assembly-line" && <AssemblyLine length={length} depth={depth} />}
      {type.id === "packing-table" && (
        <>
          <Block size={[length, 1, depth * 0.75]} position={[0, 0.5, 0]} color="#c49a63" />
          <Block size={[1.6, 1.2, 1.6]} position={[-length / 2 + 1.2, 1.6, 0]} color={CARTON} />
          <Block size={[1.2, 1, 1.2]} position={[-length / 2 + 3, 1.5, 0.3]} color={CARTON} />
          <Block size={[1.2, 0.9, 1.2]} position={[0.8, 1.45, -0.3]} color={CARTON} />
          <Block size={[1.6, 1.2, 1.6]} position={[length / 2 - 1.2, 1.6, 0]} color={CARTON} />
          <Block size={[1.3, 1, 1.3]} position={[length / 2 - 1.2, 2.7, 0]} color={CARTON} />
        </>
      )}
      {type.id === "forklift" && (
        <>
          {/* Body, overhead guard, mast at the front (-x) and forks sticking out ahead of it. */}
          <Block size={[3, 2.2, depth * 0.7]} position={[0.9, 1.1, 0]} color="#f2b632" />
          <Block size={[0.15, 1.4, depth * 0.7]} position={[0.1, 2.9, 0]} color={FRAME} />
          <Block size={[1.8, 0.15, depth * 0.7]} position={[0.9, 3.6, 0]} color={FRAME} />
          <Block size={[0.3, 4.2, depth * 0.6]} position={[-0.85, 2.1, 0]} color={FRAME} />
          <Block size={[1.4, 0.15, depth * 0.5]} position={[-1.75, 0.15, 0]} color={FRAME} />
        </>
      )}
    </GhostContext.Provider>
  );
}
