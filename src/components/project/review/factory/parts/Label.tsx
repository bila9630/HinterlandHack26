import { Station } from "../layout";
import { FONT, INK, PRIMARY, WARNING, useIso } from "./common";

// A station's pill label with its number, anchored at the station and scaled around that
// point. Orange when the station needs attention.
export default function Label({ station, scale = 1 }: { station: Station; scale?: number }) {
  const { iso } = useIso();
  const [u, v, z] = station.anchor;
  const [x, y] = iso(u, v, z);
  const w = station.label.length * 6.6 + 40;
  const color = station.warning ? WARNING : PRIMARY;
  const left = x - w / 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`} pointerEvents="none">
      <rect x={left} y={y - 26} width={w} height={24} rx={12} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
      <circle cx={left + 13} cy={y - 14} r={8.5} fill={color} />
      <text x={left + 13} y={y - 10.3} textAnchor="middle" fontFamily={FONT} fontSize={10} fontWeight={800} fill="#FFFFFF">
        {station.n}
      </text>
      <text x={left + 26} y={y - 10} fontFamily={FONT} fontSize={11.5} fontWeight={700} fill={INK}>
        {station.label}
      </text>
    </g>
  );
}
