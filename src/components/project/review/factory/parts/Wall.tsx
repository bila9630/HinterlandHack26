import { Dock } from "../layout";
import { Pt, pathData, pts } from "../iso";
import { BLUE, ORANGE, PRIMARY, useIso } from "./common";

const WALL_FILL = "#E9EDF4";
// Dock doors are at most this tall, in px.
const DOOR_HEIGHT = 62;

// A low cutaway wall in the plane u = fix (axis "u") or v = fix (axis "v"), from `from` to
// `to` along the other axis: a light fill with a blue top edge. Open docks are gaps with a
// coloured frame, closed docks are filled roller doors with horizontal slats.
export default function Wall({
  axis,
  fix,
  from,
  to,
  height,
  docks = [],
}: {
  axis: "u" | "v";
  fix: number;
  from: number;
  to: number;
  height: number;
  docks?: Dock[];
}) {
  const { iso } = useIso();
  const at = (t: number, z: number): Pt => (axis === "u" ? iso(fix, t, z) : iso(t, fix, z));
  const door = Math.min(height, DOOR_HEIGHT);
  const frame = ({ v: [d0, d1] }: Dock) => [at(d0, 0), at(d1, 0), at(d1, door), at(d0, door)];
  const outline =
    pathData([at(from, 0), at(to, 0), at(to, height), at(from, height)], true) +
    docks
      .filter((dock) => dock.open)
      .map((dock) => " " + pathData(frame(dock), true))
      .join("");

  return (
    <g>
      <path d={outline} fill={WALL_FILL} fillRule="evenodd" />
      <polygon points={pts([at(from, height - 5), at(to, height - 5), at(to, height), at(from, height)])} fill={PRIMARY} />
      {docks.map((dock) => {
        const color = dock.type === "outbound" ? ORANGE : BLUE;
        if (dock.open) return <polygon key={dock.id} points={pts(frame(dock))} fill="none" stroke={color[1]} strokeWidth={3.5} />;
        const slats: number[] = [];
        for (let z = 8; z < door; z += 8) slats.push(z);
        return (
          <g key={dock.id}>
            <polygon points={pts(frame(dock))} fill={color[1]} stroke={color[2]} strokeWidth={2} />
            {slats.map((z) => {
              const [[x1, y1], [x2, y2]] = [at(dock.v[0], z), at(dock.v[1], z)];
              return <line key={z} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color[2]} strokeWidth={1} />;
            })}
          </g>
        );
      })}
    </g>
  );
}
