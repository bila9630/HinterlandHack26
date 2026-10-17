import { ReactNode, useRef } from "react";
import { useClockTime } from "../clock";
import { Vehicle } from "../layout";
import { Pt, alongPath, pathData } from "../iso";
import { PersonSprite } from "./Person";
import { BOX, DARK, PALLET, PRIMARY, SHADOW, Selectable, YELLOW, Box, useIso } from "./common";

// Moves its children along a screen-space polyline once every `loopSec` seconds of the
// simulation clock, at constant speed, starting `offset` seconds in.
export function Mover({
  path,
  loopSec,
  offset = 0,
  children,
}: {
  path: Pt[];
  loopSec: number;
  offset?: number;
  children: ReactNode;
}) {
  const node = useRef<SVGGElement>(null);
  const transform = (time: number) => {
    const [x, y] = alongPath(path, (time + offset) / loopSec);
    return `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
  };
  useClockTime((time) => node.current?.setAttribute("transform", transform(time)));
  return (
    <g ref={node} transform={transform(0)}>
      {children}
    </g>
  );
}

// A forklift around its own origin, forks towards +u; loaded with a pallet of boxes or empty.
export function ForkliftSprite({ loaded = true }: { loaded?: boolean }) {
  return (
    <g>
      <ellipse cx={0} cy={4} rx={26} ry={9} fill={SHADOW} />
      <Box at={[-0.25, -0.18, 0.42, 0.36]} h={16} c={YELLOW} />
      <Box at={[-0.2, -0.12, 0.2, 0.24]} z={16} h={14} c={DARK} />
      <Box at={[-0.22, -0.15, 0.03, 0.03]} z={16} h={26} c={DARK} />
      <Box at={[-0.22, 0.12, 0.03, 0.03]} z={16} h={26} c={DARK} />
      <Box at={[-0.24, -0.17, 0.36, 0.34]} z={42} h={3} c={DARK} />
      <Box at={[0.17, -0.17, 0.04, 0.34]} h={46} c={DARK} />
      {loaded ? (
        <>
          <Box at={[0.22, -0.2, 0.34, 0.4]} z={8} h={4} c={PALLET} />
          <Box at={[0.24, -0.18, 0.3, 0.36]} z={12} h={22} c={BOX} />
        </>
      ) : (
        <>
          <Box at={[0.22, -0.12, 0.32, 0.05]} z={4} h={2} c={DARK} />
          <Box at={[0.22, 0.07, 0.32, 0.05]} z={4} h={2} c={DARK} />
        </>
      )}
    </g>
  );
}

// A loaded pallet jack with the worker pulling it, around the pallet's centre.
export function PalletJackSprite() {
  const { iso } = useIso();
  const [x, y] = iso(-0.45, 0);
  return (
    <g>
      <ellipse cx={0} cy={2} rx={24} ry={8} fill="rgba(15,27,51,.15)" />
      <Box at={[-0.2, -0.2, 0.4, 0.4]} h={4} c={PALLET} />
      <Box at={[-0.18, -0.18, 0.36, 0.36]} z={4} h={26} c={BOX} />
      <PersonSprite x={x} y={y + 6} />
    </g>
  );
}

export const routePath = (vehicle: Vehicle, iso: (u: number, v: number) => Pt) => vehicle.route.map(([u, v]) => iso(u, v));

// A forklift or pallet jack driving its route, with the route dotted on the floor.
export default function VehicleItem({ vehicle, onSelect }: { vehicle: Vehicle; onSelect?: (id: string) => void }) {
  const { iso } = useIso();
  const path = routePath(vehicle, iso);
  return (
    <g>
      {vehicle.showRoute && (
        <path d={pathData(path)} fill="none" stroke={PRIMARY} strokeWidth={2} strokeDasharray="3 7" opacity={0.45} />
      )}
      <Mover path={path} loopSec={vehicle.loopSec}>
        <Selectable id={vehicle.id} label={`${vehicle.id}, ${vehicle.task}`} onSelect={onSelect}>
          {vehicle.type === "forklift" ? <ForkliftSprite loaded={vehicle.loaded} /> : <PalletJackSprite />}
        </Selectable>
      </Mover>
    </g>
  );
}
