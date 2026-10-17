import { DragEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { Plus, Route } from "lucide-react";
import { ZONE_LABELS } from "../../layouts";
import StationArt from "../../StationArt";
import { useProcessContext } from "../ProcessContext";
import { STATION_ORDER, Station, StationKind, stationName } from "../model";
import { Arrow, Card, DOTTED } from "../ui";
import FlowStepNode from "./FlowStepNode";
import StationChooser from "./StationChooser";
import TransportPicker from "./TransportPicker";

const DRAG_TYPE = "application/x-station-kind";

type Props = {
  // The step whose incoming leg has its transport picker open.
  transportFor: string | null;
  onTransportFor: (id: string | null) => void;
};

// The palette of stops plus the flow they are dragged, clicked or pulled into.
export default function FlowBuilder({ transportFor, onTransportFor }: Props) {
  const { stations, steps, route, metrics, nextOptions, selectedId, appendStation, openStep, removeStep, updateStep } =
    useProcessContext();
  const [dragOver, setDragOver] = useState(false);
  const [choosing, setChoosing] = useState(false);
  // A line being pulled from the last stop's dot, in pixels within the flow.
  const [pull, setPull] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const flow = useRef<HTMLDivElement>(null);

  const kinds = STATION_ORDER.filter((kind) => stations.some((station) => station.kind === kind));

  function append(station: Station) {
    const step = appendStation(station);
    setChoosing(false);
    if (steps.length > 0) onTransportFor(step.id);
  }

  function appendKind(kind: StationKind) {
    const option = nextOptions.find((item) => item.station.kind === kind);
    const station = option?.station ?? stations.find((item) => item.kind === kind);
    if (station) append(station);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const kind = event.dataTransfer.getData(DRAG_TYPE) as StationKind;
    if (kinds.includes(kind)) appendKind(kind);
  }

  // Dragging from the last dot draws a line; letting go opens the chooser.
  function startPull(event: ReactPointerEvent) {
    if (!flow.current) return;
    event.preventDefault();
    event.stopPropagation();
    const box = flow.current.getBoundingClientRect();
    const dot = event.currentTarget.getBoundingClientRect();
    const x0 = dot.left + dot.width / 2 - box.left;
    const y0 = dot.top + dot.height / 2 - box.top;
    setPull({ x0, y0, x: x0, y: y0 });
    const move = (e: PointerEvent) =>
      setPull((current) => current && { ...current, x: e.clientX - box.left, y: e.clientY - box.top });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setPull(null);
      setChoosing(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const chooser = (
    <StationChooser
      options={nextOptions}
      showDistance={steps.length > 0}
      onPick={append}
      onClose={() => setChoosing(false)}
    />
  );

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-[13px] font-bold">Workstations on your floor</h2>
        <p className="text-[11px] text-slate-500">Drag into the flow, then pull a line from one dot to the next</p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const used = route.some((station) => station.kind === kind);
          const suggested = steps.length === 0 && kind === "inbound-dock";
          const zones = [
            ...new Set(stations.filter((station) => station.kind === kind).map((station) => ZONE_LABELS[station.zone])),
          ];
          return (
            <li key={kind}>
              <button
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData(DRAG_TYPE, kind)}
                onClick={() => appendKind(kind)}
                className={`flex cursor-grab items-center gap-2.5 rounded-xl border py-1.5 pr-4 pl-1.5 text-left transition active:cursor-grabbing ${
                  suggested ? "border-blue-600 bg-blue-50/60" : "border-slate-200 hover:border-slate-300"
                } ${used ? "opacity-50" : ""}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef2fb]">
                  <StationArt kind={kind} className="size-10" />
                </span>
                <span>
                  <span className="block text-[12px] font-semibold">{stationName(kind)}</span>
                  <span className={`block text-[10px] ${suggested ? "font-semibold text-blue-600" : "text-slate-500"}`}>
                    {suggested ? "Suggested start" : used ? "Used" : zones.join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={drop}
        className={`mt-3 overflow-x-auto rounded-xl transition ${dragOver ? "bg-blue-50 ring-2 ring-blue-300" : "bg-slate-50"}`}
        style={DOTTED}
      >
        {steps.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center p-6">
            {choosing ? (
              chooser
            ) : (
              <button
                type="button"
                onClick={() => setChoosing(true)}
                className="max-w-[340px] cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white/70 px-6 py-6 text-center transition hover:border-blue-300"
              >
                <span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Route className="size-4" aria-hidden="true" />
                </span>
                <span className="mt-2 block text-[13px] font-bold">No workstations in the flow yet</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                  Drag your first workstation here — usually the inbound dock, where goods arrive.
                </span>
              </button>
            )}
          </div>
        ) : (
          <div ref={flow} className="relative flex min-h-[350px] min-w-max items-start px-8 pt-8 pb-10">
            {steps.map((step, index) => {
              const leg = metrics.legs[index];
              return (
                <div key={step.id} className="flex items-start">
                  {leg && (
                    <TransportPicker
                      step={step}
                      leg={leg}
                      open={transportFor === step.id}
                      onToggle={() => onTransportFor(transportFor === step.id ? null : step.id)}
                      onPick={(transport) => {
                        updateStep(step.id, { transport });
                        onTransportFor(null);
                      }}
                    />
                  )}
                  <FlowStepNode
                    step={step}
                    station={route[index]}
                    index={index}
                    isLast={index === steps.length - 1}
                    selected={step.id === selectedId}
                    minutes={metrics.times[index]}
                    onOpen={() => openStep(index)}
                    onRemove={() => removeStep(step.id)}
                    onPullStart={startPull}
                  />
                </div>
              );
            })}
            <div className="mt-[80px] w-[90px] px-2">
              <Arrow dashed muted />
            </div>
            {choosing ? (
              chooser
            ) : (
              <button
                type="button"
                onClick={() => setChoosing(true)}
                className="flex h-[196px] w-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-[11px] text-slate-400 transition hover:border-blue-400 hover:text-blue-600"
              >
                <Plus className="size-5" aria-hidden="true" />
                Drop next
                <br />
                workstation
              </button>
            )}
            {pull && (
              <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
                <line x1={pull.x0} y1={pull.y0} x2={pull.x} y2={pull.y} stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" />
                <circle cx={pull.x} cy={pull.y} r={5} fill="#2563eb" />
              </svg>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
