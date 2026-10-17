import { useId } from "react";
import { FacilityLayout, TILE, ZONE_COLORS, layoutSize, layoutTiles } from "./layouts";

const COS30 = Math.cos(Math.PI / 6);
const SLAB = 3;
const LANE_FILL = "#eceff5";

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
  const { length, depth } = layoutSize(layout);
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
      <polygon points={rect(0, 0, length, depth)} fill={LANE_FILL} />
      {layoutTiles(layout)
        .filter((tile) => tile.kind !== "lane")
        .map((tile) => (
          // The matching stroke hides hairline seams between neighbouring squares.
          <polygon
            key={`${tile.x}-${tile.z}`}
            points={rect(tile.x * TILE, tile.z * TILE, TILE, TILE)}
            fill={ZONE_COLORS[tile.kind].fill}
            stroke={ZONE_COLORS[tile.kind].fill}
            strokeWidth="0.4"
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
