export type ZoneKind = "inbound" | "warehouse" | "production" | "outbound" | "lane";

// Edge length of one floor square, in metres.
export const TILE = 10;

export type FacilityLayout = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  // One string per row of squares (along z), one character per square (along x).
  // I = inbound, W = warehouse, P = production, O = outbound, L = forklift lane.
  grid: string[];
  // Main goods flow, as [x, z] points in metres.
  flow: [number, number][];
};

export const ZONE_ORDER: ZoneKind[] = ["inbound", "warehouse", "production", "outbound", "lane"];

export const ZONE_LABELS: Record<ZoneKind, string> = {
  inbound: "Inbound",
  warehouse: "Warehouse",
  production: "Production",
  outbound: "Outbound",
  lane: "Forklift lane",
};

export const ZONE_COLORS: Record<ZoneKind, { fill: string; edge: string }> = {
  inbound: { fill: "#a9bffa", edge: "#5d82ec" },
  warehouse: { fill: "#a0dbc1", edge: "#3f9f74" },
  production: { fill: "#d9eb9f", edge: "#8cae35" },
  outbound: { fill: "#f8c995", edge: "#d98b3a" },
  lane: { fill: "#d6dae3", edge: "#9aa2b4" },
};

const KIND_BY_CHAR: Record<string, ZoneKind> = {
  I: "inbound",
  W: "warehouse",
  P: "production",
  O: "outbound",
  L: "lane",
};

export const LAYOUTS: FacilityLayout[] = [
  {
    id: "warehouse-production",
    name: "Warehouse + production",
    description: "Storage and a production line, one dock side",
    bestFor: "Contract logistics with assembly",
    grid: [
      "OOLPPPPP",
      "OOLPPPPP",
      "OOLPPPPP",
      "LLLLLLLL",
      "IILWWWWW",
      "IILWWWWW",
      "IILWWWWW",
    ],
    flow: [
      [10, 55],
      [35, 55],
      [50, 35],
      [50, 15],
      [10, 15],
    ],
  },
  {
    id: "through-flow",
    name: "Through-flow",
    description: "Goods move straight from inbound to outbound",
    bestFor: "High volume, one direction",
    grid: Array(6).fill("ILWWWLPPLO"),
    flow: [
      [5, 30],
      [96, 30],
    ],
  },
  {
    id: "l-shaped",
    name: "L-shaped",
    description: "Inbound and outbound on neighbouring sides",
    bestFor: "Corner sites",
    grid: [
      "WWLIIIII",
      "WWLLLLLL",
      "WWLWWWWW",
      "WWLWWWWW",
      "LLLLLLLL",
      "OOLPPPPP",
      "OOLPPPPP",
    ],
    flow: [
      [60, 5],
      [45, 15],
      [25, 25],
      [10, 60],
    ],
  },
];

export function layoutSize(layout: FacilityLayout) {
  return { length: layout.grid[0].length * TILE, depth: layout.grid.length * TILE };
}

// Every square of the grid, by column (x) and row (z).
export function layoutTiles(layout: FacilityLayout) {
  return layout.grid.flatMap((row, z) => [...row].map((char, x) => ({ kind: KIND_BY_CHAR[char], x, z })));
}

// Area and centre (in squares) of each zone kind present in the layout.
export function layoutZones(layout: FacilityLayout) {
  const tiles = layoutTiles(layout);
  return ZONE_ORDER.map((kind) => {
    const own = tiles.filter((tile) => tile.kind === kind);
    const centre: [number, number] = [
      own.reduce((sum, tile) => sum + tile.x + 0.5, 0) / own.length,
      own.reduce((sum, tile) => sum + tile.z + 0.5, 0) / own.length,
    ];
    return { kind, area: own.length * TILE * TILE, centre };
  }).filter((zone) => zone.area > 0);
}

export function formatArea(m2: number) {
  return `${m2.toLocaleString("en-US")} m²`;
}
