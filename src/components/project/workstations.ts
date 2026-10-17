import { FacilityLayout, TILE, ZONE_LABELS, ZoneKind, layoutSize, layoutTiles } from "./layouts";

export type WorkstationTypeId = "dock-door" | "pallet-rack" | "assembly-line" | "packing-table" | "forklift";

export type WorkstationType = {
  id: WorkstationTypeId;
  name: string;
  fits: ZoneKind[];
  // Footprint in metres before rotation: length along x, depth along z.
  length: number;
  depth: number;
  specs: { label: string; value: string }[];
  tone: { bg: string; fg: string };
};

export const RACK_LEVELS = 3;
export const RACK_BAY = 2.7;
const RACK_LENGTH = 22;

export const WORKSTATION_TYPES: WorkstationType[] = [
  {
    id: "dock-door",
    name: "Dock door",
    fits: ["inbound", "outbound"],
    length: 4,
    depth: 1,
    specs: [
      { label: "Width", value: "4 m" },
      { label: "Height", value: "4.5 m" },
    ],
    tone: { bg: "#e8eefe", fg: "#3d6cf0" },
  },
  {
    id: "pallet-rack",
    name: "Pallet rack",
    fits: ["warehouse"],
    length: RACK_LENGTH,
    depth: 2,
    specs: [
      { label: "Length", value: `${RACK_LENGTH} m` },
      { label: "Levels", value: String(RACK_LEVELS) },
      { label: "Pallet places", value: String(Math.floor(RACK_LENGTH / RACK_BAY) * RACK_LEVELS) },
    ],
    tone: { bg: "#e3f5ec", fg: "#2f8f62" },
  },
  {
    id: "assembly-line",
    name: "Assembly line",
    fits: ["production"],
    length: 20,
    depth: 2,
    specs: [
      { label: "Length", value: "20 m" },
      { label: "Stations", value: "5" },
    ],
    tone: { bg: "#eef6d9", fg: "#6c8a22" },
  },
  {
    id: "packing-table",
    name: "Packing table",
    fits: ["production"],
    length: 3,
    depth: 2,
    specs: [
      { label: "Size", value: "3 × 2 m" },
      { label: "Packers", value: "2" },
    ],
    tone: { bg: "#fdf0e2", fg: "#d0782a" },
  },
  {
    id: "forklift",
    name: "Forklift",
    fits: ["lane"],
    length: 3,
    depth: 2,
    specs: [
      { label: "Size", value: "3 × 2 m" },
      { label: "Capacity", value: "1.6 t" },
    ],
    tone: { bg: "#fdf6dc", fg: "#c39410" },
  },
];

export function workstationType(id: WorkstationTypeId) {
  return WORKSTATION_TYPES.find((type) => type.id === id)!;
}

export function fitsLabel(type: WorkstationType) {
  return type.fits.map((kind) => (kind === "lane" ? "Forklift lanes" : ZONE_LABELS[kind])).join(" · ");
}

// Position is the footprint centre in metres; rotated turns the footprint by 90°.
export type Placement = { x: number; z: number; rotated: boolean };
export type PlacedWorkstation = Placement & { id: string; typeId: WorkstationTypeId };

export function footprint(type: WorkstationType, { x, z, rotated }: Placement) {
  const length = rotated ? type.depth : type.length;
  const depth = rotated ? type.length : type.depth;
  return { minX: x - length / 2, maxX: x + length / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
}

// Snaps the footprint's corner to the 1 m grid and keeps it on the floor.
export function snapPlacement(layout: FacilityLayout, type: WorkstationType, placement: Placement): Placement {
  const size = layoutSize(layout);
  const length = placement.rotated ? type.depth : type.length;
  const depth = placement.rotated ? type.length : type.depth;
  const minX = Math.min(Math.max(Math.round(placement.x - length / 2), 0), size.length - length);
  const minZ = Math.min(Math.max(Math.round(placement.z - depth / 2), 0), size.depth - depth);
  return { ...placement, x: minX + length / 2, z: minZ + depth / 2 };
}

// Why the workstation can't go here, or null when it fits.
export function placementProblem(
  layout: FacilityLayout,
  type: WorkstationType,
  placement: Placement,
  others: PlacedWorkstation[],
) {
  const box = footprint(type, placement);
  const epsilon = 1e-6;
  const outside = layoutTiles(layout).some(
    (tile) =>
      tile.x * TILE < box.maxX - epsilon &&
      (tile.x + 1) * TILE > box.minX + epsilon &&
      tile.z * TILE < box.maxZ - epsilon &&
      (tile.z + 1) * TILE > box.minZ + epsilon &&
      !type.fits.includes(tile.kind),
  );
  if (outside) return `Needs ${fitsLabel(type)}`;

  const overlaps = others.some((other) => {
    const otherBox = footprint(workstationType(other.typeId), other);
    return (
      otherBox.minX < box.maxX - epsilon &&
      otherBox.maxX > box.minX + epsilon &&
      otherBox.minZ < box.maxZ - epsilon &&
      otherBox.maxZ > box.minZ + epsilon
    );
  });
  return overlaps ? "Overlaps another workstation" : null;
}
