import { useState } from "react";
import FactoryScene from "@/components/project/review/factory/FactoryScene";
import FactoryScene3D from "@/components/project/review/factory/FactoryScene3D";
import HeadcountCard from "@/components/project/review/factory/HeadcountCard";
import { factoryLayout } from "@/components/project/review/factory/layout";
import PersonCard from "@/components/project/review/factory/PersonCard";
import SuggestionsCard from "@/components/project/review/factory/SuggestionsCard";
import VehicleCard from "@/components/project/review/factory/VehicleCard";

// Dev only: the factory scene full-screen, in 3D or as the SVG port.
export default function FactorySceneDev() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"3D" | "SVG">("3D");
  const [following, setFollowing] = useState(false);
  const vehicle = factoryLayout.vehicles.find((item) => item.id === selectedId);
  const person = factoryLayout.people.find((item) => item.id === selectedId);
  const select = (id: string | null) => {
    setSelectedId(id);
    setFollowing(false);
  };
  const scene = { layout: factoryLayout, selectedId, onSelect: select };
  const card = {
    following,
    onFollow: () => setFollowing(view === "3D" && !following),
    onClose: () => select(null),
  };
  const selected =
    factoryLayout.people.find((person) => person.id === selectedId)?.name ??
    factoryLayout.vehicles.find((vehicle) => vehicle.id === selectedId)?.id;

  return (
    <div className="fixed inset-0 z-50 bg-[#C6E3B8]">
      {view === "3D" ? (
        <FactoryScene3D {...scene} followId={following ? selectedId : null} />
      ) : (
        <FactoryScene {...scene} />
      )}
      <div className="absolute top-4 left-4">
        <HeadcountCard layout={factoryLayout} />
      </div>
      <div className="absolute bottom-4 left-4">
        <SuggestionsCard
          suggestions={factoryLayout.suggestions}
          // Until suggestions can be simulated, trying one shows who or what it is about.
          onTry={({ target }) => {
            if (!target) return;
            setSelectedId(target);
            setFollowing(view === "3D");
          }}
        />
      </div>
      {(vehicle || person) && (
        <div className="absolute top-4 right-4">
          {/* Following moves the 3D camera; the SVG view has a fixed one. */}
          {vehicle ? (
            <VehicleCard {...card} vehicle={vehicle} />
          ) : (
            person && <PersonCard {...card} person={person} />
          )}
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
        <span className="px-2 text-slate-500">{selected ? `Selected: ${selected}` : "Click a person or vehicle"}</span>
      </div>
    </div>
  );
}
