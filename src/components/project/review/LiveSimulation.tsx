import { useMemo, useRef } from "react";
import { FacilityLayout } from "../layouts";
import LayoutScene from "../LayoutScene";
import { Staffing } from "../people";
import { ProcessStep } from "../process/model";
import { PlacedWorkstation } from "../workstations";
import LiveFloor, { LiveControl } from "./LiveFloor";
import { livePlan } from "./liveSim";

export type LiveSimulationProps = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  processes: ProcessStep[][];
  staffing: Staffing;
};

// One shift on the floor: forklifts and crews at work.
export default function LiveSimulation({ layout, workstations, processes, staffing }: LiveSimulationProps) {
  const plan = useMemo(
    () => livePlan(layout, workstations, processes, staffing),
    [layout, workstations, processes, staffing],
  );
  const control = useRef<LiveControl>({ time: 0, moving: 0 });

  if (plan.stops.length === 0) return null;

  return (
    <main className="relative h-[60vh] bg-[#e0e7f3] lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <LayoutScene
        layout={layout}
        showLabels={false}
        quiet
        // The live floor draws the forklifts, on the move.
        workstations={plan.placed.filter((item) => item.typeId !== "forklift")}
        overlay={() => <LiveFloor plan={plan} control={control} />}
      />
    </main>
  );
}
