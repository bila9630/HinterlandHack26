import { useId } from "react";
import { FacilityLayout, ZoneKind } from "./layouts";

const COS30 = Math.cos(Math.PI / 6);
const SLAB = 3;

export const ZONE_COLORS: Record<ZoneKind | "lane", { fill: string; dot: string }> = {
  inbound: { fill: "#b4c6fa", dot: "#7b9cf5" },
  warehouse: { fill: "#addfc8", dot: "#4fbf8a" },
  lane: { fill: "#eceff5", dot: "#c4cad6" },
  production: { fill: "#dcedae", dot: "#b2d95a" },
  outbound: { fill: "#f9cc9e", dot: "#f2a35a" },
};

// Isometric projection of a plan point; the slab's far corner sits at the origin.
function project(x: number, z: number, y = 0) {
  return `${((x - z) * COS30).toFixed(2)},${((x + z) / 2 + y).toFixed(2)}`;
}

function rect(x: number, z: number, length: number, depth: number) {
  return [project(x, z), project(x + length, z), project(x + length, z + depth), project(x, z + depth)].join(" ");
}

export default function LayoutPreview({ layout }: { layout: FacilityLayout }) {
  // useId output contains characters that break url(#…) references.
  const arrowId = `arrow-${useId().replace(/[^\w-]/g, "")}`;
  const { length, depth } = layout;
  const minX = -depth * COS30;
  const maxX = length * COS30;
  const height = (length + depth) / 2 + SLAB;

  return (
    <svg
      viewBox={`${minX - 4} -4 ${maxX - minX + 8} ${height + 8}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="#475569" />
        </marker>
      </defs>
      {/* Visible slab sides, then the top, which shows through as forklift lanes. */}
      <polygon
        points={[project(length, 0), project(length, depth), project(length, depth, SLAB), project(length, 0, SLAB)].join(" ")}
        fill="#b9c3d9"
      />
      <polygon
        points={[project(0, depth), project(length, depth), project(length, depth, SLAB), project(0, depth, SLAB)].join(" ")}
        fill="#cdd5e6"
      />
      <polygon points={rect(0, 0, length, depth)} fill={ZONE_COLORS.lane.fill} />
      {layout.zones.map((zone, index) => (
        <polygon
          key={index}
          points={rect(zone.x, zone.z, zone.length, zone.depth)}
          fill={ZONE_COLORS[zone.kind].fill}
        />
      ))}
      <polyline
        points={layout.flow.map(([x, z]) => project(x, z)).join(" ")}
        fill="none"
        stroke="#475569"
        strokeWidth="0.9"
        strokeDasharray="2.4 1.8"
        strokeLinejoin="round"
        markerEnd={`url(#${arrowId})`}
      />
    </svg>
  );
}
