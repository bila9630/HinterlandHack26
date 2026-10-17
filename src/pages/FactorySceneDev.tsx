import { useState } from "react";
import FactoryScene from "@/components/project/review/factory/FactoryScene";
import FactoryScene3D from "@/components/project/review/factory/FactoryScene3D";
import { factoryLayout } from "@/components/project/review/factory/layout";
import VehicleCard from "@/components/project/review/factory/VehicleCard";

// The mockup's scene, served from the handoff folder by the dev server.
const REFERENCE = "/design/factory-scene-handoff/scene.svg";
const SPEEDS = [0.5, 1, 2, 4];

// Dev only: the factory scene full-screen, in 3D or as the SVG port, optionally next to the
// mockup it was ported from.
export default function FactorySceneDev() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState<"3D" | "SVG">("3D");
  const [following, setFollowing] = useState(false);
  const vehicle = factoryLayout.vehicles.find((item) => item.id === selectedId);
  const select = (id: string | null) => {
    setSelectedId(id);
    setFollowing(false);
  };
  const scene = { layout: factoryLayout, selectedId, onSelect: select, paused, speed };
  const selected =
    factoryLayout.people.find((person) => person.id === selectedId)?.name ??
    factoryLayout.vehicles.find((vehicle) => vehicle.id === selectedId)?.id;

  return (
    <div className="fixed inset-0 z-50 flex bg-[#C6E3B8]">
      <div className="relative min-w-0 flex-1">
        {view === "3D" ? (
          <FactoryScene3D {...scene} followId={following ? selectedId : null} />
        ) : (
          <FactoryScene {...scene} />
        )}
        {compare && <Tag>{view === "3D" ? "FactoryScene3D" : "FactoryScene (SVG)"}</Tag>}
        {vehicle && (
          <div className="absolute top-4 right-4">
            <VehicleCard
              vehicle={vehicle}
              // Following moves the 3D camera; the SVG view has a fixed one.
              following={following}
              onFollow={() => setFollowing(view === "3D" && !following)}
              onClose={() => select(null)}
            />
          </div>
        )}
      </div>
      {compare && (
        <div className="relative min-w-0 flex-1 border-l-2 border-white">
          <img src={REFERENCE} alt="Reference mockup" className="block h-full w-full" />
          <Tag>scene.svg (reference)</Tag>
        </div>
      )}
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-xl bg-white/95 p-1.5 text-[12px] font-semibold text-slate-700 shadow-lg">
        {(["3D", "SVG"] as const).map((value) => (
          <button
            key={value}
            className={`rounded-lg px-2 py-1 ${view === value ? "bg-slate-800 text-white" : "hover:bg-slate-100"}`}
            onClick={() => setView(value)}
          >
            {value}
          </button>
        ))}
        <button className="rounded-lg px-2.5 py-1 hover:bg-slate-100" onClick={() => setPaused(!paused)}>
          {paused ? "Play" : "Pause"}
        </button>
        {SPEEDS.map((value) => (
          <button
            key={value}
            className={`rounded-lg px-2 py-1 ${speed === value ? "bg-blue-600 text-white" : "hover:bg-slate-100"}`}
            onClick={() => setSpeed(value)}
          >
            {value}×
          </button>
        ))}
        <button
          className={`rounded-lg px-2.5 py-1 ${compare ? "bg-blue-600 text-white" : "hover:bg-slate-100"}`}
          onClick={() => setCompare(!compare)}
        >
          Compare
        </button>
        <span className="px-2 text-slate-500">{selected ? `Selected: ${selected}` : "Click a person or vehicle"}</span>
      </div>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="absolute top-3 left-3 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-slate-700 shadow">
      {children}
    </span>
  );
}
