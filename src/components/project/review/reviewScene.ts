import { FacilityLayout, TILE } from "../layouts";
import { ROLES } from "../people";
import { STATION_DEFAULTS, StationKind, stationName } from "../process/model";
import { dockGroups, siteLayout } from "../site";
import {
  CONVEYOR_DEPTH,
  PlacedWorkstation,
  RACK_LEVELS,
  STAGING_PALLETS,
  footprint,
  workstationType,
} from "../workstations";
import { FactoryLayout, HallSide, Person, SceneObject, Station, UV, Vehicle } from "./factory/layout";
import { LivePlan, LiveStop } from "./liveSim";

// The review floor as the factory scene: the hall and its site, the placed workstations as
// the scene's equipment, the people of each stop at work, forklifts driving their routes,
// a pallet jack unloading at the inbound dock and a label on every stop.

// Floor squares, the factory scene's unit.
const cells = (metres: number) => metres / TILE;
// The factory scene's forklifts drive about this many squares a second, and stand this
// long at each stop.
const FORKLIFT_SPEED = 1.07;
const DWELL = 1.6;
// Heights of the station labels above the floor, in the scene's px.
const LABEL_HEIGHT: Record<StationKind, number> = {
  "inbound-dock": 95,
  "pallet-rack": 118,
  "assembly-line": 60,
  "packing-table": 60,
  "outbound-dock": 80,
};
const ACTIVITY: Record<StationKind, string> = {
  "inbound-dock": "Unloading",
  "pallet-rack": "Put away",
  "assembly-line": "Assembly",
  "packing-table": "Packing",
  "outbound-dock": "Loading",
};
const VEST = "#FFB020";
const PACKER_VEST = "#7FD1C4";
const PALLET = 0.36;
const PALLET_STEP = 0.45;

type Cells = { u0: number; v0: number; u1: number; v1: number };

function cellBox(item: PlacedWorkstation): Cells {
  const box = footprint(workstationType(item.typeId), item);
  return { u0: cells(box.minX), v0: cells(box.minZ), u1: cells(box.maxX), v1: cells(box.maxZ) };
}

// A workstation as the factory scene's equipment. Turned workstations run along v.
function equipment(item: PlacedWorkstation, grid: string[]): SceneObject[] {
  const { u0, v0, u1, v1 } = cellBox(item);
  const [W, D] = [u1 - u0, v1 - v0];
  const length = item.rotated ? D : W;
  switch (item.typeId) {
    case "pallet-rack":
      return [
        {
          type: "rack",
          origin: [u0, v0],
          size: [W, D],
          levels: Array.from({ length: RACK_LEVELS }, (_, level) => level * 32),
          height: RACK_LEVELS * 32,
          uprights: [0, length / 2 - 0.02, length - 0.06],
        },
      ];
    case "assembly-line": {
      // The conveyor runs along the back: -v, or -u when turned.
      const belt = cells(CONVEYOR_DEPTH);
      return [
        {
          type: "conveyor",
          box: item.rotated ? [u0, v0, belt, D] : [u0, v0, W, belt],
          height: 24,
          beltPath: item.rotated
            ? [[u0 + belt / 2, v0 + 0.1], [u0 + belt / 2, v1 - 0.1]]
            : [[u0 + 0.1, v0 + belt / 2], [u1 - 0.1, v0 + belt / 2]],
          beltZ: 24,
          items: 5,
          loopSec: 10,
        },
      ];
    }
    case "packing-table":
      return [{ type: "table", box: [u0, v0, W, D], height: 20 }];
    case "pallet-staging": {
      const row = (STAGING_PALLETS - 1) * PALLET_STEP + PALLET;
      const inProduction = grid[Math.floor((v0 + v1) / 2)]?.[Math.floor((u0 + u1) / 2)] === "P";
      return [
        {
          type: "palletStaging",
          at: item.rotated ? [u0 + (W - PALLET) / 2, v0 + (D - row) / 2] : [u0 + (W - row) / 2, v0 + (D - PALLET) / 2],
          step: item.rotated ? [0, PALLET_STEP] : [PALLET_STEP, 0],
          count: STAGING_PALLETS,
          // Finished goods waiting in production are wrapped.
          ...(inProduction ? { load: "wrapped" as const } : {}),
        },
      ];
    }
    default:
      return [];
  }
}

