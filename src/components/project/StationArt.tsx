import { StationKind } from "./process";

// Small isometric drawings of each kind of stop, on a 10 × 10 floor plate.
type Shades = [top: string, left: string, right: string];

const ORANGE: Shades = ["#f6bd6c", "#e8a04f", "#cf8432"];
const DARK: Shades = ["#4a5568", "#2d3748", "#1a202c"];
const GREY: Shades = ["#eef2f7", "#d5dce7", "#b4bfd0"];
const BLUE: Shades = ["#5a7af0", "#2c4fd6", "#1f3bb0"];
const AMBER: Shades = ["#f0a54a", "#d9822b", "#b8671a"];
const GREEN: Shades = ["#b5d96a", "#8cb83a", "#6c962a"];

const COS = Math.cos(Math.PI / 6);

function point(x: number, y: number, z: number) {
  return `${((x - z) * COS).toFixed(2)},${((x + z) / 2 - y).toFixed(2)}`;
}

function Box({ x, z, w, d, h, y = 0, shades }: { x: number; z: number; w: number; d: number; h: number; y?: number; shades: Shades }) {
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

function Scene({ kind }: { kind: StationKind }) {
  switch (kind) {
    case "inbound-dock":
    case "outbound-dock":
      return (
        <>
          <Box x={1.5} z={1.5} w={0.9} d={5} h={6.5} shades={kind === "inbound-dock" ? BLUE : AMBER} />
          <Box x={4} z={4.2} w={3} d={3} h={2.8} shades={ORANGE} />
        </>
      );
    case "pallet-rack":
      return (
        <>
          <Box x={2.2} z={2.4} w={0.6} d={0.6} h={7} shades={DARK} />
          <Box x={5.4} z={2.4} w={0.6} d={0.6} h={7} shades={DARK} />
          {[0, 2.3, 4.6].map((y) => (
            <Box key={y} x={2.8} z={3.2} w={2.6} d={3.6} h={1.9} y={y} shades={ORANGE} />
          ))}
          <Box x={2.2} z={7} w={0.6} d={0.6} h={7} shades={DARK} />
          <Box x={5.4} z={7} w={0.6} d={0.6} h={7} shades={DARK} />
        </>
      );
    case "assembly-line":
      return (
        <>
          <Box x={1.5} z={1.8} w={2} d={2} h={2.2} shades={GREY} />
          <Box x={1.5} z={4.6} w={7} d={1.8} h={1.2} shades={GREEN} />
          <Box x={4.4} z={1.8} w={2} d={2} h={1.6} shades={GREY} />
          <Box x={2} z={4.9} w={1.3} d={1.3} h={1.1} y={1.2} shades={ORANGE} />
          <Box x={4.8} z={7.2} w={2} d={1.6} h={1.8} shades={GREY} />
        </>
      );
    case "packing-table":
      return (
        <>
          <Box x={3} z={3} w={4} d={4} h={2.4} shades={GREY} />
          <Box x={4.1} z={4.1} w={1.8} d={1.8} h={1.7} y={2.4} shades={ORANGE} />
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
