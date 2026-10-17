import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { FLOOR_SIZE, FLOOR_TILES, PackageSlot } from "./goods";

const SLAB = 0.25;
const PALLET_HEIGHT = 0.144;
const TAPE_WIDTH = 0.1;

// Flat face colours, in BoxGeometry material order: +x, -x, +y, -y, +z, -z.
type FaceColors = { right: string; top: string; left: string };

const FLOOR_COLORS = { right: "#b3c2df", top: "#eef3fb", left: "#c6d2ea" };
const BOX_COLORS = { right: "#c97e2b", top: "#f5bc6a", left: "#e39b3d" };
const PALLET_COLORS = { right: "#a9834f", top: "#d9b47e", left: "#c49a63" };
const PALLET_GAP_COLOR = "#4f3b27";
const TAPE_COLORS = { top: "#f9d697", side: "#e9b46a" };
const MARKER_COLOR = "#e3a92b";

function FaceMaterials({ colors }: { colors: FaceColors }) {
  return (
    <>
      <meshBasicMaterial attach="material-0" color={colors.right} />
      <meshBasicMaterial attach="material-1" color={colors.right} />
      <meshBasicMaterial attach="material-2" color={colors.top} />
      <meshBasicMaterial attach="material-3" color={colors.right} />
      <meshBasicMaterial attach="material-4" color={colors.left} />
      <meshBasicMaterial attach="material-5" color={colors.left} />
    </>
  );
}

// Scales the orthographic camera so the whole floor fits the canvas.
function FitCamera() {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    const diagonal = FLOOR_SIZE * Math.SQRT2;
    const projectedHeight = diagonal / Math.sqrt(3) + SLAB * 0.82;
    camera.zoom = Math.min((width * 0.8) / diagonal, (height * 0.92) / projectedHeight);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

function Floor() {
  const gridLines = useMemo(() => {
    const half = FLOOR_SIZE / 2;
    const tile = FLOOR_SIZE / FLOOR_TILES;
    const points: [number, number, number][] = [];
    for (let i = 1; i < FLOOR_TILES; i++) {
      const offset = -half + i * tile;
      points.push([offset, 0.002, -half], [offset, 0.002, half]);
      points.push([-half, 0.002, offset], [half, 0.002, offset]);
    }
    return points;
  }, []);

  return (
    <group>
      <mesh position={[0, -SLAB / 2, 0]}>
        <boxGeometry args={[FLOOR_SIZE, SLAB, FLOOR_SIZE]} />
        <FaceMaterials colors={FLOOR_COLORS} />
      </mesh>
      <Line points={gridLines} segments color="#d6deec" lineWidth={1} />
    </group>
  );
}

// Dashed outline on the floor, optionally filled.
function DashedArea({ length, width, fill }: { length: number; width: number; fill: string }) {
  const x = length / 2;
  const z = width / 2;
  const y = 0.004;
  const outline: [number, number, number][] = [
    [-x, y, -z],
    [x, y, -z],
    [x, y, z],
    [-x, y, z],
    [-x, y, -z],
  ];

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <planeGeometry args={[length, width]} />
        <meshBasicMaterial color={fill} />
      </mesh>
      <Line points={outline} color={MARKER_COLOR} lineWidth={2} dashed dashSize={0.12} gapSize={0.09} />
    </group>
  );
}

function Pallet({ length, width, height }: { length: number; width: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[length, height, width]} />
        <FaceMaterials colors={PALLET_COLORS} />
      </mesh>
      {/* Fork openings on the two visible sides. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * length * 0.25, height * 0.45, width / 2 + 0.002]}>
            <boxGeometry args={[length * 0.3, height * 0.5, 0.002]} />
            <meshBasicMaterial color={PALLET_GAP_COLOR} />
          </mesh>
          <mesh position={[length / 2 + 0.002, height * 0.45, side * width * 0.25]}>
            <boxGeometry args={[0.002, height * 0.5, width * 0.3]} />
            <meshBasicMaterial color={PALLET_GAP_COLOR} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Package({ slot }: { slot: PackageSlot }) {
  const { goods, position, scale } = slot;
  const length = (goods.length / 100) * scale;
  const width = (goods.width / 100) * scale;
  const height = (goods.height / 100) * scale;
  // Treat the stated height as including the pallet, unless the goods are too flat for one.
  const pallet = height > 0.4 ? PALLET_HEIGHT * scale : 0;
  const box = { length: length * 0.98, width: width * 0.98, height: height - pallet };
  const tapeDrop = box.height * 0.35;

  return (
    <group position={position}>
      <DashedArea length={length + 0.3} width={width + 0.3} fill="#f0efe8" />
      {pallet > 0 && <Pallet length={length} width={width} height={pallet} />}
      <group position={[0, pallet, 0]}>
        <mesh position={[0, box.height / 2, 0]}>
          <boxGeometry args={[box.length, box.height, box.width]} />
          <FaceMaterials colors={BOX_COLORS} />
        </mesh>
        <mesh position={[0, box.height + 0.002, 0]}>
          <boxGeometry args={[box.length, 0.004, TAPE_WIDTH * scale]} />
          <meshBasicMaterial color={TAPE_COLORS.top} />
        </mesh>
        <mesh position={[box.length / 2 + 0.002, box.height - tapeDrop / 2, 0]}>
          <boxGeometry args={[0.004, tapeDrop, TAPE_WIDTH * scale]} />
          <meshBasicMaterial color={TAPE_COLORS.side} />
        </mesh>
      </group>
      <Html position={[0, height + 0.12, 0]} zIndexRange={[5, 0]}>
        <div className="pointer-events-none flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-sm">
            {goods.name} · {goods.quantity}
          </span>
          <span className="h-2.5 w-px bg-blue-600" />
        </div>
      </Html>
    </group>
  );
}

export default function FloorScene({ slots }: { slots: PackageSlot[] }) {
  const tile = FLOOR_SIZE / FLOOR_TILES;

  return (
    <Canvas orthographic flat camera={{ position: [20, 20, 20], near: 0.1, far: 200 }}>
      <FitCamera />
      <Floor />
      {slots.length === 0 && <DashedArea length={tile} width={tile} fill="#e4eaf6" />}
      {slots.map((slot) => (
        <Package key={slot.goods.id} slot={slot} />
      ))}
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.4}
        minZoom={15}
        maxZoom={400}
      />
    </Canvas>
  );
}
