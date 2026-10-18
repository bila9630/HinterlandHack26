import { useMemo, useState } from "react";
import { FacilityLayout } from "../layouts";
import { Staffing } from "../people";
import { ProcessStep } from "../process/model";
import { PlacedWorkstation } from "../workstations";
import FactoryScene3D from "./factory/FactoryScene3D";
import HeadcountCard from "./factory/HeadcountCard";
import PersonCard from "./factory/PersonCard";
import SuggestionsCard from "./factory/SuggestionsCard";
import VehicleCard from "./factory/VehicleCard";
import { livePlan } from "./liveSim";
import { reviewLayout } from "./reviewScene";

export type LiveSimulationProps = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  processes: ProcessStep[][];
  staffing: Staffing;
};

// One shift on the floor, drawn as the factory scene: the hall and its site, the crews at
// work and the forklifts on their rounds. Clicking a person or vehicle opens its card, and
// the AI suggestions point at whoever they are about.
export default function LiveSimulation({ layout, workstations, processes, staffing }: LiveSimulationProps) {
  const plan = useMemo(
    () => livePlan(layout, workstations, processes, staffing),
    [layout, workstations, processes, staffing],
  );
  const scene = useMemo(() => reviewLayout(layout, plan), [layout, plan]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  if (plan.stops.length === 0) return null;

  const vehicle = scene.vehicles.find((item) => item.id === selectedId);
  const person = scene.people.find((item) => item.id === selectedId);
  const select = (id: string | null) => {
    setSelectedId(id);
    setFollowing(false);
  };
  const card = { following, onFollow: () => setFollowing(!following), onClose: () => select(null) };

  return (
    <main className="relative h-[calc(100vh-3rem)] overflow-hidden">
      <FactoryScene3D
        layout={scene}
        selectedId={selectedId}
        onSelect={select}
        followId={following ? selectedId : null}
      />
      <div className="absolute top-4 left-4">
        <HeadcountCard layout={scene} />
      </div>
      {scene.suggestions.length > 0 && (
        <div className="absolute bottom-4 left-4">
          <SuggestionsCard
            suggestions={scene.suggestions}
            // Until suggestions can be simulated, trying one shows who or what it is about.
            onTry={({ target }) => {
              if (!target) return;
              setSelectedId(target);
              setFollowing(true);
            }}
          />
        </div>
      )}
      {(vehicle || person) && (
        <div className="absolute top-4 right-4">
          {vehicle ? <VehicleCard {...card} vehicle={vehicle} /> : person && <PersonCard {...card} person={person} />}
        </div>
      )}
    </main>
  );
}
