import { useMemo, useState } from "react";
import { FacilityLayout } from "../layouts";
import { Staffing } from "../people";
import { ProcessStep } from "../process/model";
import { PlacedWorkstation } from "../workstations";
import FactoryScene3D from "./factory/FactoryScene3D";
import { livePlan } from "./liveSim";
import { reviewLayout } from "./reviewScene";

export type LiveSimulationProps = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  processes: ProcessStep[][];
  staffing: Staffing;
};

// One shift on the floor, drawn as the factory scene: the hall and its site, the crews at
// work and the forklifts on their rounds. People and vehicles can be clicked.
export default function LiveSimulation({ layout, workstations, processes, staffing }: LiveSimulationProps) {
  const plan = useMemo(
    () => livePlan(layout, workstations, processes, staffing),
    [layout, workstations, processes, staffing],
  );
  const scene = useMemo(() => reviewLayout(layout, plan), [layout, plan]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (plan.stops.length === 0) return null;

  return (
    <main className="relative h-[calc(100vh-3rem)] overflow-hidden">
      <FactoryScene3D layout={scene} selectedId={selectedId} onSelect={setSelectedId} />
    </main>
  );
}
