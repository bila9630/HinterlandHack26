import { DOCK_DEPTH, DOCK_WIDTH, FacilityLayout, TILE, layoutDocks, layoutSize, layoutTiles } from "../layouts";
import { Station } from "../process/model";
import { PlacedWorkstation, footprint, workstationType } from "../workstations";

type Vec = { x: number; z: number };
type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

// A forklift waits loaded at home, drives along its lane to the turn, turns and drives
// forks first to the drop beside a station's workers, sets the pallet down and backs
// out the same way. A forklift with nowhere to go stays at home, the way it was placed.
// `station` is the station it serves, if any.
export type ForkliftRoute = { home: Vec; turn: Vec; drop: Vec; rotated: boolean; station: string | null };

// The floor a worker takes up, which forks stop short of.
const WORKER_RADIUS = 1.3;
// Space kept between a forklift and a workstation, wall or another forklift.
const CLEARANCE = 0.4;
// Half the forklift's length with a pallet on its forks, and half its width.
const FORKLIFT_REACH = workstationType("forklift").length / 2;
const FORKLIFT_HALF_WIDTH = workstationType("forklift").depth / 2;
// How close the forks must get to where a station's workers stand, in metres.
const DROP_NEAR = 6;
// The longest drive along the lane for a forklift that serves no station.
const LANE_DRIVE = 25;
// Choosing the far side of a workstation counts as this many metres further away.
const FAR_SIDE = 8;

const overlaps = (a: Box, b: Box) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
const grow = (box: Box, byX: number, byZ = byX): Box => ({
  minX: box.minX - byX,
  maxX: box.maxX + byX,
  minZ: box.minZ - byZ,
  maxZ: box.maxZ + byZ,
});
const segmentBox = (from: Vec, to: Vec): Box => ({
  minX: Math.min(from.x, to.x),
  maxX: Math.max(from.x, to.x),
  minZ: Math.min(from.z, to.z),
  maxZ: Math.max(from.z, to.z),
});
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);

const isDock = (station: Station) => station.kind === "inbound-dock" || station.kind === "outbound-dock";

// The front of a workstation (+z, or +x when it runs along z) is where the work happens.
function stationFront(station: Station) {
  const { box } = station;
  const wide = box.maxX - box.minX >= box.maxZ - box.minZ;
  const offset = WORKER_RADIUS + CLEARANCE + 0.2;
  return {
    wide,
    along: wide ? [box.minX, box.maxX] : [box.minZ, box.maxZ],
    sides: [
      { across: wide ? box.maxZ + offset : box.maxX + offset, penalty: 0 },
      { across: wide ? box.minZ - offset : box.minX - offset, penalty: FAR_SIDE },
    ],
    point: (along: number, across: number) => (wide ? { x: along, z: across } : { x: across, z: along }),
  };
}

// Where a station's workers gather: the middle of a workstation's front, or in front of the dock doors.
function workSpot(station: Station): Vec {
  if (isDock(station)) return { x: station.x, z: station.z };
  const front = stationFront(station);
  return front.point((front.along[0] + front.along[1]) / 2, front.sides[0].across);
}

// A forklift's way to a station, or along its lane only when `station` is null.
type Leg = { forklift: number; station: string | null; turn: Vec; drop: Vec; boxes: Box[]; cost: number };

