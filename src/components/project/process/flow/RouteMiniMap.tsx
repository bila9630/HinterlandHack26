import LayoutScene from "../../LayoutScene";
import ProcessRoute from "../ProcessRoute";
import { useProcessContext } from "../ProcessContext";
import { stationName } from "../model";
import { Card } from "../ui";

type Props = {
  // The step whose transport is being chosen, if any.
  transportFor: string | null;
  onOpen3D: () => void;
};

// A small top-down view of the route, following the simulated pallet or the step being looked at.
export default function RouteMiniMap({ transportFor, onOpen3D }: Props) {
  const { layout, workstations, stations, steps, route, metrics, selectedId, sim, simState } = useProcessContext();
  const position = simState?.position ?? null;
  const selectedIndex = steps.findIndex((step) => step.id === selectedId);
  const transportIndex = transportFor ? steps.findIndex((step) => step.id === transportFor) : -1;

  function caption() {
    if (sim) {
      if (!position) return "Waiting for the next pallet";
      if (position.at === "leg") return `Pallet moving from ${position.index} → ${position.index + 1} · amber = bottleneck`;
      return `Pallet at ${position.index + 1} · ${stationName(route[position.index].kind)}`;
    }
    if (transportIndex > 0) return `Connecting ${transportIndex} → ${transportIndex + 1} · choose how the pallet moves`;
    if (steps.length === 0) return "No route yet · stops are numbered as you add them";
    if (steps.length === 1) return "Start set at 1 · pick the next workstation";
    return `${steps.length} stops · ${Math.round(metrics.distance)} m between them`;
  }

  // The highlighted stop: where the pallet is handled, else the open step, else the leg being connected.
  const active =
    position?.at === "step"
      ? position.index
      : selectedIndex >= 0
        ? selectedIndex
        : transportIndex >= 0
          ? transportIndex
          : null;

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-bold">Route on the floor</h2>
        <button type="button" onClick={onOpen3D} className="cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-700">
          Open 3D →
        </button>
      </div>
      <div className="mt-3 h-[230px] overflow-hidden rounded-xl bg-[#eef2f9]">
        <LayoutScene
          layout={layout}
          quiet
          scenery={false}
          workstations={workstations}
          overlay={(labels) => (
            <ProcessRoute labels={labels} stations={stations} route={route} activeIndex={active} pallet={position} compact />
          )}
        />
      </div>
      <p className="mt-2 text-[10px] text-slate-500">{caption()}</p>
    </Card>
  );
}
