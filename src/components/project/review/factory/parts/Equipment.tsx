import { Conveyor as ConveyorData, PalletRow as PalletRowData, Rack as RackData, Table as TableData } from "../layout";
import { BEAM, BELT, BELT_TOP, BLUE, BOX, Box, DESK, PALLET, WRAP, useIso } from "./common";
import { Mover } from "./Vehicle";

// The belt's coloured top, in px.
const BELT_TOP_HEIGHT = 2;
const PALLET_HEIGHT = 4;

// An assembly line with boxes riding along the belt, evenly spaced over the loop.
export function Conveyor({ conveyor }: { conveyor: ConveyorData }) {
  const { iso } = useIso();
  const [u0, v0, W, D] = conveyor.box;
  const path = conveyor.beltPath.map(([u, v]) => iso(u, v, conveyor.beltZ));
  return (
    <g>
      <Box at={[u0, v0, W, D]} h={conveyor.height - BELT_TOP_HEIGHT} c={BELT} />
      <Box at={[u0, v0, W, D]} z={conveyor.height - BELT_TOP_HEIGHT} h={BELT_TOP_HEIGHT} c={BELT_TOP} />
      {Array.from({ length: conveyor.items }, (_, index) => (
        <Mover key={index} path={path} loopSec={conveyor.loopSec} offset={(index * conveyor.loopSec) / conveyor.items}>
          <Box at={[-0.13, -0.13, 0.26, 0.26]} h={14} c={BOX} />
        </Mover>
      ))}
    </g>
  );
}

// A pallet rack: orange beams at every level, boxes on all but the top one, which holds a
// box and a wrapped pallet, and blue uprights in front.
export function Rack({ rack }: { rack: RackData }) {
  const [u0, v0] = rack.origin;
  const [W, D] = rack.size;
  const lower = rack.levels.slice(0, -1);
  const top = rack.levels[rack.levels.length - 1];
  const slots: number[] = [];
  for (let u = u0 + 0.06; u + 0.6 <= u0 + W - 0.05; u += 0.62) slots.push(u);
  return (
    <g>
      {rack.levels.map((z) => (
        <Box key={`beam${z}`} at={[u0, v0, W, D]} z={z + 2} h={4} c={BEAM} />
      ))}
      {lower.map((z) =>
        slots.map((u) => <Box key={`${z}-${u}`} at={[u + 0.03, v0 + 0.04, 0.56, D - 0.08]} z={z + 6} h={24} c={BOX} />),
      )}
      <Box at={[u0 + 0.06, v0 + 0.04, 0.56, D - 0.08]} z={top + 6} h={24} c={BOX} />
      <Box at={[u0 + 0.7, v0 + 0.04, 0.56, D - 0.08]} z={top + 6} h={24} c={WRAP} />
      {rack.uprights.map((du) => (
        <g key={du}>
          <Box at={[u0 + du, v0, 0.05, 0.05]} h={rack.height} c={BLUE} />
          <Box at={[u0 + du, v0 + D - 0.05, 0.05, 0.05]} h={rack.height} c={BLUE} />
        </g>
      ))}
    </g>
  );
}

// A packing table with a box on it.
export function Table({ table }: { table: TableData }) {
  const [u0, v0, W, D] = table.box;
  return (
    <g>
      <Box at={[u0, v0, W, D]} h={table.height} c={DESK} />
      <Box at={[u0 + 0.15, v0 + 0.07, 0.3, 0.24]} z={table.height} h={14} c={BOX} />
    </g>
  );
}

// The pallet size and load each kind of row has unless the layout says otherwise.
const ROW_DEFAULTS = {
  palletQueue: { size: 0.3, loadHeight: 20 },
  palletStaging: { size: 0.36, loadHeight: 22 },
  looseBoxes: { size: 0.36, loadHeight: 22 },
};

// The footprint of one pallet in a row, for depth sorting.
export function palletFootprint(row: PalletRowData, index: number): [number, number, number, number] {
  const size = ROW_DEFAULTS[row.type].size;
  return [row.at[0] + index * row.step[0], row.at[1] + index * row.step[1], size, size];
}

// One pallet of a row: boxes or wrapped goods, stacked `layers` high. Loose boxes have no pallet.
export function Pallet({ row, index }: { row: PalletRowData; index: number }) {
  const [u, v, size] = palletFootprint(row, index);
  const height = row.loadHeight ?? ROW_DEFAULTS[row.type].loadHeight;
  const color = row.load === "wrapped" ? WRAP : BOX;
  const z = row.z ?? 0;
  if (row.type === "looseBoxes") return <Box at={[u, v, size, size]} z={z} h={height} c={color} />;
  return (
    <g>
      <Box at={[u, v, size, size]} z={z} h={PALLET_HEIGHT} c={PALLET} />
      {Array.from({ length: row.layers ?? 1 }, (_, layer) => (
        <Box
          key={layer}
          at={[u + 0.02, v + 0.02, size - 0.04, size - 0.04]}
          z={z + PALLET_HEIGHT + layer * height}
          h={height}
          c={color}
        />
      ))}
    </g>
  );
}
