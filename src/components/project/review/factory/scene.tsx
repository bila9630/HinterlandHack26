import { ReactNode } from "react";
import { Iso } from "./iso";
import { FactoryLayout, SceneObject, UV } from "./layout";
import { pythonRandom } from "./random";
import { CARS, CONTAINERS } from "./parts/common";
import { Conveyor, Pallet, Rack, Table, palletFootprint } from "./parts/Equipment";
import PersonItem from "./parts/Person";
import { Car, Charger, Container, GuardHouse, Hedge, Tree, Truck } from "./parts/Scenery";
import VehicleItem, { ForkliftSprite } from "./parts/Vehicle";

export type Zone = "back" | "in" | "front";
// Something standing in the scene, depth-sorted by the floor point `at`.
export type SceneItem = { key: string; at: UV; node: ReactNode };

const center = ([u0, v0, W, D]: [number, number, number, number]): UV => [u0 + W / 2, v0 + D / 2];

// Objects behind the hall (u < 0 or v < 0), inside it, or in front of it (u > cols or v > rows).
export function zoneOf([u, v]: UV, { cols, rows }: FactoryLayout["hall"]): Zone {
  if (u < 0 || v < 0) return "back";
  if (u > cols || v > rows) return "front";
  return "in";
}

// Painter's algorithm within a zone: by u + v, ties keep insertion order.
export function depthSorted(items: SceneItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.at[0] + a.item.at[1] - (b.item.at[0] + b.item.at[1]) || a.index - b.index)
    .map(({ item }) => item);
}

// The tree belts beyond the roads, jittered the way generate_scene.py does with the same seed.
function beltTrees({ seed, from, to, spacing, jitter, scale, lines }: FactoryLayout["exterior"]["treeBelts"]) {
  const random = pythonRandom(seed);
  const trees: { at: UV; scale: number }[] = [];
  for (let k = from; k < to; k++) {
    for (const line of lines) {
      const along = k * spacing + random.uniform(-jitter, jitter);
      const across = (line.u ?? line.v!) + random.uniform(-jitter, jitter);
      trees.push({ at: line.u !== undefined ? [across, along] : [along, across], scale: random.uniform(scale[0], scale[1]) });
    }
  }
  return trees;
}

function objectItems(object: SceneObject, index: number, iso: Iso["iso"]): SceneItem[] {
  const key = `object${index}`;
  switch (object.type) {
    case "conveyor":
      return [{ key, at: object.sortAt ?? center(object.box), node: <Conveyor conveyor={object} /> }];
    case "rack": {
      const footprint: [number, number, number, number] = [...object.origin, ...object.size];
      return [{ key, at: object.sortAt ?? center(footprint), node: <Rack rack={object} /> }];
    }
    case "table":
      return [{ key, at: object.sortAt ?? center(object.box), node: <Table table={object} /> }];
    case "chargingForklift": {
      const [x, y] = iso(...object.at);
      return [
        {
          key,
          at: object.sortAt ?? object.at,
          node: (
            <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <ForkliftSprite loaded={false} />
            </g>
          ),
        },
      ];
    }
    default:
      // Each pallet of a row is sorted on its own.
      return Array.from({ length: object.count }, (_, slot) => ({
        key: `${key}-${slot}`,
        at: center(palletFootprint(object, slot)),
        node: <Pallet row={object} index={slot} />,
      }));
  }
}

// Everything that stands in the scene, in insertion order: scenery around the site first,
// then the hall's contents, people, vehicles and trucks.
export function sceneItems(layout: FactoryLayout, iso: Iso["iso"], onSelect: (id: string) => void): SceneItem[] {
  const { exterior } = layout;
  const items: SceneItem[] = [];

  beltTrees(exterior.treeBelts).forEach((tree, index) =>
    items.push({ key: `belt${index}`, at: tree.at, node: <Tree at={tree.at} scale={tree.scale} /> }),
  );
  exterior.trees.at.forEach((at, index) =>
    items.push({ key: `tree${index}`, at, node: <Tree at={at} scale={exterior.trees.scale} /> }),
  );
  exterior.hedges.forEach((box, index) => items.push({ key: `hedge${index}`, at: center(box), node: <Hedge box={box} /> }));

  const park = exterior.carPark;
  park.cars.forEach((slot, index) => {
    const at: UV = [park.rect[0] + 0.25 + slot * park.stallWidth, park.rect[1] + 0.2];
    items.push({ key: `car${index}`, at: center([...at, 0.36, 0.52]), node: <Car at={at} color={CARS[index % CARS.length]} /> });
  });

  const area = exterior.chargingArea;
  area.containers.forEach((container, index) =>
    items.push({
      key: `container${index}`,
      at: center([...container.at, 1.3, 0.8]),
      node: <Container at={container.at} z={container.z} color={CONTAINERS[container.color]} />,
    }),
  );
  for (let k = 0; k < area.bays.count; k++) {
    const u = area.bays.at[0] + k * area.bays.step;
    const parked: UV = [u + area.bays.size[0] / 2, area.bays.at[1] + area.bays.size[1] / 2];
    const [x, y] = iso(...parked);
    items.push({
      key: `bay${k}`,
      at: parked,
      node: (
        <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
          <ForkliftSprite loaded={false} />
        </g>
      ),
    });
    items.push({ key: `charger${k}`, at: [u + 0.25, area.bays.at[1] - 0.25], node: <Charger at={[u + 0.1, area.bays.at[1] - 0.3]} /> });
  }
  const guard = exterior.guardHouse.at;
  items.push({ key: "guard", at: center([...guard, 0.6, 0.6]), node: <GuardHouse at={guard} /> });

  layout.objects.forEach((object, index) => items.push(...objectItems(object, index, iso)));
  layout.people.forEach((person) =>
    items.push({ key: person.id, at: person.at, node: <PersonItem person={person} onSelect={onSelect} /> }),
  );
  layout.vehicles.forEach((vehicle) => {
    const mid = vehicle.route.reduce<UV>((sum, [u, v]) => [sum[0] + u / vehicle.route.length, sum[1] + v / vehicle.route.length], [0, 0]);
    items.push({ key: vehicle.id, at: vehicle.sortAt ?? mid, node: <VehicleItem vehicle={vehicle} onSelect={onSelect} /> });
  });
  exterior.trucks.forEach((truck, index) =>
    items.push({ key: `truck${index}`, at: center([...truck.trailer, 2.4, 1.0]), node: <Truck truck={truck} /> }),
  );
  return items;
}
