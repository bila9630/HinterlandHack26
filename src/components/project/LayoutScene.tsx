import { ReactNode, RefObject, useEffect, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import {
  FacilityLayout,
  TILE,
  ZONE_COLORS,
  ZONE_LABELS,
  ZoneKind,
  formatArea,
  layoutDocks,
  layoutTiles,
  layoutZones,
} from "./layouts";
import WorkstationModel, { DockDoor } from "./WorkstationModel";
import { PlacedWorkstation, Placement, WorkstationType, footprint, workstationType } from "./workstations";

// One world unit is one floor square (10 m).
const SLAB = 0.25;
const SLAB_COLORS = { right: "#b3c0de", left: "#c5cfe7" };
const GRID_COLOR = "#ffffff";
const DOCK_COLORS = { inbound: "#2c4fd6", outbound: "#d9822b" };

type Point = [number, number, number];
type Labels = RefObject<HTMLDivElement | null>;
type Tiles = ReturnType<typeof layoutTiles>;

export type FloorPointer = "move" | "down" | "up";

// A workstation being placed or moved; it is drawn see-through until it is confirmed.
export type SceneDraft = {
  type: WorkstationType;
  placement: Placement;
  problem: string | null;
  editingId?: string;
};

// Scales the orthographic camera so the whole floor fits the canvas.
function FitCamera({ columns, rows }: { columns: number; rows: number }) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    const projectedWidth = (columns + rows) * Math.cos(Math.PI / 6);
    const projectedHeight = (columns + rows) / 2 + SLAB;
    camera.zoom = Math.min((width * 0.88) / projectedWidth, (height * 0.88) / projectedHeight);
    camera.updateProjectionMatrix();
  }, [camera, width, height, columns, rows]);

  return null;
}

// Centre lines of every straight run of two or more lane squares.
function laneLines(grid: string[]) {
  const lines: [Point, Point][] = [];
  const y = 0.004;
  const inset = 0.3;

  function scan(length: number, isLane: (i: number) => boolean, toPoint: (along: number) => Point) {
    let start = -1;
    for (let i = 0; i <= length; i++) {
      if (i < length && isLane(i)) {
        if (start < 0) start = i;
      } else {
        if (start >= 0 && i - start >= 2) lines.push([toPoint(start + inset), toPoint(i - inset)]);
        start = -1;
      }
    }
  }

  const columns = grid[0].length;
  grid.forEach((row, z) => scan(columns, (x) => row[x] === "L", (along) => [along, y, z + 0.5]));
  for (let x = 0; x < columns; x++) {
    scan(grid.length, (z) => grid[z][x] === "L", (along) => [x + 0.5, y, along]);
  }
  return lines;
}

// Outline around all squares of the given kinds, as line segment pairs.
function zoneOutline(tiles: Tiles, kinds: ZoneKind[]) {
  const matches = (x: number, z: number) =>
    tiles.some((tile) => tile.x === x && tile.z === z && kinds.includes(tile.kind));
  const points: Point[] = [];
  const y = 0.005;
  for (const { x, z, kind } of tiles) {
    if (!kinds.includes(kind)) continue;
    if (!matches(x, z - 1)) points.push([x, y, z], [x + 1, y, z]);
    if (!matches(x, z + 1)) points.push([x, y, z + 1], [x + 1, y, z + 1]);
    if (!matches(x - 1, z)) points.push([x, y, z], [x, y, z + 1]);
    if (!matches(x + 1, z)) points.push([x + 1, y, z], [x + 1, y, z + 1]);
  }
  return points;
}

// Places a model built in metres at a footprint centre given in metres.
function OnFloor({ placement, children }: { placement: Placement; children: ReactNode }) {
  return (
    <group
      position={[placement.x / TILE, 0, placement.z / TILE]}
      rotation-y={placement.rotated ? Math.PI / 2 : 0}
      scale={1 / TILE}
    >
      {children}
    </group>
  );
}

