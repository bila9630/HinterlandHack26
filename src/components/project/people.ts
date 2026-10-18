import { FacilityLayout, TILE, ZoneKind, layoutTiles } from "./layouts";
import { PlacedWorkstation, footprint, workstationType } from "./workstations";

export type RoleId = "inbound" | "pallet" | "assembly" | "outbound";

export type Role = {
  id: RoleId;
  name: string;
  // The zone the role works in, which is also where it stands on the floor.
  zone: ZoneKind;
  tone: { bg: string; fg: string };
};

export const ROLES: Role[] = [
  { id: "inbound", name: "Inbound worker", zone: "inbound", tone: { bg: "#c3d2fb", fg: "#2c4fd6" } },
  { id: "pallet", name: "Pallet worker", zone: "warehouse", tone: { bg: "#bfe6d3", fg: "#1f7a52" } },
  { id: "assembly", name: "Assembly worker", zone: "production", tone: { bg: "#e4f0bb", fg: "#6f9a1f" } },
  { id: "outbound", name: "Outbound worker", zone: "outbound", tone: { bg: "#fad6ae", fg: "#d9822b" } },
];

// Salary groups (Tarif-Stufen) of the collective agreement, by hourly wage.
export type TariffId = "E8" | "E9" | "E10" | "E11";

export const TARIFF_GROUPS: { id: TariffId; description: string; wage: number }[] = [
  { id: "E8", description: "Helper, no training", wage: 21 },
  { id: "E9", description: "Trained on the job", wage: 22.5 },
  { id: "E10", description: "Skilled worker", wage: 23.5 },
  { id: "E11", description: "Skilled, with forklift licence", wage: 24 },
];

export const SHIFT_HOURS = 8;
export const WORKING_DAYS = 250;
export const MAX_DAYS = 40;
export const MIN_VACATION_DAYS = 30;
export const HAPPY_SCORE = 75;
// From this many workers on one station, they get in each other's way.
export const CROWDED_STATION = 5;

export type Staffing = {
  counts: Record<RoleId, number>;
  tariffs: Record<RoleId, TariffId>;
  sickDays: number;
  vacationDays: number;
  christmasBonus: boolean;
};

export const DEFAULT_STAFFING: Staffing = {
  counts: { inbound: 2, pallet: 1, assembly: 4, outbound: 1 },
  tariffs: { inbound: "E10", pallet: "E11", assembly: "E10", outbound: "E11" },
  sickDays: 10,
  vacationDays: 20,
  christmasBonus: true,
};

export function roleWage(staffing: Staffing, role: RoleId) {
  return TARIFF_GROUPS.find((group) => group.id === staffing.tariffs[role])!.wage;
}

export function headcount(staffing: Staffing) {
  return ROLES.reduce((sum, role) => sum + staffing.counts[role.id], 0);
}

// Yearly cost of the team. Absent people are paid anyway, so backup workers cover
// their shifts, and the Christmas bonus is one month of pay for everyone.
export function staffCost(staffing: Staffing) {
  const people = headcount(staffing);
  const staff = ROLES.reduce(
    (sum, role) => sum + staffing.counts[role.id] * roleWage(staffing, role.id) * SHIFT_HOURS * WORKING_DAYS,
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
      ? `Each person should get at least ${MIN_VACATION_DAYS} vacation days`
      : !staffing.christmasBonus
        ? "You should consider paying a Christmas bonus"
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
