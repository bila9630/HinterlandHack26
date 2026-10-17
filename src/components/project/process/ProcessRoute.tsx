import { RefObject, useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import { TILE } from "../layouts";
import { Labels } from "../LayoutScene";
import { Station, stationName } from "./model";
import { PalletPosition } from "./simulation";

type Props = {
  labels: Labels;
  // Every stop on the floor, and the stops of the route in order (a draft step included).
  stations: Station[];
  route: Station[];
  // The step being drafted or edited, with its label above the floor.
  activeIndex?: number | null;
  activeLabel?: string | null;
  // Label on the leg leading to the active step, e.g. "22 m · forklift".
  legLabel?: string | null;
  // Unused stops get a dashed marker to click.
  showMarkers?: boolean;
  onSelectStation?: (station: Station) => void;
  onSelectStep?: (index: number) => void;
  pallet?: PalletPosition | null;
  // Small previews draw solid lines and small badges.
  compact?: boolean;
};

const ROUTE_COLOR = "#2563eb";
const Y = 0.02;

type Point = [number, number, number];

const toPoint = (x: number, z: number, y = Y): Point => [x / TILE, y, z / TILE];

// Each leg runs along x first, then along z, like a forklift following the lanes.
function legPoints(from: Station, to: Station): Point[] {
  return [toPoint(from.x, from.z), toPoint(to.x, from.z), toPoint(to.x, to.z)];
}

// Middle of the longer straight part of a leg, where its label has room.
function legMiddle([from, corner, to]: Point[]): Point {
  const first = Math.abs(corner[0] - from[0]) + Math.abs(corner[2] - from[2]);
  const second = Math.abs(to[0] - corner[0]) + Math.abs(to[2] - corner[2]);
  const [a, b] = first >= second ? [from, corner] : [corner, to];
  return [(a[0] + b[0]) / 2, 0.3, (a[2] + b[2]) / 2];
}

function palletPoint(route: Station[], pallet: PalletPosition): Point {
  const to = route[pallet.index];
  if (pallet.at === "step" || pallet.index === 0) return toPoint(to.x, to.z, 0.12);
  const from = route[pallet.index - 1];
  const first = Math.abs(to.x - from.x);
  const total = first + Math.abs(to.z - from.z) || 1;
  const along = pallet.fraction * total;
  if (along <= first) return toPoint(from.x + Math.sign(to.x - from.x) * along, from.z, 0.12);
  return toPoint(to.x, from.z + Math.sign(to.z - from.z) * (along - first), 0.12);
}

function Highlight({ station }: { station: Station }) {
  const { minX, maxX, minZ, maxZ } = station.box;
  const y = 0.008;
  const outline: Point[] = [
    toPoint(minX, minZ, y),
    toPoint(maxX, minZ, y),
    toPoint(maxX, maxZ, y),
    toPoint(minX, maxZ, y),
    toPoint(minX, minZ, y),
  ];
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={toPoint((minX + maxX) / 2, (minZ + maxZ) / 2, y)} raycast={() => null}>
        <planeGeometry args={[(maxX - minX) / TILE, (maxZ - minZ) / TILE]} />
        <meshBasicMaterial color={ROUTE_COLOR} transparent opacity={0.16} />
      </mesh>
      <Line points={outline} color={ROUTE_COLOR} lineWidth={2} dashed dashSize={0.08} gapSize={0.06} />
    </>
  );
}

function Tag({ labels, at, children, outlined = false }: { labels: Labels; at: Point; children: string; outlined?: boolean }) {
  return (
    <Html portal={labels as RefObject<HTMLElement>} position={at} center zIndexRange={[8, 0]}>
      <span
        className={`pointer-events-none rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-sm ${
          outlined ? "border border-dashed border-blue-600 bg-white text-slate-900" : "bg-blue-600 text-white"
        }`}
      >
        {children}
      </span>
    </Html>
  );
}

export default function ProcessRoute({
  labels,
  stations,
  route,
  activeIndex = null,
  activeLabel = null,
  legLabel = null,
  showMarkers = false,
  onSelectStation,
  onSelectStep,
  pallet = null,
  compact = false,
}: Props) {
  const legs = useMemo(() => route.slice(1).map((station, index) => legPoints(route[index], station)), [route]);
  const steps = new Map<string, number[]>();
  route.forEach((station, index) => steps.set(station.id, [...(steps.get(station.id) ?? []), index]));
  const active = activeIndex !== null ? route[activeIndex] : undefined;
  const activeLeg = activeIndex !== null && activeIndex > 0 ? legs[activeIndex - 1] : undefined;

  return (
    <>
      {active && !compact && <Highlight station={active} />}
      {legs.map((points, index) =>
        compact ? (
          <Line key={index} points={points} color={ROUTE_COLOR} lineWidth={2.5} />
        ) : (
          <Line key={index} points={points} color={ROUTE_COLOR} lineWidth={3} dashed dashSize={0.06} gapSize={0.06} />
        ),
      )}
      {pallet && route[pallet.index] && (
        <mesh position={palletPoint(route, pallet)} raycast={() => null}>
          <boxGeometry args={[0.28, 0.2, 0.28]} />
          <meshBasicMaterial color="#e8a04f" />
        </mesh>
      )}
      {active && activeLabel && <Tag labels={labels} at={toPoint(active.x, active.z, 0.75)}>{activeLabel}</Tag>}
      {activeLeg && legLabel && (
        <Tag labels={labels} at={legMiddle(activeLeg)} outlined>
          {legLabel}
        </Tag>
      )}
      {stations.map((station) => {
        const indexes = steps.get(station.id);
        if (!indexes && (!showMarkers || compact)) return null;
        const filled = indexes?.some((index) => index === activeIndex);
        const clickable = indexes ? onSelectStep : onSelectStation;
        return (
          <Html
            key={station.id}
            portal={labels as RefObject<HTMLElement>}
            position={toPoint(station.x, station.z, 0.15)}
            center
            zIndexRange={[7, 0]}
          >
            <button
              type="button"
              title={stationName(station.kind)}
              disabled={!clickable}
              onClick={() => (indexes ? onSelectStep?.(indexes[indexes.length - 1]) : onSelectStation?.(station))}
              className={`flex items-center justify-center rounded-full font-bold transition ${
                clickable ? "pointer-events-auto cursor-pointer hover:scale-110" : "pointer-events-none"
              } ${
                !indexes
                  ? "size-6 border-2 border-dashed border-blue-600 bg-white/40"
                  : compact
                    ? `h-4 min-w-4 border-[1.5px] border-blue-600 px-1 text-[8px] ${filled ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`
                    : `h-7 min-w-7 border-2 px-1.5 text-[11px] shadow-md ${
                        filled ? "border-white bg-blue-600 text-white" : "border-blue-600 bg-white text-blue-600"
                      }`
              }`}
            >
              {indexes ? indexes.map((index) => index + 1).join(" · ") : <span className="size-2 rounded-full bg-blue-600" />}
            </button>
          </Html>
        );
      })}
    </>
  );
}
