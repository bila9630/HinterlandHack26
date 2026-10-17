import { useState } from "react";
import { Plus, X } from "lucide-react";
import { MTM_CODES, subtaskSeconds } from "../workflows";
import { CARD_CLASS, baseInput, seconds } from "./fields";
import { StepFormProps } from "./types";

// The chosen workflow's MTM-UAS subtasks, which can be trimmed or added to before saving.
export default function WorkflowEditor({ step, number, kicker, onChange, onMode, onSave }: StepFormProps) {
  const [newSubtask, setNewSubtask] = useState({ code: "HA1", label: "", seconds: 2 });
  const total = subtaskSeconds(step.subtasks);

  return (
    <section className={CARD_CLASS}>
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
