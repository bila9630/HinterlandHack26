import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ClockContext, SimClock, useAnimationFrames } from "./clock";
import { createIso } from "./iso";
import { FactoryLayout } from "./layout";
import { IsoContext, SelectionContext } from "./parts/common";
import Floor from "./parts/Floor";
import Label from "./parts/Label";
import { PersonTag, VehicleTag } from "./parts/Selection";
import Wall from "./parts/Wall";
import { SceneItem, Zone, depthSorted, sceneItems, zoneOf } from "./scene";

type Props = {
  layout: FactoryLayout;
  // The selected person or vehicle.
  selectedId?: string | null;
  // Called with a person's or vehicle's id when it is clicked, and with null for the background.
  onSelect?: (id: string | null) => void;
  // A clock to read and control from outside (the scene still ticks it every frame);
  // otherwise the scene runs its own, set by `paused` and `speed`.
  clock?: SimClock;
  paused?: boolean;
  speed?: number;
  className?: string;
};

// The hall as a 2.5D isometric SVG, ported from the F8.1.2 mockup: the site and floor, then
// objects behind the hall, the back walls, what's inside, the low front walls, what's in
// front, and the station labels on top. It fills its container edge to edge.
export default function FactoryScene({ layout, selectedId = null, onSelect, clock, paused = false, speed = 1, className }: Props) {
  const ownClock = useMemo(() => new SimClock(), []);
  const sim = clock ?? ownClock;
  useAnimationFrames(sim);
  useEffect(() => {
    ownClock.paused = paused;
    ownClock.speed = speed;
  }, [ownClock, paused, speed]);

  const latestSelect = useRef(onSelect);
  useLayoutEffect(() => {
    latestSelect.current = onSelect;
  });
  const select = useCallback((id: string | null) => latestSelect.current?.(id), []);

  const projection = useMemo(() => createIso(layout.camera), [layout.camera]);
  const { hall, camera } = layout;

  // Everything below is static apart from what moves itself on the clock, so it is built once per layout.
  const scene = useMemo(() => {
    const zones: Record<Zone, SceneItem[]> = { back: [], in: [], front: [] };
    sceneItems(layout, projection.iso, select).forEach((item) => zones[zoneOf(item.at, hall)].push(item));
    const draw = (zone: Zone) => depthSorted(zones[zone]).map((item) => <g key={item.key}>{item.node}</g>);
    const wall = (axis: "u" | "v", fix: number) => (
      <Wall
        key={`${axis}=${fix}`}
        axis={axis}
        fix={fix}
        from={0}
        to={axis === "u" ? hall.rows : hall.cols}
        height={hall.wallHeight}
        docks={layout.docks.filter((dock) => dock.wall === `${axis}=${fix}`)}
      />
    );
    return (
      <>
        <Floor layout={layout} />
        {draw("back")}
        {wall("u", 0)}
        {wall("v", 0)}
        {draw("in")}
        {wall("u", hall.cols)}
        {wall("v", hall.rows)}
        {draw("front")}
        {layout.stations.map((station) => (
          <Label key={station.n} station={station} scale={camera.labelScale} />
        ))}
      </>
    );
  }, [layout, projection, select, hall, camera.labelScale]);

  const selectedVehicle = layout.vehicles.find((vehicle) => vehicle.id === selectedId);
  const selectedPerson = layout.people.find((person) => person.id === selectedId);

  return (
    <IsoContext.Provider value={projection}>
      <ClockContext.Provider value={sim}>
        <SelectionContext.Provider value={selectedId}>
          <svg
            viewBox={camera.viewBox.join(" ")}
            preserveAspectRatio={camera.preserveAspectRatio}
            role="group"
            aria-label="Live view of the hall with its yard, car park and trucks"
            className={className ?? "block h-full w-full select-none"}
            style={{ background: layout.exterior.groundColor }}
            onClick={() => select(null)}
          >
            {scene}
            {selectedVehicle && <VehicleTag vehicle={selectedVehicle} />}
            {selectedPerson && <PersonTag person={selectedPerson} />}
          </svg>
        </SelectionContext.Provider>
      </ClockContext.Provider>
    </IsoContext.Provider>
  );
}
