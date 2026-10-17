import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { FacilityLayout } from "../layouts";
import LayoutScene from "../LayoutScene";
import { Staffing } from "../people";
import { ProcessStep, stationName } from "../process/model";
import { PlacedWorkstation } from "../workstations";
import LiveFloor, { LiveControl } from "./LiveFloor";
import { LivePlan, SHIFT_MINUTES, livePlan, shiftClock } from "./liveSim";

export type LiveSimulationProps = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  processes: ProcessStep[][];
  staffing: Staffing;
};

const SPEEDS = [1, 2, 4];
const BOTTLENECK = "#d97706";

// Reads the simulation clock a few times a second, so the numbers tick along without
// re-rendering the floor every frame.
function useLiveTime(control: RefObject<LiveControl>) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(control.current.time), 200);
    return () => window.clearInterval(timer);
  }, [control]);
  return time;
}

function Tile({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${warn ? "bg-amber-50" : "bg-[#f1f5fb]"}`}>
      <p className={`text-[10px] ${warn ? "text-amber-700" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-0.5 truncate text-[16px] font-bold tracking-tight ${warn ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
}

function LiveNumbers({ plan, control }: { plan: LivePlan; control: RefObject<LiveControl> }) {
  const time = useLiveTime(control);
  const bottleneck = plan.metrics.bottleneck;
  const route = plan.stops.map((stop) => stop.station);

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold tracking-tight">Live numbers</h2>
          <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
            {shiftClock(time)} / {shiftClock(SHIFT_MINUTES)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Tile label="Pallets done" value={`${Math.min(plan.done(time), plan.target)} / ${plan.target}`} />
          <Tile label="Throughput" value={`${plan.throughput.toFixed(1)} / h`} />
          <Tile label="Avg. lead time" value={`${Math.round(plan.cycle)} min`} />
          <Tile
            label="Bottleneck"
            value={bottleneck === null ? "—" : `${bottleneck + 1} · ${stationName(route[bottleneck].kind).split(" ")[0]}`}
            warn={bottleneck !== null}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
        <h2 className="text-[13px] font-bold tracking-tight">Utilisation</h2>
        <ul className="mt-3 space-y-2.5">
          {plan.utilisation.map((share, index) => {
            const color = index === bottleneck ? BOTTLENECK : "#2563eb";
            return (
              <li key={index} className="flex items-center gap-2.5" title={stationName(route[index].kind)}>
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, backgroundColor: color }} />
                </span>
                <span
                  className="w-8 text-right text-[11px] font-semibold tabular-nums"
                  style={{ color: index === bottleneck ? BOTTLENECK : undefined }}
                >
                  {Math.round(share * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

// One shift on the floor, played back: pallets flow through the process while the
// numbers on the side follow along.
export default function LiveSimulation({
  layout,
  workstations,
  processes,
  staffing,
  onContinue,
}: LiveSimulationProps & { onContinue: () => void }) {
  const plan = useMemo(
    () => livePlan(layout, workstations, processes, staffing),
    [layout, workstations, processes, staffing],
  );
  const control = useRef<LiveControl>({ time: 0, playing: true, speed: 1 });
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  if (plan.stops.length === 0) return null;

  function togglePlaying() {
    control.current.playing = !playing;
    setPlaying(!playing);
  }

  function changeSpeed(value: number) {
    control.current.speed = value;
    setSpeed(value);
  }

  const buttonClass =
    "flex size-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none";

  return (
    <main className="relative flex flex-col bg-[#e0e7f3] lg:block lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <div className="relative order-2 h-[60vh] lg:absolute lg:inset-0 lg:right-[290px] lg:left-[240px] lg:h-auto">
        <LayoutScene
          layout={layout}
          showLabels={false}
          quiet
          workstations={plan.placed}
          overlay={() => <LiveFloor plan={plan} control={control} />}
        />
      </div>

      <div className="relative z-10 order-1 m-4 lg:absolute lg:top-4 lg:left-4 lg:m-0 lg:w-[264px]">
        <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
          <h1 className="text-[15px] font-bold tracking-tight">Live simulation</h1>
          <p className="mt-0.5 text-[10px] text-slate-500">
            One shift on your floor · {plan.stops.length} steps · drag to turn the view
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={togglePlaying} className={buttonClass} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
            </button>
            <button
              type="button"
              onClick={() => (control.current.time = 0)}
              className={buttonClass}
              aria-label="Restart the shift"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <div className="ml-auto flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Speed">
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={speed === value}
                  onClick={() => changeSpeed(value)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    speed === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-3 w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none"
          >
            Continue to offer →
          </button>
        </section>
      </div>

      <div className="relative z-10 order-3 m-4 space-y-3 lg:absolute lg:top-4 lg:right-4 lg:m-0 lg:w-[280px]">
        <LiveNumbers plan={plan} control={control} />
      </div>
    </main>
  );
}