function Draft({ draft, labels }: { draft: SceneDraft; labels: Labels }) {
  const box = footprint(draft.type, draft.placement);
  const color = draft.problem ? "#dc2626" : "#2563eb";
  const y = 0.006;
  const outline: Point[] = [
    [box.minX / TILE, y, box.minZ / TILE],
    [box.maxX / TILE, y, box.minZ / TILE],
    [box.maxX / TILE, y, box.maxZ / TILE],
    [box.minX / TILE, y, box.maxZ / TILE],
    [box.minX / TILE, y, box.minZ / TILE],
  ];

  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[draft.placement.x / TILE, y, draft.placement.z / TILE]}
        raycast={() => null}
      >
        <planeGeometry args={[(box.maxX - box.minX) / TILE, (box.maxZ - box.minZ) / TILE]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
      <Line points={outline} color={color} lineWidth={2} dashed dashSize={0.08} gapSize={0.06} />
      <OnFloor placement={draft.placement}>
        <WorkstationModel type={draft.type} ghost />
      </OnFloor>
      <Html
        portal={labels as RefObject<HTMLElement>}
        position={[draft.placement.x / TILE, 0.6, draft.placement.z / TILE]}
        center
        zIndexRange={[6, 0]}
      >
        <span
          className="pointer-events-none rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          {draft.problem ?? `Drop: ${draft.type.name}`}
        </span>
      </Html>
    </>
  );
}

type FloorProps = {
  layout: FacilityLayout;
  labels: Labels;
  showLabels: boolean;
  workstations: PlacedWorkstation[];
  draft: SceneDraft | null;
  // Pointer positions on the floor, in metres from the floor's far corner.
  onFloorPointer?: (event: FloorPointer, x: number, z: number) => void;
  onSelectWorkstation?: (id: string) => void;
};