// Every way a forklift can reach a station: along its own lane to a turn, then straight
// off the lane until its forks are close to where the station's workers stand.
function forkliftLegs(
  layout: FacilityLayout,
  forklift: PlacedWorkstation,
  index: number,
  stations: Station[],
  blocked: Box[],
): Leg[] {
  const size = layoutSize(layout);
  const lanes = new Set(layoutTiles(layout).filter((tile) => tile.kind === "lane").map((tile) => `${tile.x},${tile.z}`));
  const isLane = (x: number, z: number) => lanes.has(`${x},${z}`);
  const onLanes = (box: Box) => {
    for (let x = Math.floor(box.minX / TILE); x < Math.ceil(box.maxX / TILE); x++) {
      for (let z = Math.floor(box.minZ / TILE); z < Math.ceil(box.maxZ / TILE); z++) {
        if (!isLane(x, z)) return false;
      }
    }
    return true;
  };
  const clear = (box: Box) =>
    box.minX >= 0 &&
    box.minZ >= 0 &&
    box.maxX <= size.length &&
    box.maxZ <= size.depth &&
    !blocked.some((other) => overlaps(box, other));

  // The lane runs along the way the forklift faces: x, or z when it is turned.
  const { rotated } = forklift;
  const home = { x: forklift.x, z: forklift.z };
  const homeAlong = rotated ? home.z : home.x;
  const across = rotated ? home.x : home.z;
  const at = (along: number, side: number) => (rotated ? { x: side, z: along } : { x: along, z: side });
  const tileAcross = Math.floor(across / TILE);
  const laneAt = (i: number) => (rotated ? isLane(tileAcross, i) : isLane(i, tileAcross));
  let first = Math.floor(homeAlong / TILE);
  let last = first;
  if (!laneAt(first)) return [];
  while (laneAt(first - 1)) first--;
  while (laneAt(last + 1)) last++;

  const alongs = [homeAlong];
  for (let along = first * TILE + FORKLIFT_REACH; along <= (last + 1) * TILE - FORKLIFT_REACH; along += 1) {
    alongs.push(along);
  }

  const legs: Leg[] = [];
  for (const along of alongs) {
    const turn = at(along, across);
    // The lane stretch, wide enough for the forklift to turn round at either end.
    const laneBox = grow(segmentBox(home, turn), FORKLIFT_REACH);
    if (!onLanes(laneBox) || !clear(laneBox)) continue;
    // Driving up the lane and setting the pallet down there, for a forklift that can't reach a station.
    const lane = Math.abs(along - homeAlong);
    if (lane >= TILE && lane <= LANE_DRIVE) {
      legs.push({ forklift: index, station: null, turn, drop: turn, boxes: [laneBox], cost: LANE_DRIVE - lane });
    }
    for (const side of [-1, 1]) {
      for (let depth = 1; ; depth += 1) {
        const drop = at(along, across + side * depth);
        // Off the lane the forklift is only as wide as itself, and reaches out ahead and behind.
        const offBox = rotated
          ? grow(segmentBox(turn, drop), FORKLIFT_REACH, FORKLIFT_HALF_WIDTH)
          : grow(segmentBox(turn, drop), FORKLIFT_HALF_WIDTH, FORKLIFT_REACH);
        if (!clear(offBox)) break;
        const forks = at(along, across + side * (depth + FORKLIFT_REACH));
        for (const station of stations) {
          const near = distance(forks, workSpot(station));
          if (near > DROP_NEAR) continue;
          legs.push({
            forklift: index,
            station: station.id,
            turn,
            drop,
            boxes: [laneBox, offBox],
            cost: near * 2 + (Math.abs(along - homeAlong) + depth) * 0.1,
          });
        }
      }
    }
  }
  return legs;
}

// Sends each forklift to a station, the closest fits first, so that no two forklifts
// ever drive over the same floor. Stations get one forklift each before any gets a
// second, and a forklift that can't reach any station drives up and down its lane.
// Each forklift's home is kept clear for it.
function forkliftRoutes(
  layout: FacilityLayout,
  forklifts: PlacedWorkstation[],
  stations: Station[],
  blocked: Box[],
) {
  const homes = forklifts.map((item) => grow(segmentBox(item, item), FORKLIFT_REACH));
  const taken: { forklift: number; box: Box }[] = homes.map((box, forklift) => ({ forklift, box }));
  const routes: ForkliftRoute[] = forklifts.map((item) => ({
    home: item,
    turn: item,
    drop: item,
    rotated: item.rotated,
    station: null,
  }));
  const served = new Set<string>();
  const busy = new Set<number>();
  const legs = forklifts
    .flatMap((item, index) => forkliftLegs(layout, item, index, stations, blocked))
    .sort((a, b) => a.cost - b.cost);

  const passes = [
    (leg: Leg) => leg.station !== null && !served.has(leg.station),
    (leg: Leg) => leg.station !== null,
    (leg: Leg) => leg.station === null,
  ];
  for (const allowed of passes) {
    for (const leg of legs) {
      if (busy.has(leg.forklift) || !allowed(leg)) continue;
      const hits = leg.boxes.some((box) =>
        taken.some((other) => other.forklift !== leg.forklift && overlaps(box, other.box)),
      );
      if (hits) continue;
      busy.add(leg.forklift);
      if (leg.station) served.add(leg.station);
      leg.boxes.forEach((box) => taken.push({ forklift: leg.forklift, box }));
      const item = forklifts[leg.forklift];
      routes[leg.forklift] = {
        home: { x: item.x, z: item.z },
        turn: leg.turn,
        drop: leg.drop,
        rotated: item.rotated,
        station: leg.station,
      };
    }
  }
  return routes;
}

// Where the forklifts go: a route for each, chosen so that none of them runs into a
// workstation, a dock door or another forklift.
export function forkliftPaths(layout: FacilityLayout, placed: PlacedWorkstation[], stations: Station[]) {
  const blocked: Box[] = [
    ...placed
      .filter((item) => item.typeId !== "forklift")
      .map((item) => footprint(workstationType(item.typeId), item)),
    ...layoutDocks(layout).flatMap((dock) =>
      dock.doors.map((door) => {
        const [halfX, halfZ] = door.rotated ? [DOCK_DEPTH / 2, DOCK_WIDTH / 2] : [DOCK_WIDTH / 2, DOCK_DEPTH / 2];
        return { minX: door.x - halfX, maxX: door.x + halfX, minZ: door.z - halfZ, maxZ: door.z + halfZ };
      }),
    ),
  ].map((box) => grow(box, CLEARANCE));
  const unique = stations.filter((station, index, all) => all.findIndex((other) => other.id === station.id) === index);
  return forkliftRoutes(layout, placed.filter((item) => item.typeId === "forklift"), unique, blocked);
}
