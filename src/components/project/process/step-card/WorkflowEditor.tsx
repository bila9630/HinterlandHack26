import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X } from "lucide-react";
import { SUBSTEPS, subtaskSeconds } from "../workflows";
import { CARD_CLASS, CloseButton, inputClass, seconds } from "./fields";
import { StepFormProps } from "./types";

// The chosen workflow's MTM-UAS subtasks, which can be trimmed or added to before saving.
export default function WorkflowEditor({ step, number, kicker, onChange, onMode, onSave }: StepFormProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const terms = query.trim().toLowerCase();
  const matches = SUBSTEPS.filter(
    (item) => item.label.toLowerCase().includes(terms) || item.code.toLowerCase().includes(terms),
  );
  const total = subtaskSeconds(step.subtasks);

  const closeSearch = () => {
    setAdding(false);
    setQuery("");
  };

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
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-blue-300 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add substep
      </button>
      {adding &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]"
            onClick={closeSearch}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add substep"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-slate-900/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-wide text-blue-600 uppercase">{step.action}</p>
                  <p className="text-[16px] font-bold tracking-tight">Add substep</p>
                </div>
                <CloseButton onClick={closeSearch} />
              </div>
              <label className="relative mt-3 block">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-blue-600" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && closeSearch()}
                  placeholder="Search substeps, e.g. scan, walk, lift…"
                  className={`${inputClass} border-blue-600 py-2.5 pl-9 text-[13px]`}
                />
              </label>
              <p className="mt-3 text-[10px] font-semibold text-slate-500">
                {query ? `${matches.length} matching` : "All substeps"} · MTM code and time are filled in for you
              </p>
              <ul className="mt-1.5 min-h-0 flex-1 overflow-y-auto">
                {matches.map((item) => (
                  <li key={`${item.code}:${item.label}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ ...step, subtasks: [...step.subtasks, { ...item, id: crypto.randomUUID() }] });
                        closeSearch();
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-[12px] hover:bg-blue-50"
                    >
                      <span className="w-10 shrink-0 rounded bg-blue-50 py-0.5 text-center text-[10px] font-bold text-blue-700">
                        {item.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="text-slate-500 tabular-nums">{seconds(item.seconds)}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-3 text-[12px] text-slate-500">No substeps match “{query}”.</li>
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )}
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
