import { useEffect, useMemo, useState } from "react";
import { Goods } from "./goods";
import { FacilityLayout } from "./layouts";
import ProcessFloor from "./ProcessFloor";
import ProcessFlow from "./ProcessFlow";
import StepCard, { CardMode } from "./StepCard";
import {
  ProcessStep,
  Station,
  layoutStations,
  newStep,
  processMetrics,
  simulation,
  suggestedRoute,
  travelDistance,
} from "./process";
import { PlacedWorkstation } from "./workstations";

type Props = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  goods: Goods[];
  // Each kind of goods has its own process; the active one is shown.
  activeGoodsId: string | null;
  onActiveGoodsChange: (id: string) => void;
  steps: ProcessStep[];
  onStepsChange: (steps: ProcessStep[]) => void;
  onContinue: () => void;
};

// The step being drafted (new) or looked at (saved) in the floating card.
type Card = { mode: CardMode; step: ProcessStep; isNew: boolean };

export type Simulation = { time: number; playing: boolean; speed: number };

// Simulated minutes per real second at 1× speed.
const SIM_RATE = 1 / 6;

export default function ProcessPage({
  layout,
  workstations,
  goods,
  activeGoodsId,
  onActiveGoodsChange,
  steps: allSteps,
  onStepsChange,
  onContinue,
}: Props) {
  const [view, setView] = useState<"floor" | "flow">("floor");
  const [card, setCard] = useState<Card | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const stations = useMemo(() => layoutStations(layout, workstations), [layout, workstations]);
  const stationById = (id: string) => stations.find((station) => station.id === id);
  // Steps whose workstation has since been removed drop out of the process.
  const steps = allSteps.filter((step) => stationById(step.stationId));
  const route = steps.map((step) => stationById(step.stationId)!);
  const forklifts = workstations.filter((item) => item.typeId === "forklift").length;
  const metrics = processMetrics(steps, route, forklifts);
  const simulated = simulation(metrics);
  const simState = sim ? simulated.state(sim.time) : null;
  const activeGoods = goods.find((item) => item.id === activeGoodsId) ?? goods[0];
  const subtitle = activeGoods ? `${activeGoods.name} · one pallet through the hall` : "One pallet through the hall";

  const duration = simulated.duration;

  // Advance the simulation clock while it plays.
  useEffect(() => {
    if (!sim?.playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - last) / 1000;
      last = now;
      setSim((current) => {
        if (!current) return current;
        const time = Math.min(current.time + elapsed * current.speed * SIM_RATE, duration);
        return { ...current, time, playing: time < duration };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sim?.playing, duration]);

  function setSteps(next: ProcessStep[]) {
    onStepsChange(next);
    setSim(null);
  }

  const cardIndex = card ? (card.isNew ? steps.length : steps.findIndex((step) => step.id === card.step.id)) : -1;

  // Clicking a stop on the floor starts the next step there, or moves the draft to it.
  function pickStation(station: Station) {
    if (card?.isNew) {
      const previous = route[route.length - 1];
      const fresh = newStep(station, previous, true);
      setCard({ ...card, step: { ...fresh, id: card.step.id } });
      return;
    }
    const step = newStep(station, route[route.length - 1], true);
    setCard({ mode: steps.length === 0 ? "workflows" : "form", step, isNew: true });
  }

  function saveCard(step: ProcessStep) {
    if (!card) return;
    setSteps(card.isNew ? [...steps, step] : steps.map((item) => (item.id === step.id ? step : item)));
    setCard(null);
  }

  function changeCard(step: ProcessStep) {
    if (!card) return;
    setCard((current) => current && { ...current, step });
    // Saved steps change straight away.
    if (card.mode === "edit") setSteps(steps.map((item) => (item.id === step.id ? step : item)));
  }

  function openStep(index: number) {
    const step = steps[index];
    setCard({ mode: step.action ? "edit" : "workflows", step, isNew: false });
  }

  function removeStep(id: string) {
    setSteps(steps.filter((step) => step.id !== id));
    if (card?.step.id === id) setCard(null);
  }

  // From the flow view: a stop joins without a task, which is chosen afterwards.
  function appendStation(station: Station) {
    const step = newStep(station, route[route.length - 1], false);
    setSteps([...steps, step]);
    return step;
  }

  function applySuggestion() {
    const suggested = suggestedRoute(stations);
    setSteps(suggested.map((station, index) => newStep(station, suggested[index - 1], true)));
    setCard(null);
  }

  // Nearest stops of each kind from the end of the route, for choosing the next one.
  function nextOptions() {
    const last = route[route.length - 1];
    const byKind = new Map<string, Station>();
    for (const station of stations) {
      if (station.id === last?.id) continue;
      const best = byKind.get(station.kind);
      if (!best || (last && travelDistance(last, station) < travelDistance(last, best))) byKind.set(station.kind, station);
    }
    return [...byKind.values()]
      .map((station) => ({ station, distance: last ? Math.round(travelDistance(last, station)) : 0 }))
      .sort((a, b) => a.distance - b.distance);
  }

  const cardElement = card && (
    <StepCard
      key={`${card.step.id}-${card.mode}`}
      mode={card.mode}
      step={card.step}
      number={cardIndex + 1}
      isNew={card.isNew}
      stations={stations}
      previous={cardIndex > 0 ? route[cardIndex - 1] : undefined}
      onChange={changeCard}
      onMode={(mode) => setCard((current) => current && { ...current, mode })}
      onSave={saveCard}
      onCancel={() => setCard(null)}
      onRemove={card.isNew ? undefined : () => removeStep(card.step.id)}
    />
  );

  const shared = { layout, workstations, stations, steps, route, metrics, subtitle, card: cardElement, onContinue };

  if (view === "flow") {
    return (
      <ProcessFlow
        {...shared}
        selectedId={card && !card.isNew ? card.step.id : null}
        goods={goods}
        activeGoodsId={activeGoods?.id ?? null}
        onActiveGoodsChange={(id) => {
          setCard(null);
          setSim(null);
          onActiveGoodsChange(id);
        }}
        suggestion={suggestedRoute(stations)}
        onUseSuggestion={applySuggestion}
        nextOptions={nextOptions()}
        onAppend={appendStation}
        onOpenStep={openStep}
        onRemove={removeStep}
        onTransport={(id, transport) => setSteps(steps.map((step) => (step.id === id ? { ...step, transport } : step)))}
        sim={sim}
        simState={simState}
        simDuration={simulated.duration}
        onSim={setSim}
        onOpen3D={() => {
          setCard(null);
          setView("floor");
        }}
      />
    );
  }

  return (
    <ProcessFloor
      {...shared}
      cardIndex={cardIndex}
      draft={card?.isNew ? card : null}
      pallet={simState?.position ?? null}
      onPickStation={pickStation}
      onOpenStep={openStep}
      onShowFlow={() => {
        setCard(null);
        setView("flow");
      }}
    />
  );
}