// A point `inward` squares into the hall from the wall on `side`, `along` it.
function inside(side: HallSide, inward: number, along: number, cols: number, rows: number): UV {
  if (side === "-u") return [inward, along];
  if (side === "+u") return [cols - inward, along];
  if (side === "-v") return [along, inward];
  return [along, rows - inward];
}

// Points spread evenly from `from` to `to`.
const spread = (from: number, to: number, n: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 0.5)) / n);

export function reviewLayout(layout: FacilityLayout, plan: LivePlan): FactoryLayout {
  const site = siteLayout(layout);
  const { cols, rows } = site.hall;
  const docks = dockGroups(layout);
  const byId = new Map(plan.placed.map((item) => [item.id, item]));
  // What a stop does, in the factory scene's words while the step does its station's usual task.
  const actionOf = ({ step, station }: LiveStop) =>
    step.action === STATION_DEFAULTS[station.kind].action ? ACTIVITY[station.kind] : step.action || stationName(station.kind);

  // Forklifts drive from home along the lane, turn, set the pallet down and come back.
  const vehicles: Vehicle[] = plan.forklifts.map((route, index) => {
    const points = [route.home, route.turn, route.drop]
      .map(({ x, z }): UV => [cells(x), cells(z)])
      .filter((point, i, all) => i === 0 || Math.hypot(point[0] - all[i - 1][0], point[1] - all[i - 1][1]) > 1e-6);
    const path = [...points, points[points.length - 1], ...points.slice(0, -1).reverse()];
    const distance = path.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - path[i][0], point[1] - path[i][1]), 0);
    const served = plan.stops.find((stop) => stop.station.id === route.station);
    return {
      id: `FL-${index + 1}`,
      type: "forklift",
      loaded: true,
      route: path,
      loopSec: distance > 0 ? distance / FORKLIFT_SPEED + 2 * DWELL : 1,
      task: served ? actionOf(served) : "Standing by",
      showRoute: distance > 0,
    };
  });
  const drivers = (stationId: string) => plan.forklifts.filter((route) => route.station === stationId).length;

  // Someone at the inbound dock wheels pallets off the truck at the open door with a pallet
  // jack, as far in as the floor behind the door is clear.
  const inbound = docks.find((group) => group.kind === "inbound");
  const inboundStop = plan.stops.find((stop) => stop.station.kind === "inbound-dock");
  const obstacles = plan.placed.filter((item) => item.typeId !== "forklift").map(cellBox);
  let jack = false;
  if (inbound && inboundStop && inboundStop.crew > drivers(inboundStop.station.id)) {
    const along = inbound.doors[0];
    let reach = 1.0;
    for (let inward = 0.05; inward <= 1.2; inward += 0.05) {
      const [u, v] = inside(inbound.side, inward, along, cols, rows);
      const hit = obstacles.some((box) => u > box.u0 - 0.25 && u < box.u1 + 0.25 && v > box.v0 - 0.25 && v < box.v1 + 0.25);
      if (hit) {
        reach = Math.max(0.1, inward - 0.2);
        break;
      }
    }
    const [truck, hall] = [inside(inbound.side, -0.4, along, cols, rows), inside(inbound.side, reach, along, cols, rows)];
    vehicles.push({
      id: "PJ-1",
      type: "palletJackWithWorker",
      route: [truck, hall, hall, truck],
      loopSec: 7,
      task: actionOf(inboundStop),
    });
    jack = true;
  }

  // Everyone else stands at their stop: along the front of a workstation, or just inside
  // the dock doors. Forklift drivers and the pallet jack's worker are already on the floor.
  const people: Person[] = [];
  const placedAt = new Map<string, number>();
  plan.stops.forEach((stop) => {
    const { station } = stop;
    const busy = drivers(station.id) + (jack && stop === inboundStop ? 1 : 0);
    const count = Math.max(0, stop.crew - busy);
    if (count === 0) return;
    const already = placedAt.get(station.id) ?? 0;
    placedAt.set(station.id, already + count);
    const role = ROLES.find((item) => item.zone === station.zone);
    const spots = standingSpots(station.kind, byId.get(station.id), count, already);
    const dock = docks.find((group) => `${group.kind}-dock` === station.kind);
    spots.forEach((spot, index) => {
      const at = spot ?? (dock ? inside(dock.side, 0.4, (dock.doors[1] ?? dock.doors[0]) + 0.2 + (already + index) * 0.3, cols, rows) : null);
      if (!at) return;
      const n = people.length;
      people.push({
        id: `${station.id}-${already + index}`,
        name: station.kind === "packing-table" ? "Packer" : (role?.name ?? stationName(station.kind)),
        role: actionOf(stop),
        at,
        vest: station.kind === "packing-table" ? PACKER_VEST : VEST,
        anim: `bob ${(1.2 + (n % 5) * 0.15).toFixed(2)}s`,
      });
    });
  });

  const stations: Station[] = plan.stops.map((stop, index) => {
    const warning = stop.utilisation >= 0.95;
    const action = actionOf(stop);
    return {
      n: index + 1,
      name: stationName(stop.station.kind),
      label: warning ? `${action} · bottleneck` : stop.crew > 1 ? `${action} · ${stop.crew} people` : action,
      anchor: [...labelPoint(stop, byId.get(stop.station.id)), LABEL_HEIGHT[stop.station.kind]],
      utilisation: stop.utilisation,
      ...(warning ? { warning } : {}),
    };
  });

  function labelPoint(stop: LiveStop, item: PlacedWorkstation | undefined): UV {
    const dock = docks.find((group) => `${group.kind}-dock` === stop.station.kind);
    if (dock) return inside(dock.side, stop.station.kind === "inbound-dock" ? 0 : 0.3, dock.doors[0], cols, rows);
    if (!item) return [cells(stop.station.x), cells(stop.station.z)];
    const { u0, v0, u1, v1 } = cellBox(item);
    // Over the conveyor of an assembly line, over the middle of anything else.
    if (item.typeId === "assembly-line") {
      const belt = cells(CONVEYOR_DEPTH);
      return item.rotated ? [u0 + belt / 2, (v0 + v1) / 2] : [(u0 + u1) / 2, v0 + belt / 2];
    }
    return [(u0 + u1) / 2, (v0 + v1) / 2];
  }

  return {
    ...site,
    stations,
    objects: [...site.objects, ...plan.placed.flatMap((item) => equipment(item, layout.grid))],
    people,
    vehicles,
  };
}

// Where `count` more people stand at a workstation (in front of it: +v, or +u when turned),
// after `already` others; null for a dock, whose spots the caller works out.
function standingSpots(kind: StationKind, item: PlacedWorkstation | undefined, count: number, already: number): (UV | null)[] {
  if (!item) return Array.from({ length: count }, () => null);
  const { u0, v0, u1, v1 } = cellBox(item);
  const total = already + count;
  // How far in front of the workstation's back edge they stand.
  const front =
    kind === "assembly-line" ? cells(CONVEYOR_DEPTH) + 0.35 : kind === "packing-table" ? (item.rotated ? u1 - u0 : v1 - v0) + 0.15 : (item.rotated ? u1 - u0 : v1 - v0) + 0.2;
  const alongs = item.rotated ? spread(v0, v1, total) : spread(u0, u1, total);
  return alongs.slice(already).map((along): UV => (item.rotated ? [u0 + front, along] : [along, v0 + front]));
}
