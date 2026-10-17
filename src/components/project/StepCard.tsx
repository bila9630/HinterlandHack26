import { ReactNode, useState } from "react";
import { ArrowRight, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import {
  EQUIPMENT,
  Equipment,
  MTM_CODES,
  ProcessStep,
  STATION_DEFAULTS,
  Station,
  TRANSPORTS,
  Transport,
  WORKFLOWS,
  defaultTransport,
  stationInfo,
  subtaskSeconds,
  travelDistance,
} from "./process";

export type CardMode = "workflows" | "workflow" | "form" | "edit";

type Props = {
  mode: CardMode;
  step: ProcessStep;
  number: number;
  isNew: boolean;
  stations: Station[];
  // The stop before this one, when there is one.
  previous?: Station;
  onChange: (step: ProcessStep) => void;
  onMode: (mode: CardMode) => void;
  onSave: (step: ProcessStep) => void;
  onCancel: () => void;
  onRemove?: () => void;
};

const baseInput =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none";
const inputClass = `w-full ${baseInput}`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
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

function Header({ number, kicker, title, onClose }: { number: number; kicker: string; title: string; onClose?: () => void }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">{kicker}</p>
        <p className="truncate text-[14px] font-bold tracking-tight">{title}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const seconds = (value: number) => `${value.toFixed(1)} s`;

export default function StepCard({
  mode,
  step,
  number,
  isNew,
  stations,
  previous,
  onChange,
  onMode,
  onSave,
  onCancel,
  onRemove,
}: Props) {
  const [query, setQuery] = useState("");
  const [newSubtask, setNewSubtask] = useState({ code: "HA1", label: "", seconds: 2 });
  const station = stations.find((item) => item.id === step.stationId)!;
  const info = stationInfo(station.kind);
  const kicker = `Step ${number} · ${info.name}`;
  const distance = previous ? Math.round(travelDistance(previous, station)) : 0;
  const actions = STATION_DEFAULTS[station.kind].actions;
  const actionOptions = step.action && !actions.includes(step.action) ? [step.action, ...actions] : actions;

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

  if (mode === "workflows") {
    const matches = WORKFLOWS.filter(
      (item) => item.kind === station.kind && item.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return (
      <section className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">{kicker}</p>
            <p className="text-[14px] font-bold tracking-tight">What happens here?</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <label className="relative mt-2.5 block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-blue-600" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows…"
            className={`${inputClass} border-blue-600 py-2 pl-8`}
          />
        </label>
        <p className="mt-3 text-[10px] font-semibold text-slate-500">{query ? "Matching" : "Suggested"}</p>
        <ul className="mt-1.5 space-y-1.5">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...step, action: item.name, subtasks: item.subtasks.map((subtask) => ({ ...subtask, id: crypto.randomUUID() })) });
                  onMode("workflow");
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <span className="flex-1 text-[12px] font-semibold">{item.name}</span>
                <span className="text-[10px] text-slate-500">{seconds(subtaskSeconds(item.subtasks))}</span>
                <ChevronRight className="size-3.5 text-slate-400" aria-hidden="true" />
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="py-2 text-[11px] text-slate-500">No workflows match “{query}”.</li>}
        </ul>
        <button
          type="button"
          onClick={() => {
            const defaults = STATION_DEFAULTS[station.kind];
            onChange({ ...step, action: step.action || defaults.action, minutes: step.minutes || defaults.minutes, subtasks: [] });
            onMode("form");
          }}
          className="mt-3 cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-700"
        >
          + Custom workflow
        </button>
      </section>
    );
  }

  if (mode === "workflow") {
    const total = subtaskSeconds(step.subtasks);
    return (
      <section className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10">
        <button
          type="button"
          onClick={() => onMode("workflows")}
          className="cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-700"
        >
          ← All workflows
        </button>
        <p className="mt-1.5 text-[9px] font-bold tracking-wide text-blue-600 uppercase">{kicker}</p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14px] font-bold tracking-tight">{step.action}</p>
          <p className="shrink-0 text-[9px] text-slate-500">MTM-UAS · per pallet</p>
        </div>
        <ul className="mt-2 max-h-[240px] overflow-y-auto">
          {step.subtasks.map((subtask) => (
            <li key={subtask.id} className="group flex items-center gap-2 border-b border-slate-100 py-1.5 text-[11px]">
              <span className="w-9 shrink-0 rounded bg-blue-50 py-0.5 text-center text-[9px] font-bold text-blue-700">
                {subtask.code}
              </span>
              <span className="min-w-0 flex-1 truncate">{subtask.label}</span>
              <span className="font-semibold tabular-nums">{seconds(subtask.seconds)}</span>
              <button
                type="button"
                aria-label={`Remove ${subtask.label}`}
                onClick={() => onChange({ ...step, subtasks: step.subtasks.filter((item) => item.id !== subtask.id) })}
                className="cursor-pointer text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-700 focus:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newSubtask.label.trim()) return;
            onChange({ ...step, subtasks: [...step.subtasks, { ...newSubtask, label: newSubtask.label.trim(), id: crypto.randomUUID() }] });
            setNewSubtask({ ...newSubtask, label: "" });
          }}
        >
          <select
            value={newSubtask.code}
            onChange={(event) => setNewSubtask({ ...newSubtask, code: event.target.value })}
            className={`${baseInput} w-[64px] shrink-0 px-1.5 text-[10px]`}
            aria-label="MTM code"
          >
            {MTM_CODES.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
          <input
            value={newSubtask.label}
            onChange={(event) => setNewSubtask({ ...newSubtask, label: event.target.value })}
            placeholder="Add subtask"
            className={`${baseInput} min-w-0 flex-1 text-[11px]`}
          />
          <input
            type="number"
            min={0}
            step={0.1}
            value={newSubtask.seconds}
            onChange={(event) => setNewSubtask({ ...newSubtask, seconds: Math.max(0, Number(event.target.value) || 0) })}
            className={`${baseInput} w-[52px] shrink-0 px-1.5 text-[11px]`}
            aria-label="Seconds"
          />
          <button
            type="submit"
            aria-label="Add subtask"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[11px] text-slate-500">
            Total <span className="ml-1 text-[16px] font-bold text-slate-900">{seconds(total)}</span>
          </p>
          <button
            type="button"
            disabled={step.subtasks.length === 0}
            onClick={() => onSave({ ...step, basis: "pallet", minutes: Math.round((total / 60) * 100) / 100, units: 1 })}
            className="cursor-pointer rounded-lg bg-blue-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            Add to step {number}
          </button>
        </div>
      </section>
    );
  }

  const actionSelect = (
    <Field label="Action">
      <select
        value={step.action}
        onChange={(event) => onChange({ ...step, action: event.target.value, subtasks: [] })}
        className={inputClass}
      >
        {actionOptions.map((action) => (
          <option key={action}>{action}</option>
        ))}
      </select>
    </Field>
  );
  const transportSelect = (
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
  const stationSelect = (label: string) => (
    <Field label={label}>
      <select value={step.stationId} onChange={(event) => moveTo(event.target.value)} className={inputClass}>
        {stations.map((item) => {
          const sameKind = stations.filter((other) => other.kind === item.kind);
          const suffix = sameKind.length > 1 ? ` ${sameKind.indexOf(item) + 1}` : "";
          return (
            <option key={item.id} value={item.id}>
              {stationInfo(item.kind).name}
              {suffix}
            </option>
          );
        })}
      </select>
    </Field>
  );

  if (mode === "form") {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10">
        <Header number={number} kicker={kicker} title={isNew ? "New step" : step.action || "Add task"} />
        <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
          {previous ? (
            <>
              <Field label="From">
                <span className={`${inputClass} block truncate bg-slate-50 text-slate-700`}>{stationInfo(previous.kind).name}</span>
              </Field>
              {stationSelect("To")}
              {actionSelect}
              {transportSelect}
              <Field label="Distance">
                <span className={`${inputClass} block bg-slate-50 text-slate-700`}>{distance} m · auto</span>
              </Field>
            </>
          ) : (
            <>
              <div className="col-span-2">{stationSelect("Workstation")}</div>
              <div className="col-span-2">{actionSelect}</div>
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

  // Editing a saved step: every change applies straight away.
  return (
    <section className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10">
      <Header number={number} kicker={kicker} title={step.action || "No task yet"} onClose={onCancel} />
      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
        <div className="col-span-2">{actionSelect}</div>
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
        {previous && <div className="col-span-2">{transportSelect}</div>}
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
