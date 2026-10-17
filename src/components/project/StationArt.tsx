import { StationKind } from "./process/model";
import { BEAM, BELT, BELT_TOP, BLUE, BOX, DESK, ORANGE, PALLET, WRAP } from "./review/factory/colors";
import { Triple } from "./review/factory/iso";

// Small isometric drawings of each kind of stop, on a 10 × 10 floor plate, in the
// factory scene's colours: [top, left, right].
const MARKING: Triple = ["#F2B53A", "#F2B53A", "#F2B53A"];

const COS = Math.cos(Math.PI / 6);

function point(x: number, y: number, z: number) {
  return `${((x - z) * COS).toFixed(2)},${((x + z) / 2 - y).toFixed(2)}`;
}

function Box({ x, z, w, d, h, y = 0, shades }: { x: number; z: number; w: number; d: number; h: number; y?: number; shades: Triple }) {
  const [top, left, right] = shades;
  const t = y + h;
  return (
    <g>
      <polygon points={[point(x, t, z), point(x + w, t, z), point(x + w, t, z + d), point(x, t, z + d)].join(" ")} fill={top} />
      <polygon points={[point(x, y, z + d), point(x + w, y, z + d), point(x + w, t, z + d), point(x, t, z + d)].join(" ")} fill={left} />
      <polygon points={[point(x + w, y, z), point(x + w, y, z + d), point(x + w, t, z + d), point(x + w, t, z)].join(" ")} fill={right} />
    </g>
  );
}

// A rack's uprights along one side.
const Uprights = ({ z }: { z: number }) => (
  <>
    {[1.5, 5, 8.5].map((x) => (
      <Box key={x} x={x} z={z} w={0.4} d={0.4} h={7.6} shades={BLUE} />
    ))}
  </>
);

function Scene({ kind }: { kind: StationKind }) {
  switch (kind) {
    case "inbound-dock":
    case "outbound-dock":
      return (
        <>
          <Box x={1.5} z={1.5} w={0.9} d={5} h={6.5} shades={kind === "inbound-dock" ? BLUE : ORANGE} />
          <Box x={4} z={4.2} w={3} d={3} h={0.4} shades={PALLET} />
          <Box x={4.2} z={4.4} w={2.6} d={2.6} h={2.4} y={0.4} shades={BOX} />
        </>
      );
    case "pallet-rack":
      return (
        <>
          <Uprights z={3.2} />
          {[0, 2.6, 5.2].map((y) => (
            <g key={y}>
              <Box x={1.5} z={3.2} w={7.4} d={3.2} h={0.35} y={y} shades={BEAM} />
              <Box x={2.1} z={3.5} w={2.6} d={2.6} h={1.9} y={y + 0.35} shades={BOX} />
              <Box x={5.6} z={3.5} w={2.6} d={2.6} h={1.9} y={y + 0.35} shades={y === 5.2 ? WRAP : BOX} />
            </g>
          ))}
          <Uprights z={6} />
        </>
      );
    case "assembly-line":
      return (
        <>
          <Box x={1} z={2.4} w={8} d={2.4} h={2} shades={BELT} />
          <Box x={1} z={2.4} w={8} d={2.4} h={0.25} y={2} shades={BELT_TOP} />
          {[1.8, 4.3, 6.8].map((x) => (
            <Box key={x} x={x} z={2.9} w={1.4} d={1.4} h={1.3} y={2.25} shades={BOX} />
          ))}
          <Box x={1} z={7.8} w={8} d={0.2} h={0.05} shades={MARKING} />
        </>
      );
    case "packing-table":
      return (
        <>
          <Box x={2.5} z={3.2} w={5} d={3.6} h={2.2} shades={DESK} />
          <Box x={3.5} z={3.8} w={2} d={1.8} h={1.6} y={2.2} shades={BOX} />
        </>
      );
  }
}

export default function StationArt({ kind, className = "" }: { kind: StationKind; className?: string }) {
  return (
    <svg viewBox="-10 -6 20 16" className={className} aria-hidden="true">
      <polygon
        points={[point(0, 0, 0), point(10, 0, 0), point(10, 0, 10), point(0, 0, 10)].join(" ")}
        fill="#ffffff"
        stroke="#dbe2ee"
        strokeWidth={0.15}
      />
      <Scene kind={kind} />
    </svg>
  );
}
