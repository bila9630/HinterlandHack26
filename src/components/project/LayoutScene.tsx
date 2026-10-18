import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
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
import { FactoryLayout, factoryLayout } from "./review/factory/layout";
import { Boxes, Ground, Trees } from "./review/factory/three/parts";
import { hallWallBoxes, objectBoxes, siteBoxes, siteQuads } from "./review/factory/three/models";
import { siteLayout } from "./site";
import WorkstationModel from "./WorkstationModel";
import { PlacedWorkstation, Placement, WorkstationType, footprint, workstationType } from "./workstations";

// One world unit is one floor square (10 m).
const SLAB = 0.25;
const SLAB_COLORS = { right: "#b3c0de", left: "#c5cfe7" };
const GRID_COLOR = "#ffffff";
// The site's ground lies just below the hall's floor.
const SITE_DEPTH = 0.02;

type Point = [number, number, number];
export type Labels = RefObject<HTMLDivElement | null>;
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
// Panels covering the canvas's edges are left out, the floor centred in what remains.
function FitCamera({ columns, rows, covered }: { columns: number; rows: number; covered: Covered }) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { left = 0, right = 0 } = covered;

  useEffect(() => {
    const projectedWidth = (columns + rows) * Math.cos(Math.PI / 6);
    const projectedHeight = (columns + rows) / 2 + SLAB;
    camera.zoom = Math.min(((width - left - right) * 0.88) / projectedWidth, (height * 0.88) / projectedHeight);
    // Shifts the picture right by half the difference, so the floor sits in the middle of the open part.
    camera.setViewOffset(width, height, (right - left) / 2, 0, width, height);
    camera.updateProjectionMatrix();
  }, [camera, width, height, columns, rows, left, right]);

  return null;
}

// Pixels along the canvas's left and right edges that panels cover.
type Covered = { left?: number; right?: number };

// Whether the screen is wide enough (Tailwind's lg) for the panels to float over the floor.
function useWide() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return wide;
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

// The hall's walls with the dock doors in them, as the factory scene draws them, and
// optionally the site around the hall: yards, trucks, roads, car park and trees.
function HallSurroundings({ site, scenery }: { site: FactoryLayout; scenery: boolean }) {
  const walls = useMemo(() => hallWallBoxes(site), [site]);
  const ground = useMemo(() => siteQuads(site), [site]);
  const boxes = useMemo(() => [...site.objects.flatMap(objectBoxes), ...siteBoxes(site)], [site]);
  return (
    <>
      <Boxes boxes={walls} />
      {scenery && (
        <>
          <group position-y={-SITE_DEPTH}>
            <Ground quads={ground} />
          </group>
          <Boxes boxes={boxes} />
          <Trees layout={site} />
        </>
      )}
    </>
  );
}

// Places a model built in metres at a footprint centre given in metres; the model turns itself.
function OnFloor({ placement, children }: { placement: Placement; children: ReactNode }) {
  return (
    <group position={[placement.x / TILE, 0, placement.z / TILE]} scale={1 / TILE}>
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
        <WorkstationModel type={draft.type} rotated={draft.placement.rotated} ghost />
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
  // Extra things drawn on the floor, in floor squares from the floor's far corner.
  overlay?: (labels: Labels) => ReactNode;
  // Hides the zone and dock labels, for small previews.
  quiet?: boolean;
  // Draws the site around the hall.
  scenery?: boolean;
};

function Floor({
  layout,
  labels,
  showLabels,
  workstations,
  draft,
  onFloorPointer,
  onSelectWorkstation,
  overlay,
  quiet = false,
  scenery = true,
}: FloorProps) {
  const columns = layout.grid[0].length;
  const rows = layout.grid.length;
  const tiles = useMemo(() => layoutTiles(layout), [layout]);
  const lanes = useMemo(() => laneLines(layout.grid), [layout]);
  const docks = useMemo(() => layoutDocks(layout), [layout]);
  const site = useMemo(() => siteLayout(layout), [layout]);
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
      <HallSurroundings site={site} scenery={scenery} />
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
              <WorkstationModel type={workstationType(item.typeId)} rotated={item.rotated} />
            </OnFloor>
          </group>
        ))}
      {docks.map((dock) => (
        <group key={dock.kind}>
          {!showLabels && !quiet && (
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
      {overlay?.(labels)}
      {showLabels &&
        !quiet &&
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
  // Panels floating over the canvas's edges on wide screens, in pixels.
  covered?: Covered;
  showLabels?: boolean;
  workstations?: PlacedWorkstation[];
  draft?: SceneDraft | null;
};

export default function LayoutScene({ covered = {}, showLabels = true, workstations = [], draft = null, ...floor }: Props) {
  const { layout, scenery = true } = floor;
  const wide = useWide();
  // A fixed label container: drei's default target can change after the first labels
  // mount, which leaves the first one empty.
  const labels = useRef<HTMLDivElement>(null);

  return (
    // select-none: dragging across the floor would otherwise select the label text.
    <div
      className="relative h-full w-full select-none"
      style={scenery ? { background: factoryLayout.exterior.groundColor } : undefined}
    >
      {/* Far enough back that the site's ground, which reaches well past the hall, stays in front of the camera. */}
      <Canvas orthographic flat camera={{ position: [60, 60, 60], near: 0.1, far: 400 }}>
        <FitCamera columns={layout.grid[0].length} rows={layout.grid.length} covered={wide ? covered : {}} />
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
