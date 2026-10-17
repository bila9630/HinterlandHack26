import { useMemo, useState } from "react";
import { Goods } from "../goods";
import { FacilityLayout } from "../layouts";
import { PlacedWorkstation } from "../workstations";
import { processMetrics } from "./metrics";
import { ProcessStep, Station, layoutStations, newStep, nextOptions, suggestedRoute } from "./model";
import { simulation } from "./simulation";
import { CardMode } from "./step-card/types";
import { useSimulation } from "./useSimulation";

export type ProcessProps = {
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
export type Card = { mode: CardMode; step: ProcessStep; isNew: boolean };

// Everything both process views share: derived data, step edits, the card and the simulation.
export function useProcess({
  layout,
  workstations,
  goods,
  activeGoodsId,
  onActiveGoodsChange,
  steps: allSteps,
  onStepsChange,
  onContinue,
}: ProcessProps) {
  const [card, setCard] = useState<Card | null>(null);
  const stations = useMemo(() => layoutStations(layout, workstations), [layout, workstations]);
  const stationById = useMemo(() => new Map(stations.map((station) => [station.id, station])), [stations]);
  // Steps whose workstation has since been removed drop out of the process.
  const steps = allSteps.filter((step) => stationById.has(step.stationId));
  const route = steps.map((step) => stationById.get(step.stationId)!);
  const last = route[route.length - 1];
  const forklifts = workstations.filter((item) => item.typeId === "forklift").length;
  const metrics = processMetrics(steps, route, forklifts);
  const simulated = simulation(metrics);
  const simulator = useSimulation(simulated.duration);
  const simState = simulator.sim ? simulated.state(simulator.sim.time) : null;
  const activeGoods = goods.find((item) => item.id === activeGoodsId) ?? goods[0];
  const cardIndex = card ? (card.isNew ? steps.length : steps.findIndex((step) => step.id === card.step.id)) : -1;

  function setSteps(next: ProcessStep[]) {
    onStepsChange(next);
    simulator.stop();
  }

  const replaceStep = (step: ProcessStep) => setSteps(steps.map((item) => (item.id === step.id ? step : item)));

  // Clicking a stop on the floor starts the next step there, or moves the draft to it.
  function pickStation(station: Station) {
    const step = newStep(station, last, true);
    if (card?.isNew) setCard({ ...card, step: { ...step, id: card.step.id } });
    else setCard({ mode: steps.length === 0 ? "workflows" : "form", step, isNew: true });
  }

  function saveCard(step: ProcessStep) {
    if (!card) return;
    if (card.isNew) setSteps([...steps, step]);
    else replaceStep(step);
    setCard(null);
  }

  function changeCard(step: ProcessStep) {
    if (!card) return;
    setCard((current) => current && { ...current, step });
    // Saved steps change straight away.
    if (card.mode === "edit") replaceStep(step);
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
    const step = newStep(station, last, false);
    setSteps([...steps, step]);
    return step;
  }

  function applySuggestion() {
    const suggested = suggestedRoute(stations);
    setSteps(suggested.map((station, index) => newStep(station, suggested[index - 1], true)));
    setCard(null);
  }

  function changeActiveGoods(id: string) {
    setCard(null);
    simulator.stop();
    onActiveGoodsChange(id);
  }

  return {
    layout,
    workstations,
    goods,
    activeGoodsId: activeGoods?.id ?? null,
    subtitle: activeGoods ? `${activeGoods.name} · one pallet through the hall` : "One pallet through the hall",
    stations,
    steps,
    route,
    metrics,
    // Simulating and the throughput figures need every step to have a task.
    ready: steps.length >= 2 && steps.every((step) => step.action) && metrics.bottleneck !== null,
    hasTimes: metrics.times.some((value) => value > 0),
    suggestion: suggestedRoute(stations),
    nextOptions: nextOptions(stations, last),

    card,
    cardIndex,
    selectedId: card && !card.isNew ? card.step.id : null,
    pickStation,
    openStep,
    saveCard,
    changeCard,
    setCardMode: (mode: CardMode) => setCard((current) => current && { ...current, mode }),
    closeCard: () => setCard(null),

    updateStep: (id: string, patch: Partial<ProcessStep>) =>
      setSteps(steps.map((step) => (step.id === id ? { ...step, ...patch } : step))),
    removeStep,
    appendStation,
    applySuggestion,
    changeActiveGoods,
    onContinue,

    simulator,
    sim: simulator.sim,
    simState,
    simDuration: simulated.duration,
  };
}

export type ProcessModel = ReturnType<typeof useProcess>;
