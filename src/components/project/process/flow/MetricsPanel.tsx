import { useProcessContext } from "../ProcessContext";
import { minutesLabel, round1 } from "../metrics";
import { stationInfo } from "../model";
import { BOTTLENECK, Card, ContinueButton, Stat } from "../ui";

// Time per pallet split by step, and the key figures of the process.
export default function MetricsPanel() {
  const { steps, route, metrics, ready, hasTimes, sim } = useProcessContext();
  const tone = (index: number) => stationInfo(route[index].kind).tone.fg;

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-bold">Time per pallet</h2>
        <p className="text-[20px] font-extrabold">
          {hasTimes ? minutesLabel(round1(metrics.total)) : <span className="text-slate-400">— min</span>}
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
                    backgroundColor: tone(index),
                    boxShadow: sim && index === metrics.bottleneck ? `inset 0 0 0 3px ${BOTTLENECK}` : undefined,
                  }}
                >
                  {index + 1} · {round1(metrics.times[index])}m
                </span>
              ) : null,
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {steps.map((step, index) =>
              step.action ? (
                <li key={step.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: tone(index) }} />
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
        <Stat label="Throughput" value={ready ? `${round1(metrics.throughput)} pallets / h` : "—"} />
        <Stat
          label="Bottleneck"
          value={
            ready && metrics.bottleneck !== null ? `${metrics.bottleneck + 1} · ${steps[metrics.bottleneck].action}` : "—"
          }
          color={ready ? BOTTLENECK : undefined}
        />
        <Stat
          label="Forklift busy"
          value={!ready ? "—" : metrics.forkliftBusy === null ? "No forklifts" : `${Math.round(metrics.forkliftBusy * 100)} %`}
        />
        <Stat label="Distance" value={steps.length > 1 ? `${Math.round(metrics.distance)} m` : "—"} />
        <Stat label="Forklift trips" value={steps.length > 1 ? String(metrics.forkliftTrips) : "—"} />
        <Stat label="People involved" value={steps.length > 0 ? String(metrics.people) : "—"} />
      </div>
      <div className="mt-auto flex justify-end pt-5">
        <ContinueButton className="px-5" />
      </div>
    </Card>
  );
}
