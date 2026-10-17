import { ArrowRight, Trash2 } from "lucide-react";
import { EQUIPMENT, Equipment, ProcessStep, TRANSPORTS } from "../model";
import { subtaskSeconds } from "../workflows";
import { ActionSelect, CARD_CLASS, CardHeader, Field, NumberInput, TransportSelect, inputClass, seconds } from "./fields";
import { StepFormProps } from "./types";

// Editing a saved step: every change applies straight away.
export default function EditStepForm({
  step,
  number,
  previous,
  station,
  kicker,
  distance,
  onChange,
  onCancel,
  onRemove,
}: StepFormProps) {
  return (
    <section className={CARD_CLASS}>
      <CardHeader number={number} kicker={kicker} title={step.action || "No task yet"} onClose={onCancel} />
      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
        <div className="col-span-2">
          <ActionSelect step={step} kind={station.kind} onChange={onChange} />
        </div>
        <Field label={`Time / ${step.basis}`}>
          <NumberInput value={step.minutes} suffix="min" step={0.5} onChange={(minutes) => onChange({ ...step, minutes })} />
        </Field>
        <Field label="Counted per">
          <select
            value={step.basis}
            onChange={(event) => onChange({ ...step, basis: event.target.value as ProcessStep["basis"] })}
            className={inputClass}
          >
            <option value="pallet">Pallet</option>
            <option value="unit">Unit</option>
          </select>
        </Field>
        {step.basis === "unit" && (
          <div className="col-span-2">
            <Field label="Units / pallet">
              <NumberInput value={step.units} min={1} onChange={(units) => onChange({ ...step, units })} />
            </Field>
          </div>
        )}
        <Field label="Operators">
          <NumberInput value={step.operators} min={1} onChange={(operators) => onChange({ ...step, operators })} />
        </Field>
        <Field label="Equipment">
          <select
            value={step.equipment}
            onChange={(event) => onChange({ ...step, equipment: event.target.value as Equipment })}
            className={inputClass}
          >
            {Object.entries(EQUIPMENT).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        {previous && (
          <div className="col-span-2">
            <TransportSelect step={step} onChange={onChange} />
          </div>
        )}
      </div>
      {step.subtasks.length > 0 && (
        <p className="mt-2.5 text-[10px] text-slate-500">
          MTM-UAS · {step.subtasks.length} subtasks · {seconds(subtaskSeconds(step.subtasks))}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] text-slate-600">
        {previous ? (
          <span className="flex items-center gap-1.5">
            <ArrowRight className="size-3 text-blue-600" aria-hidden="true" />
            From step {number - 1} · {distance} m by {TRANSPORTS[step.transport].name.toLowerCase()}
          </span>
        ) : (
          <span>First step · where goods arrive</span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex cursor-pointer items-center gap-1 font-semibold text-slate-500 hover:text-red-600"
          >
            <Trash2 className="size-3" aria-hidden="true" />
            Remove
          </button>
        )}
      </div>
    </section>
  );
}
