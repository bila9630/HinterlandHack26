import { Play, Square } from "lucide-react";
import { useProcessContext } from "../ProcessContext";
import { minutesLabel, round1 } from "../metrics";
import { SIM_PALLETS } from "../simulation";

// Title and subtitle, the goods tabs, and starting or stopping the simulation.
export default function FlowHeader({ onSimulate }: { onSimulate: () => void }) {
  const { goods, activeGoodsId, changeActiveGoods, metrics, ready, hasTimes, sim, simulator } = useProcessContext();
  const subtitle = sim
    ? `${SIM_PALLETS} pallets through the hall, one every ${minutesLabel(round1(metrics.times[metrics.bottleneck ?? 0]))}`
    : ready && hasTimes
      ? "How one pallet moves through the hall, step by step"
      : "Connect your workstations in the order one pallet moves through them";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-tight">Process</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
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
                onClick={() => changeActiveGoods(item.id)}
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
            onClick={simulator.stop}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800"
          >
            <Square className="size-3 fill-current" aria-hidden="true" />
            Stop simulation
          </button>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={onSimulate}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-4 py-2 text-[12px] font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            <Play className="size-3 fill-current" aria-hidden="true" />
            Simulate
          </button>
        )}
      </div>
    </div>
  );
}
