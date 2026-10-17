import { Pause, Play } from "lucide-react";
import StationArt from "../../StationArt";
import { useProcessContext } from "../ProcessContext";
import { minutesLabel, round1 } from "../metrics";
import { TRANSPORTS, stationName } from "../model";
import { SIM_PALLETS } from "../simulation";
import { Arrow, BOTTLENECK, Card, DOTTED } from "../ui";

const SPEEDS = [1, 10, 60];

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`;

const shiftLabel = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")} h`;

// The running simulation: where the followed pallet is, which steps are busy, and the playback controls.
export default function SimulatorPanel() {
  const { steps, route, metrics, sim, simState, simDuration, simulator } = useProcessContext();
  if (!sim || !simState) return null;
  const position = simState.position;
  const nameOf = (index: number) => stationName(route[index].kind);
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
                onClick={() => simulator.setSpeed(speed)}
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
                    {minutesLabel(round1(metrics.times[index]))}
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
          onClick={simulator.toggle}
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
          onChange={(event) => simulator.seek(Number(event.target.value))}
          className="flex-1 accent-blue-600"
          aria-label="Simulation time"
        />
        <span className="text-[11px] whitespace-nowrap text-slate-500">{shiftLabel(simDuration)} shift</span>
      </div>
    </Card>
  );
}
