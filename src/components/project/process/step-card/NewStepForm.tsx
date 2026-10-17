import { STATION_DEFAULTS, defaultTransport, stationName, travelDistance } from "../model";
import { ActionSelect, CARD_CLASS, CardHeader, Field, NumberInput, StationSelect, TransportSelect, inputClass } from "./fields";
import { StepFormProps } from "./types";

// A step described by hand: where, what and how long. Nothing changes until it is saved.
export default function NewStepForm({
  step,
  number,
  isNew,
  stations,
  previous,
  station,
  kicker,
  distance,
  onChange,
  onMode,
  onSave,
  onCancel,
}: StepFormProps) {
  // Moving the step to another stop keeps its action only when that stop offers it too.
  function moveTo(id: string) {
    const next = stations.find((item) => item.id === id)!;
    const defaults = STATION_DEFAULTS[next.kind];
    const keepAction = defaults.actions.includes(step.action);
    onChange({
      ...step,
      stationId: id,
      ...(keepAction
        ? {}
        : { action: defaults.action, basis: defaults.basis, minutes: defaults.minutes, equipment: defaults.equipment }),
      transport: defaultTransport(previous ? travelDistance(previous, next) : 0),
      subtasks: [],
    });
  }

  return (
    <section className={CARD_CLASS}>
      <CardHeader number={number} kicker={kicker} title={isNew ? "New step" : step.action || "Add task"} />
      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
        {previous ? (
          <>
            <Field label="From">
              <span className={`${inputClass} block truncate bg-slate-50 text-slate-700`}>{stationName(previous.kind)}</span>
            </Field>
            <StationSelect label="To" value={step.stationId} stations={stations} onChange={moveTo} />
            <ActionSelect step={step} kind={station.kind} onChange={onChange} />
            <TransportSelect step={step} onChange={onChange} />
            <Field label="Distance">
              <span className={`${inputClass} block bg-slate-50 text-slate-700`}>{distance} m · auto</span>
            </Field>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <StationSelect label="Workstation" value={step.stationId} stations={stations} onChange={moveTo} />
            </div>
            <div className="col-span-2">
              <ActionSelect step={step} kind={station.kind} onChange={onChange} />
            </div>
          </>
        )}
        <Field label="Time / pallet">
          <NumberInput
            value={step.minutes}
            suffix="min"
            step={0.5}
            onChange={(minutes) => onChange({ ...step, minutes, basis: "pallet", units: 1 })}
          />
        </Field>
        {!previous && (
          <Field label="Operators">
            <NumberInput value={step.operators} min={1} onChange={(operators) => onChange({ ...step, operators })} />
          </Field>
        )}
      </div>
      <button
        type="button"
        onClick={() => onMode("workflows")}
        className="mt-2.5 cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-700"
      >
        Use an MTM-UAS workflow →
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-slate-200 py-2 text-[12px] font-semibold transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!step.action}
          onClick={() => onSave(step)}
          className="cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
        >
          Save step
        </button>
      </div>
    </section>
  );
}
