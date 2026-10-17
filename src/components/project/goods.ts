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
