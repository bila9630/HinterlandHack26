import { Truck as TruckData, UV } from "../layout";
import { Triple, pts, round0 } from "../iso";
import { BLUE, Box, CHARGER, CHARGE_LIGHT, DARK, GLASS, HEDGE, ORANGE, PRIMARY, WHITE, useIso } from "./common";

// A round tree at (u, v), `scale` times the usual size.
export function Tree({ at: [u, v], scale: s }: { at: UV; scale: number }) {
  const { iso } = useIso();
  const [x, y] = iso(u, v);
  const r = 14 * s;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <ellipse cx={0} cy={0} rx={round0(12 * s)} ry={round0(5 * s)} fill="rgba(15,27,51,.15)" />
      <rect x={-2.5} y={round0(-22 * s)} width={5} height={round0(22 * s)} rx={2} fill="#9B7A57" />
      <circle cy={round0(-22 * s - r + 4)} r={round0(r)} fill="#5FB585" />
      <circle cx={round0(-r * 0.35)} cy={round0(-22 * s - r * 1.3 + 4)} r={round0(r * 0.5)} fill="#86CFA3" />
    </g>
  );
}

// A parked car, nose towards -v.
export function Car({ at: [u, v], color }: { at: UV; color: Triple }) {
  return (
    <g>
      <Box at={[u, v, 0.36, 0.52]} h={11} c={color} />
      <Box at={[u + 0.03, v + 0.12, 0.3, 0.28]} z={11} h={8} c={GLASS} />
    </g>
  );
}

export function Hedge({ box }: { box: [number, number, number, number] }) {
  return <Box at={box} h={10} c={HEDGE} />;
}

// A shipping container with vertical ribs on its long side.
export function Container({ at: [u, v], z = 0, color }: { at: UV; z?: number; color: Triple }) {
  const rib: Triple = [color[2], color[2], color[2]];
  return (
    <g>
      <Box at={[u, v, 1.3, 0.8]} z={z} h={40} c={color} />
      {Array.from({ length: 8 }, (_, j) => (
        <Box key={j} at={[u + 0.1 + j * 0.15, v + 0.79, 0.04, 0.01]} z={z + 4} h={32} c={rib} />
      ))}
    </g>
  );
}

// A forklift charger with its green light, standing at the back of a charging bay.
export function Charger({ at: [u, v] }: { at: UV }) {
  return (
    <g>
      <Box at={[u, v, 0.3, 0.12]} h={26} c={CHARGER} />
      <Box at={[u + 0.05, v + 0.11, 0.2, 0.01]} z={14} h={6} c={CHARGE_LIGHT} />
    </g>
  );
}

export function GuardHouse({ at: [u, v] }: { at: UV }) {
  return (
    <g>
      <Box at={[u, v, 0.6, 0.6]} h={34} c={WHITE} />
      <Box at={[u - 0.05, v - 0.05, 0.7, 0.7]} z={34} h={4} c={BLUE} />
    </g>
  );
}

// A truck: a 2.4 × 1.0 trailer along u from `trailer`, with the cab on its -u end and an
// optional brand panel on the trailer's +v side.
export function Truck({ truck }: { truck: TruckData }) {
  const { iso } = useIso();
  const [u, v] = truck.trailer;
  const cab = truck.cab === "orange" ? ORANGE : BLUE;
  return (
    <g>
      <Box at={[u + 0.15, v + 0.05, 0.25, 0.9]} h={10} c={DARK} />
      <Box at={[u, v, 2.4, 1.0]} z={10} h={62} c={WHITE} />
      <Box at={[u - 0.6, v + 0.05, 0.6, 0.9]} z={6} h={46} c={cab} />
      <Box at={[u - 0.58, v + 0.07, 0.56, 0.86]} z={52} h={6} c={DARK} />
      <Box at={[u + 1.7, v + 0.05, 0.25, 0.9]} h={10} c={DARK} />
      {truck.brand !== false && (
        <polygon
          points={pts([iso(u + 0.45, v + 1, 30), iso(u + 1.95, v + 1, 30), iso(u + 1.95, v + 1, 60), iso(u + 0.45, v + 1, 60)])}
          fill={PRIMARY}
          opacity={0.9}
        />
      )}
    </g>
  );
}
