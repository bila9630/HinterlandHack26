import { ReactNode } from "react";
import { X } from "lucide-react";
import { ProcessStep, STATION_DEFAULTS, Station, StationKind, TRANSPORTS, Transport, stationName } from "../model";

export const CARD_CLASS = "rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10";

export const baseInput =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none";
export const inputClass = `w-full ${baseInput}`;

export const seconds = (value: number) => `${value.toFixed(1)} s`;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  suffix,
  min = 0,
  step = 1,
  onChange,
}: {
  value: number;
  suffix?: string;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <span className="relative block">
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
        className={`${inputClass} ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-slate-500">
          {suffix}
        </span>
      )}
    </span>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

export function CardHeader({
  number,
  kicker,
  title,
  onClose,
}: {
  number: number;
  kicker: string;
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">{kicker}</p>
        <p className="truncate text-[14px] font-bold tracking-tight">{title}</p>
      </div>
      {onClose && <CloseButton onClick={onClose} />}
    </div>
  );
}

type StepFieldProps = { step: ProcessStep; onChange: (step: ProcessStep) => void };

export function ActionSelect({ step, kind, onChange }: StepFieldProps & { kind: StationKind }) {
  const actions = STATION_DEFAULTS[kind].actions;
  // A custom action stays selectable next to the usual ones.
  const options = step.action && !actions.includes(step.action) ? [step.action, ...actions] : actions;
  return (
    <Field label="Action">
      <select
        value={step.action}
        onChange={(event) => onChange({ ...step, action: event.target.value, subtasks: [] })}
        className={inputClass}
      >
        {options.map((action) => (
          <option key={action}>{action}</option>
        ))}
      </select>
    </Field>
  );
}

export function TransportSelect({ step, onChange }: StepFieldProps) {
  return (
    <Field label="Transport">
      <select
        value={step.transport}
        onChange={(event) => onChange({ ...step, transport: event.target.value as Transport })}
        className={inputClass}
      >
        {Object.entries(TRANSPORTS).map(([id, transport]) => (
          <option key={id} value={id}>
            {transport.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function StationSelect({
  label,
  value,
  stations,
  onChange,
}: {
  label: string;
  value: string;
  stations: Station[];
  onChange: (id: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {stations.map((item) => {
          const sameKind = stations.filter((other) => other.kind === item.kind);
          const suffix = sameKind.length > 1 ? ` ${sameKind.indexOf(item) + 1}` : "";
          return (
            <option key={item.id} value={item.id}>
              {stationName(item.kind)}
              {suffix}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
