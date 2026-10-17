import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrthographicCamera, Vector3 } from "three";
import { ClockContext, SimClock } from "./clock";
import { Conveyor, FactoryLayout } from "./layout";
import { SelectionContext } from "./selection";
import { worldScale } from "./three/geometry";
import {
  ConveyorItems,
  LabelsContext,
  PersonItem,
  Scale,
  ScaleContext,
  StaticScene,
  StationLabel,
  Trees,
  VehicleItem,
} from "./three/parts";

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
};

// Advances the simulation clock once per frame, before anything reads it.
function Ticker({ clock }: { clock: SimClock }) {
  useFrame((_, delta) => clock.tick(Math.min(delta, 0.1)));
  return null;
}

// Starts the camera where the mockup's view is: the same angle, centred on the viewBox's
// centre and zoomed so the viewBox covers the canvas. Resizing keeps the user's own zoom.
function Framing({ layout, scale }: { layout: FactoryLayout; scale: Scale }) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const controls = useThree((state) => state.controls) as unknown as { target: Vector3; minZoom: number; maxZoom: number; update: () => void } | null;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { C, S, L, viewBox } = layout.camera;
  const fit = Math.max(width / viewBox[2], height / viewBox[3]);
  const lastFit = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!controls) return;
    // The ground point under the viewBox centre.
    const a = (viewBox[0] + viewBox[2] / 2) / (C * L);
    const b = (viewBox[1] + viewBox[3] / 2) / (S * L);
    const target = new Vector3((a + b) / 2, 0, (b - a) / 2);
    const away = new Vector3(
      Math.cos(scale.elevation) * Math.SQRT1_2,
      Math.sin(scale.elevation),
      Math.cos(scale.elevation) * Math.SQRT1_2,
    );
    camera.position.copy(target).addScaledVector(away, 60);
    controls.target.copy(target);
    controls.update();
  }, [camera, controls, C, S, L, viewBox, scale]);

  useLayoutEffect(() => {
    camera.zoom = lastFit.current ? (camera.zoom * fit) / lastFit.current : scale.zoom * fit;
    lastFit.current = fit;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.minZoom = scale.zoom * fit * 0.4;
      controls.maxZoom = scale.zoom * fit * 6;
    }
  }, [camera, controls, fit, scale]);

  return null;
}

// The hall in 3D, built from the same layout as the mockup: flat-coloured boxes that look
// like the mockup from its camera angle, and can be turned, panned and zoomed.
export default function FactoryScene3D({ layout, selectedId = null, onSelect, clock, paused = false, speed = 1 }: Props) {
  const ownClock = useMemo(() => new SimClock(), []);
  const sim = clock ?? ownClock;
  useEffect(() => {
    ownClock.paused = paused;
    ownClock.speed = speed;
  }, [ownClock, paused, speed]);

  const latestSelect = useRef(onSelect);
  useLayoutEffect(() => {
    latestSelect.current = onSelect;
  });
  const select = useMemo(() => (id: string | null) => latestSelect.current?.(id), []);

  const scale = useMemo(() => worldScale(layout.camera), [layout.camera]);
  const labels = useRef<HTMLDivElement>(null);
  const conveyors = layout.objects.filter((object): object is Conveyor => object.type === "conveyor");

  return (
    // select-none: dragging the camera would otherwise select the label text.
    <div className="relative isolate h-full w-full select-none" style={{ background: layout.exterior.groundColor }}>
      <Canvas
        orthographic
        flat
        dpr={[1, 2]}
        camera={{ position: [60, 40, 60], near: 0.1, far: 400 }}
        onPointerMissed={() => select(null)}
      >
        <ClockContext.Provider value={sim}>
          <ScaleContext.Provider value={scale}>
            <SelectionContext.Provider value={selectedId}>
              <LabelsContext.Provider value={labels}>
                <Ticker clock={sim} />
                <Framing layout={layout} scale={scale} />
                <StaticScene layout={layout} />
                <Trees layout={layout} />
                {conveyors.map((conveyor, index) => (
                  <ConveyorItems key={index} conveyor={conveyor} />
                ))}
                {layout.people.map((person) => (
                  <PersonItem key={person.id} person={person} onSelect={select} />
                ))}
                {layout.vehicles.map((vehicle) => (
                  <VehicleItem key={vehicle.id} vehicle={vehicle} onSelect={select} />
                ))}
                {layout.stations.map((station) => (
                  <StationLabel key={station.n} station={station} scale={layout.camera.labelScale} />
                ))}
              </LabelsContext.Provider>
            </SelectionContext.Provider>
          </ScaleContext.Provider>
        </ClockContext.Provider>
        {/* Turn between nearly top-down and a low view; pan along the ground. */}
        <OrbitControls makeDefault enableDamping screenSpacePanning={false} minPolarAngle={0.3} maxPolarAngle={1.3} />
      </Canvas>
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
