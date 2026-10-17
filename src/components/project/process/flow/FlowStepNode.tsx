import { PointerEvent as ReactPointerEvent } from "react";
import { X } from "lucide-react";
import { ZONE_LABELS } from "../../layouts";
import StationArt from "../../StationArt";
import { minutesLabel } from "../metrics";
import { EQUIPMENT, ProcessStep, Station, stationName } from "../model";
import { Dot } from "../ui";

type Props = {
  step: ProcessStep;
  station: Station;
  index: number;
  // The last step's right dot is the handle to pull a line to the next stop.
  isLast: boolean;
  selected: boolean;
  minutes: number;
  onOpen: () => void;
  onRemove: () => void;
  onPullStart: (event: ReactPointerEvent) => void;
};

// One step's tile in the flow.
export default function FlowStepNode({ step, station, index, isLast, selected, minutes, onOpen, onRemove, onPullStart }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
      className={`group relative w-[176px] cursor-pointer rounded-xl border-2 bg-white p-2.5 shadow-sm transition ${
        selected ? "border-blue-600" : "border-white ring-1 ring-slate-200 hover:ring-slate-300"
      }`}
    >
      {index === 0 && (
        <span className="absolute -top-2.5 left-3 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white">
          START
        </span>
      )}
      {index > 0 && <Dot className="-left-2.5" />}
      {isLast ? (
        <span
          onPointerDown={onPullStart}
          onClick={(event) => event.stopPropagation()}
          title="Pull a line to the next workstation"
          className="absolute top-[92px] -right-2.5 z-10 size-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-blue-600 bg-white transition hover:scale-125 hover:bg-blue-600"
        />
      ) : (
        <Dot filled className="-right-2.5" />
      )}
      <div className="flex items-center justify-between">
        <span className="flex size-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
          {index + 1}
        </span>
        {step.action && <span className="text-[11px] font-bold">{minutesLabel(minutes)}</span>}
      </div>
      <div className="mt-1.5 flex h-[70px] items-center justify-center rounded-lg bg-[#eef2fb]">
        <StationArt kind={station.kind} className="h-[64px]" />
      </div>
      <p className="mt-2 truncate text-[12px] font-bold">{step.action || stationName(station.kind)}</p>
      <p className="truncate text-[10px] text-slate-500">
        {step.action ? stationName(station.kind) : `${ZONE_LABELS[station.zone]} · no tasks yet`}
      </p>
      {step.action ? (
        <p className="truncate text-[10px] text-slate-500">
          {step.operators} op.
          {step.equipment !== "none" ? ` · ${EQUIPMENT[step.equipment].toLowerCase()}` : ""}
        </p>
      ) : (
        <span className="mt-1.5 block rounded-lg border border-dashed border-blue-300 py-1 text-center text-[11px] font-semibold text-blue-600">
          + Add task
        </span>
      )}
      <button
        type="button"
        aria-label="Remove step"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 flex size-5 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-slate-900 focus:opacity-100"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}
