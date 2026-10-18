import { FactoryLayout, Rect, zoneAt } from "../layout";
import { pts } from "../iso";
import { FloorLine, FloorRect, useIso } from "./common";

const ROAD_LINE = "#FFFFFF";
const YARD_STRIPE = "#F2B53A";

// A road with a dashed centre line along its long side.
function Road({ rect: [u0, v0, u1, v1], centerLine = true, color }: { rect: Rect; centerLine?: boolean; color: string }) {
  const along = u1 - u0 < v1 - v0 ? "v" : "u";
  const middle = along === "v" ? (u0 + u1) / 2 : (v0 + v1) / 2;
  return (
    <>
      <FloorRect rect={[u0, v0, u1, v1]} fill={color} />
      {centerLine &&
        (along === "v" ? (
          <FloorLine from={[middle, v0]} to={[middle, v1]} color={ROAD_LINE} width={3} dash="16 14" />
        ) : (
          <FloorLine from={[u0, middle]} to={[u1, middle]} color={ROAD_LINE} width={3} dash="16 14" />
        ))}
    </>
  );
}

// A truck yard with parking stripes every 1.25 cells.
function Yard({ rect: [u0, v0, u1, v1], color }: { rect: Rect; color: string }) {
  const stripes: number[] = [];
  for (let v = v0 + 0.2; v <= v1 - 0.2; v += 1.25) stripes.push(v);
  return (
    <>
      <FloorRect rect={[u0, v0, u1, v1]} fill={color} />
      {stripes.map((v) => (
        <FloorLine key={v} from={[u0 + 0.4, v]} to={[u1 - 0.3, v]} color={YARD_STRIPE} width={2.5} />
      ))}
    </>
  );
}

// The ground layer, in the reference's order: grass, site paving, roads, yards, car park,
// charging area, hall slab, floor cells, lane lines.
export default function Floor({ layout }: { layout: FactoryLayout }) {
  const { iso } = useIso();
  const { exterior, hall, zones } = layout;
  const extent = exterior.groundExtent;
  const park = exterior.carPark;
  const bays = exterior.chargingArea.bays;
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < hall.rows; row++) for (let col = 0; col < hall.cols; col++) cells.push({ col, row });

  return (
    <g>
      <FloorRect rect={[-extent, -extent, extent, extent]} fill={exterior.groundColor} />
      <FloorRect rect={exterior.sitePaving.rect} fill={exterior.sitePaving.color} />
      {exterior.roads.map((road, index) => (
        <Road key={index} rect={road.rect} centerLine={road.centerLine} color={exterior.roadColor} />
      ))}
      {exterior.truckYards.map((yard, index) => (
        <Yard key={index} rect={yard.rect} color={exterior.yardColor} />
      ))}
      <FloorRect rect={park.rect} fill={exterior.yardColor} />
      {Array.from({ length: park.stalls }, (_, k) => {
        const u = park.rect[0] + 0.2 + k * park.stallWidth;
        return <FloorLine key={k} from={[u, park.rect[1] + 0.1]} to={[u, park.rect[1] + 0.75]} color="#FFFFFF" width={2} />;
      })}
      <FloorRect rect={exterior.chargingArea.rect} fill={exterior.yardColor} />
      {Array.from({ length: bays.count }, (_, k) => {
        const u = bays.at[0] + k * bays.step;
        return (
          <FloorRect
            key={k}
            rect={[u, bays.at[1], u + bays.size[0], bays.at[1] + bays.size[1]]}
            fill="none"
            stroke={YARD_STRIPE}
            strokeWidth={2}
          />
        );
      })}
      <FloorRect rect={[-0.08, -0.08, hall.cols + 0.08, hall.rows + 0.08]} fill={hall.slabColor} />
      {cells.map(({ col, row }) => (
        <polygon
          key={`${col}-${row}`}
          points={pts([iso(col, row), iso(col + 1, row), iso(col + 1, row + 1), iso(col, row + 1)])}
          fill={zones.colors[zoneAt(col, row, zones)]}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ))}
      {hall.markings.dashed.map(([from, to], index) => (
        <FloorLine key={`d${index}`} from={from} to={to} color="#FFFFFF" width={3} dash="12 9" />
      ))}
      {hall.markings.solid.map(([from, to], index) => (
        <FloorLine key={`s${index}`} from={from} to={to} color={YARD_STRIPE} width={2} />
      ))}
    </g>
  );
}
