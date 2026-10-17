import { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, useRef, useState } from "react";
import { Pause, Play, Plus, Route, Search, Sparkles, Square, X } from "lucide-react";
import { Goods } from "./goods";
import { FacilityLayout, ZONE_LABELS } from "./layouts";
import LayoutScene from "./LayoutScene";
import ProcessRoute from "./ProcessRoute";
import StationArt from "./StationArt";
import type { Simulation } from "./ProcessPage";
import {
  EQUIPMENT,
  Metrics,
  PalletPosition,
  ProcessStep,
  SIM_PALLETS,
  STATION_ORDER,
  Station,
  StationKind,
  TRANSPORTS,
  Transport,
  minutesLabel,
  stationInfo,
} from "./process";
import { PlacedWorkstation } from "./workstations";

type Props = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  stations: Station[];
  steps: ProcessStep[];
  route: Station[];
  metrics: Metrics;
  subtitle: string;
  card: ReactNode;
  selectedId: string | null;
  goods: Goods[];
  activeGoodsId: string | null;
  onActiveGoodsChange: (id: string) => void;
  suggestion: Station[];
  onUseSuggestion: () => void;
  nextOptions: { station: Station; distance: number }[];
  onAppend: (station: Station) => ProcessStep;
  onOpenStep: (index: number) => void;
  onRemove: (id: string) => void;
  onTransport: (id: string, transport: Transport) => void;
  sim: Simulation | null;
  simState: { busy: Set<number>; pallet: number; position: PalletPosition | null } | null;
  simDuration: number;
  onSim: (sim: Simulation | null) => void;
  onOpen3D: () => void;
  onContinue: () => void;
};

const DRAG_TYPE = "application/x-station-kind";
const SPEEDS = [1, 10, 60];
const BOTTLENECK = "#d97706";
const DOTTED = { backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "18px 18px" };

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[16px] font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`;

const shiftLabel = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")} h`;

function Arrow({ dashed = false, muted = false }: { dashed?: boolean; muted?: boolean }) {
  return (
    <span className="flex w-full items-center" aria-hidden="true">
      <span className={`flex-1 border-t-2 ${dashed ? "border-dashed" : ""} ${muted ? "border-slate-300" : "border-blue-600"}`} />
      <span
        className={`border-y-[5px] border-l-[7px] border-y-transparent ${muted ? "border-l-slate-300" : "border-l-blue-600"}`}
      />
    </span>
  );
}

function Dot({ filled = false, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <span
      className={`absolute top-[92px] size-4 -translate-y-1/2 rounded-full border-2 border-blue-600 ${
        filled ? "bg-blue-600" : "bg-white"
      } ${className}`}
    />
  );
}

