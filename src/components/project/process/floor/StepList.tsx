import { Route } from "lucide-react";
import { useProcessContext } from "../ProcessContext";
import { minutesLabel } from "../metrics";
import { EQUIPMENT, Station, stationName } from "../model";
import { Card } from "../useProcess";

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

type Props = {
  // The new step being drafted, and where it is.
  draft: Card | null;
  draftStation: Station | null | undefined;
};

// The sidebar's list of steps, with the draft at the end and hints while the list is empty.
export default function StepList({ draft, draftStation }: Props) {
  const { steps, route, cardIndex, openStep } = useProcessContext();

  return (
    <>
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
            const selected = !draft && index === cardIndex;
            const extra = step.equipment !== "none" ? ` · ${EQUIPMENT[step.equipment].toLowerCase()}` : "";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => openStep(index)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                    selected ? "border-blue-600 bg-blue-50/70" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <StepNumber number={index + 1} filled={selected} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">{step.action || "No task yet"}</span>
                    <span className="block truncate text-[9px] text-slate-500">
                      {stationName(route[index].kind)}
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
                <span className="block truncate text-[9px] text-slate-500">{stationName(draftStation.kind)}</span>
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
    </>
  );
}
