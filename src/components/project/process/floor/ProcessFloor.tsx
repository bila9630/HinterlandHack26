import { useState } from "react";
import { Workflow } from "lucide-react";
import LayoutScene from "../../LayoutScene";
import ProcessRoute from "../ProcessRoute";
import { useProcessContext } from "../ProcessContext";
import { minutesLabel, round1 } from "../metrics";
import { Station, TRANSPORTS, stationName, travelDistance } from "../model";
import StepCardHost from "../step-card/StepCard";
import { ContinueButton } from "../ui";
import StepList from "./StepList";

// The process built by clicking stops on the 3D floor, with the steps listed in a sidebar.
export default function ProcessFloor({ onShowFlow }: { onShowFlow: () => void }) {
  const { layout, workstations, stations, steps, route, metrics, hasTimes, subtitle } = useProcessContext();
  const { card, cardIndex, simState, pickStation, openStep } = useProcessContext();
  const [adding, setAdding] = useState(false);
  const draft = card?.isNew ? card : null;
  const draftStation = draft && stations.find((station) => station.id === draft.step.stationId);
  const shownRoute = draftStation ? [...route, draftStation] : route;
  const active = cardIndex >= 0 ? shownRoute[cardIndex] : undefined;
  const activeStep = draft?.step ?? steps[cardIndex];
  const activeLabel =
    active && activeStep
      ? cardIndex === 0
        ? `Start · ${stationName(active.kind)}`
        : `${cardIndex + 1} · ${activeStep.action || stationName(active.kind)}`
      : null;
  const previous = draftStation ? route[route.length - 1] : undefined;
  const legLabel =
    draft && previous && draftStation
      ? `${Math.round(travelDistance(previous, draftStation))} m · ${TRANSPORTS[draft.step.transport].name.toLowerCase()}`
      : null;

  function pick(station: Station) {
    setAdding(false);
    pickStation(station);
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
              onSelectStep={(index) => index < steps.length && openStep(index)}
              pallet={simState?.position ?? null}
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

          <StepList draft={draft} draftStation={draftStation} />

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
            <span className="text-[15px] font-bold">{hasTimes ? minutesLabel(round1(metrics.total)) : "—"}</span>
          </div>

          <ContinueButton className="mt-2 w-full" />

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
        <div className="relative z-10 order-3 m-4 lg:absolute lg:right-4 lg:bottom-4 lg:m-0 lg:w-[300px]">
          <StepCardHost />
        </div>
      )}
    </main>
  );
}
