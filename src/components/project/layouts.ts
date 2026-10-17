export type ZoneKind = "inbound" | "warehouse" | "production" | "outbound";

// Plan coordinates in metres: x runs along the facility length, z along its depth.
export type Zone = { kind: ZoneKind; x: number; z: number; length: number; depth: number };

export type FacilityLayout = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  length: number;
  depth: number;
  zones: Zone[];
  // Main goods flow, as [x, z] points in plan coordinates.
  flow: [number, number][];
};

export const ZONE_LABELS: Record<ZoneKind | "lane", string> = {
  inbound: "Inbound",
  warehouse: "Warehouse",
  lane: "Forklift lane",
  production: "Production",
  outbound: "Outbound",
};

// Gaps between zones are forklift lanes; the floor slab shows through there.
export const LAYOUTS: FacilityLayout[] = [
  {
    id: "warehouse-production",
    name: "Warehouse + production",
    description: "Storage and a production line, one dock side",
    bestFor: "Contract logistics with assembly",
    length: 80,
    depth: 60,
    zones: [
      { kind: "outbound", x: 0, z: 0, length: 12, depth: 26 },
      { kind: "inbound", x: 0, z: 32, length: 12, depth: 28 },
      { kind: "warehouse", x: 15, z: 0, length: 65, depth: 28 },
      { kind: "production", x: 15, z: 31, length: 65, depth: 29 },
    ],
    flow: [
      [6, 46],
      [13.5, 40],
      [55, 29.5],
      [55, 14],
      [6, 13],
    ],
  },
  {
    id: "through-flow",
    name: "Through-flow",
    description: "Goods move straight from inbound to outbound",
    bestFor: "High volume, one direction",
    length: 80,
    depth: 60,
    zones: [
      { kind: "inbound", x: 0, z: 0, length: 10, depth: 60 },
      { kind: "warehouse", x: 12, z: 0, length: 32, depth: 60 },
      { kind: "production", x: 46, z: 0, length: 22, depth: 60 },
      { kind: "outbound", x: 70, z: 0, length: 10, depth: 60 },
    ],
    flow: [
      [5, 30],
      [76, 30],
    ],
  },
  {
    id: "l-shaped",
    name: "L-shaped",
    description: "Inbound and outbound on neighbouring sides",
    bestFor: "Corner sites",
    length: 80,
    depth: 60,
    zones: [
      { kind: "inbound", x: 15, z: 0, length: 65, depth: 10 },
      { kind: "warehouse", x: 0, z: 0, length: 12, depth: 37 },
      { kind: "warehouse", x: 15, z: 13, length: 65, depth: 19 },
      { kind: "production", x: 15, z: 35, length: 65, depth: 25 },
      { kind: "outbound", x: 0, z: 40, length: 12, depth: 20 },
    ],
    flow: [
      [60, 5],
      [45, 11.5],
      [13.5, 25],
      [6, 50],
    ],
  },
];
