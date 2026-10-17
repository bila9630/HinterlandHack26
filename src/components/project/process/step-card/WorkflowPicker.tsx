import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { STATION_DEFAULTS } from "../model";
import { WORKFLOWS, subtaskSeconds } from "../workflows";
import { CARD_CLASS, CloseButton, inputClass, seconds } from "./fields";
import { StepFormProps } from "./types";

// "What happens here?": choose a standard MTM-UAS workflow, or describe the step by hand.
export default function WorkflowPicker({ step, station, kicker, onChange, onMode, onCancel }: StepFormProps) {
  const [query, setQuery] = useState("");
  const matches = WORKFLOWS.filter(
    (item) => item.kind === station.kind && item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <section className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">{kicker}</p>
          <p className="text-[14px] font-bold tracking-tight">What happens here?</p>
        </div>
        <CloseButton onClick={onCancel} />
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
