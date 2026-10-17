import { FacilityLayout, TILE, ZoneKind, layoutTiles } from "./layouts";
import { PlacedWorkstation, footprint, workstationType } from "./workstations";

export type RoleId = "inbound" | "pallet" | "assembly" | "outbound";

export type Role = {
  id: RoleId;
  name: string;
  wage: number;
  // The zone the role works in, which is also where it stands on the floor.
  zone: ZoneKind;
  tone: { bg: string; fg: string };
};

export const ROLES: Role[] = [
  { id: "inbound", name: "Inbound worker", wage: 23.5, zone: "inbound", tone: { bg: "#c3d2fb", fg: "#2c4fd6" } },
  { id: "pallet", name: "Pallet worker", wage: 24, zone: "warehouse", tone: { bg: "#bfe6d3", fg: "#1f7a52" } },
  { id: "assembly", name: "Assembly worker", wage: 23.5, zone: "production", tone: { bg: "#e4f0bb", fg: "#6f9a1f" } },
  { id: "outbound", name: "Outbound worker", wage: 24, zone: "outbound", tone: { bg: "#fad6ae", fg: "#d9822b" } },
];

export const SHIFT_HOURS = 8;
export const WORKING_DAYS = 250;
export const MAX_DAYS = 40;
export const MIN_VACATION_DAYS = 30;
export const HAPPY_SCORE = 75;

export type Staffing = {
  counts: Record<RoleId, number>;
  sickDays: number;
  vacationDays: number;
  christmasBonus: boolean;
};

export const DEFAULT_STAFFING: Staffing = {
  counts: { inbound: 1, pallet: 1, assembly: 3, outbound: 1 },
  sickDays: 10,
  vacationDays: 20,
  christmasBonus: true,
};

export function headcount(staffing: Staffing) {
  return ROLES.reduce((sum, role) => sum + staffing.counts[role.id], 0);
}

// Yearly cost of the team. Absent people are paid anyway, so backup workers cover
// their shifts, and the Christmas bonus is one month of pay for everyone.
export function staffCost(staffing: Staffing) {
  const people = headcount(staffing);
  const staff = ROLES.reduce(
    (sum, role) => sum + staffing.counts[role.id] * role.wage * SHIFT_HOURS * WORKING_DAYS,
    0,
  );
  const absent = staffing.sickDays + staffing.vacationDays;
  const backupShare = absent / (WORKING_DAYS - absent);
  const backup = staff * backupShare;
  const bonus = staffing.christmasBonus ? (staff + backup) / 12 : 0;
  return { staff, backup, bonus, total: staff + backup + bonus, people: people * (1 + backupShare) };
}

// Team happiness from 0 to 100, with the most pressing reason when it is low.
export function teamMood(staffing: Staffing) {
  const missingVacation = Math.max(0, MIN_VACATION_DAYS - staffing.vacationDays);
  const score = Math.max(0, 100 - missingVacation * 3 - (staffing.christmasBonus ? 0 : 15));
  const reason =
    missingVacation > 0
      ? `Each person needs at least ${MIN_VACATION_DAYS} vacation days`
      : !staffing.christmasBonus
        ? "People count on a Christmas bonus"
        : "Your team is happy with these conditions";
  return { score, happy: score >= HAPPY_SCORE, reason };
}

export const thousands = (value: number) => `€${Math.round(value / 1000).toLocaleString("en-US")}k`;

// Where each worker of a role stands, in floor squares: spread over the squares of the
// role's zone that no workstation covers, several to a square when the zone is small.
export function workerSpots(layout: FacilityLayout, workstations: PlacedWorkstation[], role: Role, count: number) {
  const boxes = workstations.map((item) => footprint(workstationType(item.typeId), item));
  const zone = layoutTiles(layout).filter((tile) => tile.kind === role.zone);
  const free = zone.filter(({ x, z }) => {
    const cx = (x + 0.5) * TILE;
    const cz = (z + 0.5) * TILE;
    return !boxes.some((box) => cx >= box.minX && cx <= box.maxX && cz >= box.minZ && cz <= box.maxZ);
  });
  const tiles = free.length > 0 ? free : zone;
  if (tiles.length === 0) return [];

  const offsets = [
    [0, 0],
    [0.25, 0.25],
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
  ];
  return Array.from({ length: count }, (_, index) => {
    const crowded = count > tiles.length;
    const tile = crowded ? tiles[index % tiles.length] : tiles[Math.floor(((index + 0.5) * tiles.length) / count)];
    const [ox, oz] = crowded ? offsets[Math.floor(index / tiles.length) % offsets.length] : offsets[0];
    return [tile.x + 0.5 + ox, tile.z + 0.5 + oz] as [number, number];
  });
}