export default function ProcessFlow({
  layout,
  workstations,
  stations,
  steps,
  route,
  metrics,
  card,
  selectedId,
  goods,
  activeGoodsId,
  onActiveGoodsChange,
  suggestion,
  onUseSuggestion,
  nextOptions,
  onAppend,
  onOpenStep,
  onRemove,
  onTransport,
  sim,
  simState,
  simDuration,
  onSim,
  onOpen3D,
  onContinue,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState("");
  const [transportFor, setTransportFor] = useState<string | null>(null);
  // A line being pulled from the last stop's dot, in pixels within the flow.
  const [pull, setPull] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const flow = useRef<HTMLDivElement>(null);

  const kinds = STATION_ORDER.filter((kind) => stations.some((station) => station.kind === kind));
  // Simulating and the throughput figures need every step to have a task.
  const ready = steps.length >= 2 && steps.every((step) => step.action) && metrics.bottleneck !== null;
  const hasTimes = metrics.times.some((value) => value > 0);
  const nameOf = (index: number) => stationInfo(route[index].kind).name;
  const transportIndex = transportFor ? steps.findIndex((step) => step.id === transportFor) : -1;
  const selectedIndex = steps.findIndex((step) => step.id === selectedId);
  const position = simState?.position ?? null;

  function append(station: Station) {
    const step = onAppend(station);
    setChoosing(false);
    setQuery("");
    if (steps.length > 0) setTransportFor(step.id);
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

  const filteredOptions = nextOptions.filter((option) =>
    stationInfo(option.station.kind).name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const chooser = (
    <div className="w-[250px] self-start">
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-blue-600" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setChoosing(false)}
          placeholder="Choose next workstation…"
          className="w-full rounded-xl border-2 border-blue-600 bg-white py-2.5 pr-8 pl-8 text-[12px] shadow-sm ring-4 ring-blue-100 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setChoosing(false)}
          aria-label="Close"
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </label>
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <p className="px-1.5 pt-1 pb-1.5 text-[9px] font-bold tracking-wide text-slate-500 uppercase">
          {steps.length > 0 ? "Nearest first" : "Workstations"}
        </p>
        <ul>
          {filteredOptions.map(({ station, distance }) => (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => append(station)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-blue-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2fb]">
                  <StationArt kind={station.kind} className="size-9" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">{stationInfo(station.kind).name}</span>
                  <span className="block text-[9px] text-slate-500">{ZONE_LABELS[station.zone]}</span>
                </span>
                {steps.length > 0 && <span className="text-[10px] font-semibold text-slate-600">{distance} m</span>}
              </button>
            </li>
          ))}
          {filteredOptions.length === 0 && <li className="px-1.5 py-2 text-[11px] text-slate-500">No match</li>}
        </ul>
      </div>
    </div>
  );

  function builder() {
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
                    <span className="block text-[12px] font-semibold">{stationInfo(kind).name}</span>
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
                const station = route[index];
                const leg = metrics.legs[index];
                return (
                  <div key={step.id} className="flex items-start">
                    {leg && (
                      <div className="relative mt-[80px] w-[110px] px-2">
                        <button
                          type="button"
                          onClick={() => setTransportFor(transportFor === step.id ? null : step.id)}
                          className="block w-full cursor-pointer text-center text-[10px] leading-tight text-slate-600 hover:text-blue-700"
                        >
                          <Arrow dashed />
                          <span className="mt-1.5 block">{Math.round(leg.distance)} m</span>
                          <span className="block">{TRANSPORTS[leg.transport].name.toLowerCase()}</span>
                        </button>
                        {transportFor === step.id && (
                          <div className="absolute top-full left-1/2 z-20 mt-2 w-[230px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                            <p className="text-[12px] font-bold">How does the pallet get there?</p>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                              {Object.entries(TRANSPORTS).map(([id, transport]) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    onTransport(step.id, id as Transport);
                                    setTransportFor(null);
                                  }}
                                  className={`cursor-pointer rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                                    step.transport === id
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {transport.name}
                                </button>
                              ))}
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500">
                              Distance from layout:{" "}
                              <span className="font-semibold text-slate-900">{Math.round(leg.distance)} m</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenStep(index)}
                      onKeyDown={(event) => event.key === "Enter" && onOpenStep(index)}
                      className={`group relative w-[176px] cursor-pointer rounded-xl border-2 bg-white p-2.5 shadow-sm transition ${
                        step.id === selectedId ? "border-blue-600" : "border-white ring-1 ring-slate-200 hover:ring-slate-300"
                      }`}
                    >
                      {index === 0 && (
                        <span className="absolute -top-2.5 left-3 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          START
                        </span>
                      )}
                      {index > 0 && <Dot className="-left-2.5" />}
                      {index === steps.length - 1 ? (
                        <span
                          onPointerDown={startPull}
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
                        {step.action && <span className="text-[11px] font-bold">{minutesLabel(metrics.times[index])}</span>}
                      </div>
                      <div className="mt-1.5 flex h-[70px] items-center justify-center rounded-lg bg-[#eef2fb]">
                        <StationArt kind={station.kind} className="h-[64px]" />
                      </div>
                      <p className="mt-2 truncate text-[12px] font-bold">{step.action || stationInfo(station.kind).name}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {step.action ? stationInfo(station.kind).name : `${ZONE_LABELS[station.zone]} · no tasks yet`}
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
                          onRemove(step.id);
                        }}
                        className="absolute -top-2 -right-2 flex size-5 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-slate-900 focus:opacity-100"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </div>
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

  function simulator() {
    if (!sim || !simState) return null;
    const status = !position
      ? sim.time >= simDuration
        ? `All ${SIM_PALLETS} pallets through the hall`
        : "Waiting for the next pallet"
      : `Pallet ${simState.pallet + 1} of ${SIM_PALLETS} · ${position.at === "step" ? "at" : "to"} ${nameOf(position.index)}`;
    return (
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" />
              SIMULATING
            </span>
            <p className="text-[13px] font-bold">{status}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Speed</span>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onSim({ ...sim, speed })}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    sim.speed === speed ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50" style={DOTTED}>
          <div className="flex min-w-max items-start px-4 py-4">
            {steps.map((step, index) => {
              const leg = metrics.legs[index];
              const bottleneck = index === metrics.bottleneck;
              const here = position?.at === "step" && position.index === index;
              const busy = simState.busy.has(index);
              return (
                <div key={step.id} className="flex items-start">
                  {leg && (
                    <div className="relative mt-[60px] w-[110px] px-2 text-center text-[10px] text-slate-600">
                      <Arrow />
                      {position?.at === "leg" && position.index === index && (
                        <span
                          className="absolute top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#e8a04f] shadow"
                          style={{ left: `calc(8px + ${position.fraction} * (100% - 16px))`, top: 6 }}
                        />
                      )}
                      <span className="mt-1.5 block">
                        {TRANSPORTS[leg.transport].name} · {Math.round(leg.distance)} m
                      </span>
                    </div>
                  )}
                  <div
                    className="w-[164px] rounded-xl border-2 bg-white p-2.5 shadow-sm"
                    style={{ borderColor: here ? "#2563eb" : bottleneck ? BOTTLENECK : "#ffffff" }}
                  >
                    <div className="relative flex h-[80px] items-center justify-center rounded-lg bg-[#eef2fb]">
                      <span
                        className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                        style={
                          bottleneck && !here
                            ? { borderColor: BOTTLENECK, color: BOTTLENECK, backgroundColor: "#fff" }
                            : { borderColor: "#2563eb", color: "#fff", backgroundColor: "#2563eb" }
                        }
                      >
                        {index + 1}
                      </span>
                      <StationArt kind={route[index].kind} className="h-[72px]" />
                    </div>
                    <p className="mt-2 truncate text-[12px] font-bold">{nameOf(index)}</p>
                    <p className="text-[10px] text-slate-500">
                      {minutesLabel(Math.round(metrics.times[index] * 10) / 10)}
                      {bottleneck ? " · bottleneck" : busy ? " · busy" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label={sim.playing ? "Pause" : "Play"}
            onClick={() => onSim({ ...sim, playing: !sim.playing, time: sim.time >= simDuration ? 0 : sim.time })}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
          >
            {sim.playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
          <span className="w-12 text-[12px] font-semibold tabular-nums">{clock(sim.time)}</span>
          <input
            type="range"
            min={0}
            max={simDuration}
            step={0.1}
            value={sim.time}
            onChange={(event) => onSim({ ...sim, time: Number(event.target.value), playing: false })}
            className="flex-1 accent-blue-600"
            aria-label="Simulation time"
          />
          <span className="text-[11px] whitespace-nowrap text-slate-500">{shiftLabel(simDuration)} shift</span>
        </div>
      </Card>
    );
  }

  const routeCaption = sim
    ? position
      ? position.at === "leg"
        ? `Pallet moving from ${position.index} → ${position.index + 1} · amber = bottleneck`
        : `Pallet at ${position.index + 1} · ${nameOf(position.index)}`
      : "Waiting for the next pallet"
    : transportIndex > 0
      ? `Connecting ${transportIndex} → ${transportIndex + 1} · choose how the pallet moves`
      : steps.length === 0
        ? "No route yet · stops are numbered as you add them"
        : steps.length === 1
          ? "Start set at 1 · pick the next workstation"
          : `${steps.length} stops · ${Math.round(metrics.distance)} m between them`;
  const mapActive =
    position?.at === "step"
      ? position.index
      : selectedIndex >= 0
        ? selectedIndex
        : transportIndex >= 0
          ? transportIndex
          : null;

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#f1f5fb] px-4 py-6 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight">Process</h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {sim
                ? `${SIM_PALLETS} pallets through the hall, one every ${minutesLabel(Math.round(metrics.times[metrics.bottleneck ?? 0] * 10) / 10)}`
                : ready && hasTimes
                  ? "How one pallet moves through the hall, step by step"
                  : "Connect your workstations in the order one pallet moves through them"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {goods.length > 1 && (
              <div className="flex rounded-xl bg-[#e3e9f4] p-1" role="tablist" aria-label="Goods">
                {goods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === activeGoodsId}
                    onClick={() => onActiveGoodsChange(item.id)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                      item.id === activeGoodsId ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
            {sim ? (
              <button
                type="button"
                onClick={() => onSim(null)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800"
              >
                <Square className="size-3 fill-current" aria-hidden="true" />
                Stop simulation
              </button>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  setTransportFor(null);
                  onSim({ time: 0, playing: true, speed: 10 });
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-4 py-2 text-[12px] font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <Play className="size-3 fill-current" aria-hidden="true" />
                Simulate
              </button>
            )}
          </div>
        </div>

        {!sim && steps.length < 2 && suggestion.length >= 2 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 text-[12px]">
              <span className="font-semibold text-blue-700">Suggested from your layout: </span>
              <span className="font-semibold">{suggestion.map((station) => stationInfo(station.kind).name).join(" → ")}</span>
            </p>
            <button
              type="button"
              onClick={onUseSuggestion}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
            >
              Use suggestion
            </button>
          </div>
        )}

        {sim ? simulator() : builder()}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card className="flex flex-col">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[14px] font-bold">Time per pallet</h2>
              <p className="text-[20px] font-extrabold">
                {hasTimes ? minutesLabel(Math.round(metrics.total * 10) / 10) : <span className="text-slate-400">— min</span>}
              </p>
            </div>
            {hasTimes ? (
              <>
                <div className="mt-3 flex h-9 gap-1 overflow-hidden rounded-lg">
                  {steps.map((step, index) =>
                    metrics.times[index] > 0 ? (
                      <span
                        key={step.id}
                        title={`${index + 1} · ${step.action} · ${minutesLabel(metrics.times[index])}`}
                        className="flex min-w-0 items-center justify-center truncate px-1 text-[11px] font-semibold text-white"
                        style={{
                          // Scaled up: flex-grow values summing below 1 leave the bar part empty.
                          flexGrow: metrics.times[index] * 100,
                          flexBasis: 0,
                          backgroundColor: stationInfo(route[index].kind).tone.fg,
                          boxShadow: sim && index === metrics.bottleneck ? `inset 0 0 0 3px ${BOTTLENECK}` : undefined,
                        }}
                      >
                        {index + 1} · {Math.round(metrics.times[index] * 10) / 10}m
                      </span>
                    ) : null,
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {steps.map((step, index) =>
                    step.action ? (
                      <li key={step.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span
                          className="size-2.5 rounded-sm"
                          style={{ backgroundColor: stationInfo(route[index].kind).tone.fg }}
                        />
                        {step.action}
                      </li>
                    ) : null,
                  )}
                </ul>
              </>
            ) : (
              <div
                className="mt-3 h-9 rounded-lg border border-dashed border-slate-200"
                style={{ background: "repeating-linear-gradient(135deg, #f1f5f9 0 8px, #fff 8px 16px)" }}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <Stat label="Throughput" value={ready ? `${Math.round(metrics.throughput * 10) / 10} pallets / h` : "—"} />
              <Stat
                label="Bottleneck"
                value={
                  ready && metrics.bottleneck !== null
                    ? `${metrics.bottleneck + 1} · ${steps[metrics.bottleneck].action}`
                    : "—"
                }
                color={ready ? BOTTLENECK : undefined}
              />
              <Stat
                label="Forklift busy"
                value={
                  !ready ? "—" : metrics.forkliftBusy === null ? "No forklifts" : `${Math.round(metrics.forkliftBusy * 100)} %`
                }
              />
              <Stat label="Distance" value={steps.length > 1 ? `${Math.round(metrics.distance)} m` : "—"} />
              <Stat label="Forklift trips" value={steps.length > 1 ? String(metrics.forkliftTrips) : "—"} />
              <Stat label="People involved" value={steps.length > 0 ? String(metrics.people) : "—"} />
            </div>
            <div className="mt-auto flex justify-end pt-5">
              <button
                type="button"
                disabled={steps.length < 2}
                onClick={onContinue}
                className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Continue to people →
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[14px] font-bold">Route on the floor</h2>
              <button
                type="button"
                onClick={onOpen3D}
                className="cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Open 3D →
              </button>
            </div>
            <div className="mt-3 h-[230px] overflow-hidden rounded-xl bg-[#eef2f9]">
              <LayoutScene
                layout={layout}
                quiet
                workstations={workstations}
                overlay={(labels) => (
                  <ProcessRoute
                    labels={labels}
                    stations={stations}
                    route={route}
                    activeIndex={mapActive}
                    pallet={position}
                    compact
                  />
                )}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">{routeCaption}</p>
          </Card>
        </div>
      </div>

      {card && <div className="fixed right-6 bottom-6 z-30 w-[300px]">{card}</div>}
    </main>
  );
}
