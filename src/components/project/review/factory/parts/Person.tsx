import { useContext, useRef } from "react";
import { useClockTime } from "../clock";
import { Person, bobSeconds } from "../layout";
import { PRIMARY, SHADOW, Selectable, SelectionContext, useIso } from "./common";

// How far a worker bobs, in px.
const BOB = 3;

// The pulsing ring on the floor around a selected person.
function SelectionRing() {
  return (
    <g pointerEvents="none">
      <ellipse rx={14} ry={6} fill="rgba(36,86,230,.14)" stroke={PRIMARY} strokeWidth={2} />
      <ellipse rx={14} ry={6} fill="none" stroke={PRIMARY} strokeWidth={2}>
        <animate attributeName="rx" values="14;24" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="ry" values="6;10" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".8;0" dur="1.4s" repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}

// A worker in a vest and hard hat standing at screen (x, y), bobbing every `bob` seconds.
export function PersonSprite({
  x,
  y,
  vest = "#FFB020",
  bob,
  selected,
}: {
  x: number;
  y: number;
  vest?: string;
  bob?: number | null;
  selected?: boolean;
}) {
  const body = useRef<SVGGElement>(null);
  useClockTime((time) => {
    if (!bob || !body.current) return;
    // Up and back down in straight lines, like the mockup's "0 0; 0 -3; 0 0".
    const phase = (time % bob) / bob;
    body.current.setAttribute("transform", `translate(0 ${(-BOB * (1 - Math.abs(2 * phase - 1))).toFixed(2)})`);
  });

  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      {selected && <SelectionRing />}
      <ellipse cx={0} cy={0} rx={8} ry={3.5} fill={SHADOW} />
      <g ref={body}>
        <rect x={-4.5} y={-15} width={9} height={13} rx={3} fill="#2C364B" />
        <rect x={-6} y={-28} width={12} height={15} rx={4} fill={vest} />
        <circle cx={0} cy={-33} r={5} fill="#F2C9A0" />
        <path d="M-5,-35 a5,5 0 0 1 10,0 z" fill="#FFD45C" />
      </g>
    </g>
  );
}

// A person on the floor plan, clickable.
export default function PersonItem({ person, onSelect }: { person: Person; onSelect?: (id: string) => void }) {
  const { iso } = useIso();
  const selected = useContext(SelectionContext) === person.id;
  const [x, y] = iso(...person.at);
  return (
    <Selectable id={person.id} label={person.role ? `${person.name}, ${person.role}` : person.name} onSelect={onSelect}>
      {/* A larger target than the thin sprite. */}
      <rect x={x - 10} y={y - 41} width={20} height={46} fill="transparent" />
      <PersonSprite x={x} y={y} vest={person.vest} bob={bobSeconds(person.anim)} selected={selected} />
    </Selectable>
  );
}
