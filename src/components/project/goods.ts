export type Temperature = "ambient" | "chilled" | "frozen";

export const TEMPERATURES: Record<Temperature, string> = {
  ambient: "Ambient",
  chilled: "Chilled 2–8 °C",
  frozen: "Frozen −18 °C",
};

export type Goods = {
  id: string;
  name: string;
  quantity: number;
  // Dimensions in cm, weight in kg per unit.
  length: number;
  width: number;
  height: number;
  weight: number | null;
  temperature: Temperature;
  stackable: boolean;
};

// Stand-in for goods read from uploaded customer documents.
export const MOCK_DOCUMENT_GOODS: Omit<Goods, "id">[] = [
  { name: "Wiring harnesses", quantity: 120, length: 120, width: 80, height: 110, weight: 180, temperature: "ambient", stackable: true },
  { name: "Brake discs", quantity: 40, length: 120, width: 100, height: 60, weight: 650, temperature: "ambient", stackable: true },
  { name: "Seat modules", quantity: 60, length: 120, width: 80, height: 160, weight: 220, temperature: "ambient", stackable: false },
  { name: "Structural adhesives", quantity: 48, length: 80, width: 60, height: 140, weight: 300, temperature: "chilled", stackable: false },
  { name: "Exhaust systems", quantity: 25, length: 220, width: 90, height: 70, weight: 140, temperature: "ambient", stackable: true },
  { name: "Fasteners & clips", quantity: 400, length: 40, width: 30, height: 25, weight: 6, temperature: "ambient", stackable: true },
  { name: "Windshields", quantity: 18, length: 180, width: 40, height: 200, weight: 260, temperature: "ambient", stackable: false },
  { name: "ECU control units", quantity: 32, length: 60, width: 40, height: 80, weight: 45, temperature: "ambient", stackable: true },
];

// Floor edge length in metres; the floor is split into FLOOR_TILES × FLOOR_TILES tiles.
export const FLOOR_SIZE = 6;
export const FLOOR_TILES = 4;
const MAX_CELL = 1.9;
const CELL_PADDING = 0.45;

export type PackageSlot = {
  goods: Goods;
  // Centre of the package footprint on the floor, in metres.
  position: [number, number, number];
  // Uniform scale applied when a package is too large for its cell.
  scale: number;
};

// One representative package per goods entry, arranged in a centred grid.
export function layoutGoods(goods: Goods[]): PackageSlot[] {
  const columns = Math.ceil(Math.sqrt(goods.length));
  const rows = Math.ceil(goods.length / columns);
  const cell = Math.min(MAX_CELL, (FLOOR_SIZE - 0.4) / Math.max(columns, rows));

  return goods.map((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const footprint = Math.max(item.length, item.width) / 100;
    return {
      goods: item,
      position: [(column - (columns - 1) / 2) * cell, 0, (row - (rows - 1) / 2) * cell],
      scale: Math.min(1, (cell - CELL_PADDING) / footprint),
    };
  });
}

export function totalWeight(item: Goods) {
  return item.weight === null ? null : item.weight * item.quantity;
}

export function formatWeight(kg: number | null) {
  if (kg === null) return "—";
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(1)} t`;
}