function Floor({ layout, labels, showLabels, workstations, draft, onFloorPointer, onSelectWorkstation }: FloorProps) {
  const columns = layout.grid[0].length;
  const rows = layout.grid.length;
  const tiles = useMemo(() => layoutTiles(layout), [layout]);
  const lanes = useMemo(() => laneLines(layout.grid), [layout]);
  const docks = useMemo(() => layoutDocks(layout), [layout]);
  const draftType = draft?.type;
  const highlight = useMemo(() => (draftType ? zoneOutline(tiles, draftType.fits) : []), [tiles, draftType]);
  const gridLines = useMemo(() => {
    const points: Point[] = [];
    for (let x = 1; x < columns; x++) points.push([x, 0.002, 0], [x, 0.002, rows]);
    for (let z = 1; z < rows; z++) points.push([0, 0.002, z], [columns, 0.002, z]);
    return points;
  }, [columns, rows]);

  function pointer(event: FloorPointer) {
    return (e: ThreeEvent<PointerEvent>) => {
      onFloorPointer?.(event, (e.point.x + columns / 2) * TILE, (e.point.z + rows / 2) * TILE);
    };
  }

  return (
    <group position={[-columns / 2, 0, -rows / 2]}>
      <mesh position={[columns / 2, -SLAB / 2, rows / 2]}>
        <boxGeometry args={[columns, SLAB, rows]} />
        <meshBasicMaterial attach="material-0" color={SLAB_COLORS.right} />
        <meshBasicMaterial attach="material-1" color={SLAB_COLORS.right} />
        <meshBasicMaterial attach="material-2" color={GRID_COLOR} />
        <meshBasicMaterial attach="material-3" color={SLAB_COLORS.right} />
        <meshBasicMaterial attach="material-4" color={SLAB_COLORS.left} />
        <meshBasicMaterial attach="material-5" color={SLAB_COLORS.left} />
      </mesh>
      <group onPointerMove={pointer("move")} onPointerDown={pointer("down")} onPointerUp={pointer("up")}>
        {tiles.map((tile) => (
          <mesh key={`${tile.x}-${tile.z}`} rotation-x={-Math.PI / 2} position={[tile.x + 0.5, 0.001, tile.z + 0.5]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={ZONE_COLORS[tile.kind].fill} />
          </mesh>
        ))}
      </group>
      <Line points={gridLines} segments color={GRID_COLOR} lineWidth={2} />
      {lanes.map((points, index) => (
        <Line key={index} points={points} color={GRID_COLOR} lineWidth={2} dashed dashSize={0.18} gapSize={0.14} />
      ))}
      {draftType && highlight.length > 0 && (
        <Line
          points={highlight}
          segments
          color={ZONE_COLORS[draftType.fits[0]].edge}
          lineWidth={2.5}
          dashed
          dashSize={0.08}
          gapSize={0.06}
        />
      )}
      {workstations
        .filter((item) => item.id !== draft?.editingId)
        .map((item) => (
          <group
            key={item.id}
            onClick={(e) => {
              if (!onSelectWorkstation || draft) return;
              e.stopPropagation();
              onSelectWorkstation(item.id);
            }}
          >
            <OnFloor placement={item}>
              <WorkstationModel type={workstationType(item.typeId)} />
            </OnFloor>
          </group>
        ))}
      {docks.map((dock) => (
        <group key={dock.kind}>
          {dock.doors.map((door, index) => (
            <OnFloor key={index} placement={door}>
              <DockDoor color={DOCK_COLORS[dock.kind]} />
            </OnFloor>
          ))}
          {!showLabels && (
            <Html
              portal={labels as RefObject<HTMLElement>}
              position={[dock.label.x / TILE, 0.8, dock.label.z / TILE]}
              center
              zIndexRange={[5, 0]}
            >
              <span className="pointer-events-none rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-slate-900 shadow-sm">
                {ZONE_LABELS[dock.kind]} docks ×{dock.doors.length}
              </span>
            </Html>
          )}
        </group>
      ))}
      {draft && <Draft draft={draft} labels={labels} />}
      {showLabels &&
        layoutZones(layout)
          .filter((zone) => zone.kind !== "lane")
          .map((zone) => (
            <Html
              key={zone.kind}
              portal={labels as RefObject<HTMLElement>}
              position={[zone.centre[0], 0, zone.centre[1]]}
              center
              zIndexRange={[5, 0]}
            >
              <div
                className="pointer-events-none rounded-lg border-2 bg-white px-2.5 py-1 text-center leading-tight whitespace-nowrap shadow-sm"
                style={{ borderColor: ZONE_COLORS[zone.kind].edge }}
              >
                <p className="text-[11px] font-semibold text-slate-900">{ZONE_LABELS[zone.kind]}</p>
                <p className="text-[9px] text-slate-500">{formatArea(zone.area)}</p>
              </div>
            </Html>
          ))}
    </group>
  );
}

type Props = Omit<FloorProps, "labels" | "showLabels" | "workstations" | "draft"> & {
  showLabels?: boolean;
  workstations?: PlacedWorkstation[];
  draft?: SceneDraft | null;
};

export default function LayoutScene({ showLabels = true, workstations = [], draft = null, ...floor }: Props) {
  const { layout } = floor;
  // A fixed label container: drei's default target can change after the first labels
  // mount, which leaves the first one empty.
  const labels = useRef<HTMLDivElement>(null);

  return (
    // select-none: dragging across the floor would otherwise select the label text.
    <div className="relative h-full w-full select-none">
      <Canvas orthographic flat camera={{ position: [20, 20, 20], near: 0.1, far: 200 }}>
        <FitCamera columns={layout.grid[0].length} rows={layout.grid.length} />
        <Floor {...floor} labels={labels} showLabels={showLabels} workstations={workstations} draft={draft} />
        {/* Tilt between top-down and a little past isometric (~55°), so the squares never flatten out.
            Rotating is off while placing, so dragging moves the workstation instead. */}
        <OrbitControls
          enabled={!draft}
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 3}
          minZoom={15}
          maxZoom={400}
        />
      </Canvas>
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
