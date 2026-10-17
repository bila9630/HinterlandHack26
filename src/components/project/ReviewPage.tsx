import LiveSimulation, { LiveSimulationProps } from "./review/LiveSimulation";

// The live simulation needs the floor and process from the earlier steps.
type Props = { live?: LiveSimulationProps };

export default function ReviewPage({ live }: Props) {
  if (!live) {
    return (
      <main className="flex h-[calc(100vh-3rem)] items-center justify-center text-[12px] text-slate-500">
        Choose an example layout to see the live simulation.
      </main>
    );
  }
  return <LiveSimulation {...live} />;
}
