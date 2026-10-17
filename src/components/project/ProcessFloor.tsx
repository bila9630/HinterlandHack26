import { ReactNode, useState } from "react";
import { Route, Workflow } from "lucide-react";
import { FacilityLayout } from "./layouts";
import LayoutScene from "./LayoutScene";
import ProcessRoute from "./ProcessRoute";
import { EQUIPMENT, Metrics, PalletPosition, ProcessStep, Station, TRANSPORTS, minutesLabel, stationInfo, stepMinutes, travelDistance } from "./process";
import { PlacedWorkstation } from "./workstations";

type Props = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  stations: Station[];
  steps: ProcessStep[];
  route: Station[];
  metrics: Metrics;
  subtitle: string;
  card: ReactNode;
  // Index of the step in the card (the draft is one past the last step), or -1.
  cardIndex: number;
  draft: { mode: string; step: ProcessStep } | null;
  pallet: PalletPosition | null;
  onPickStation: (station: Station) => void;
  onOpenStep: (index: number) => void;
  onShowFlow: () => void;
  onContinue: () => void;
};

function StepNumber({ number, filled }: { number: number; filled: boolean }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 text-[11px] font-bold ${
        filled ? "bg-blue-600 text-white" : "bg-white text-blue-600"
      }`}
    >
      {number}
    </span>
  );
}

export default function ProcessFloor({
  layout,
  workstations,
  stations,
  steps,
  route,
  metrics,
  subtitle,
  card,
  cardIndex,
  draft,
  pallet,
  onPickStation,
  onOpenStep,
  onShowFlow,
  onContinue,
}: Props) {
  const [adding, setAdding] = useState(false);
  const draftStation = draft && stations.find((station) => station.id === draft.step.stationId);
  const shownRoute = draftStation ? [...route, draftStation] : route;
  const active = cardIndex >= 0 ? shownRoute[cardIndex] : undefined;
  const activeStep = draft?.step ?? steps[cardIndex];
  const activeLabel =
    active && activeStep
      ? cardIndex === 0
        ? `Start · ${stationInfo(active.kind).name}`
        : `${cardIndex + 1} · ${activeStep.action || stationInfo(active.kind).name}`
      : null;
  const previous = draftStation ? route[route.length - 1] : undefined;
  const legLabel =
    draft && previous && draftStation
      ? `${Math.round(travelDistance(previous, draftStation))} m · ${TRANSPORTS[draft.step.transport].name.toLowerCase()}`
      : null;

  function pick(station: Station) {
    setAdding(false);
    onPickStation(station);
  }

  return (
    <main className="relative flex flex-col bg-[#e0e7f3] lg:block lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <div className="relative order-2 h-[60vh] lg:absolute lg:inset-0 lg:left-[220px] lg:h-auto">
        <LayoutScene
          layout={layout}
          showLabels={false}
          quiet
          workstations={workstations}
          onSelectWorkstation={(id) => {
            const station = stations.find((item) => item.id === id);
            if (station) pick(station);
          }}
          overlay={(labels) => (
            <ProcessRoute
              labels={labels}
              stations={stations}
              route={shownRoute}
              activeIndex={cardIndex >= 0 ? cardIndex : null}
              activeLabel={activeLabel}
              legLabel={legLabel}
              showMarkers={cardIndex < 0 || Boolean(draft)}
              onSelectStation={pick}
              onSelectStep={(index) => index < steps.length && onOpenStep(index)}
              pallet={pallet}
            />
          )}
        />
        {steps.length === 0 && !draft ? (
          <p className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-md">
            Click a workstation to start your process
          </p>
        ) : (
          (draft || adding) && (
            <p className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-lg border border-dashed border-blue-600 bg-white px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-slate-900 shadow-sm">
              Click a workstation to add a step
            </p>
          )
        )}
      </div>

      <div className="relative z-10 order-1 m-4 lg:absolute lg:top-4 lg:left-4 lg:m-0 lg:w-[264px]">
        <section className="flex max-h-[calc(100vh-5rem)] flex-col rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
          <h1 className="text-[15px] font-bold tracking-tight">Process</h1>
          <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>

          {steps.length === 0 && !draft && (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
              <span className="mx-auto flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Route className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-2 text-[12px] font-semibold">No steps yet</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Describe how one pallet moves through the hall. Start by clicking the workstation where goods arrive.
              </p>
            </div>
          )}

          {(steps.length > 0 || draft) && (
            <ol className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {steps.map((step, index) => {
                const station = route[index];
                const selected = !draft && index === cardIndex;
                const extra = step.equipment !== "none" ? ` · ${EQUIPMENT[step.equipment].toLowerCase()}` : "";
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => onOpenStep(index)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                        selected ? "border-blue-600 bg-blue-50/70" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <StepNumber number={index + 1} filled={selected} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold">{step.action || "No task yet"}</span>
                        <span className="block truncate text-[9px] text-slate-500">
                          {stationInfo(station.kind).name}
                          {extra}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-700">
                        {step.action ? `${minutesLabel(step.minutes)} / ${step.basis}` : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {draft && draftStation && (
                <li className="flex items-center gap-2.5 rounded-xl border border-dashed border-blue-600 bg-blue-50/70 px-2.5 py-2">
                  <StepNumber number={steps.length + 1} filled />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">
                      {draft.mode === "workflows" ? "Choose a workflow…" : draft.step.action || "New step"}
                    </span>
                    <span className="block truncate text-[9px] text-slate-500">{stationInfo(draftStation.kind).name}</span>
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">Draft</span>
                </li>
              )}
            </ol>
          )}

          {steps.length === 0 && draft && (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold">Your first step</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Click the workstation where goods arrive. Every next click adds the next step.
              </p>
            </div>
          )}

          {steps.length > 0 && !draft && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-dashed border-slate-300 py-2 text-[11px] font-semibold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50/40"
            >
              + Add step
            </button>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-600">Total per pallet</span>
            <span className="text-[15px] font-bold">
              {steps.some((step) => stepMinutes(step) > 0) ? minutesLabel(Math.round(metrics.total * 10) / 10) : "—"}
            </span>
          </div>

          <button
            type="button"
            disabled={steps.length < 2}
            onClick={onContinue}
            className="mt-2 w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Continue to people →
          </button>

          <div className="my-3 flex items-center gap-2 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={onShowFlow}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
          >
            <Workflow className="size-3.5 text-blue-600" aria-hidden="true" />
            Flow view
          </button>
        </section>
      </div>

      {card && (
        <div className="relative z-10 order-3 m-4 lg:absolute lg:right-4 lg:bottom-4 lg:m-0 lg:w-[300px]">{card}</div>
      )}
    </main>
  );
}
