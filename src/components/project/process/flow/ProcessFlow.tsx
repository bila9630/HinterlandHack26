import { useState } from "react";
import { useProcessContext } from "../ProcessContext";
import StepCardHost from "../step-card/StepCard";
import FlowBuilder from "./FlowBuilder";
import FlowHeader from "./FlowHeader";
import MetricsPanel from "./MetricsPanel";
import RouteMiniMap from "./RouteMiniMap";
import SimulatorPanel from "./SimulatorPanel";
import SuggestionBanner from "./SuggestionBanner";

// The process as a left-to-right flow of steps, with its figures and a simulation.
export default function ProcessFlow({ onOpen3D }: { onOpen3D: () => void }) {
  const { card, sim, simulator } = useProcessContext();
  // The step whose incoming leg has its transport picker open; the minimap follows it too.
  const [transportFor, setTransportFor] = useState<string | null>(null);

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#f1f5fb] px-4 py-6 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <FlowHeader
          onSimulate={() => {
            setTransportFor(null);
            simulator.start();
          }}
        />
        <SuggestionBanner />
        {sim ? <SimulatorPanel /> : <FlowBuilder transportFor={transportFor} onTransportFor={setTransportFor} />}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          <MetricsPanel />
          <RouteMiniMap transportFor={transportFor} onOpen3D={onOpen3D} />
        </div>
      </div>

      {card && (
        <div className="fixed right-6 bottom-6 z-30 w-[300px]">
          <StepCardHost />
        </div>
      )}
    </main>
  );
}
