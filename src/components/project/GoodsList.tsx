import { Goods, formatWeight, totalWeight } from "./goods";
import { useStep } from "@/hooks/useStep";

type Props = {
  goods: Goods[];
  onRemove: (id: string) => void;
};

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-slate-400" aria-hidden="true">
      <path
        d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v9m0 0l8-4.5M12 12L4 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 40 44" className="size-4 shrink-0" aria-hidden="true">
      <polygon points="20,2 38,12 20,22 2,12" fill="#f5bc6a" />
      <polygon points="2,12 20,22 20,42 2,32" fill="#e39b3d" />
      <polygon points="20,22 38,12 38,32 20,42" fill="#c97e2b" />
    </svg>
  );
}

export default function GoodsList({ goods, onRemove }: Props) {
  const [, setStep] = useStep();
  const weights = goods.map(totalWeight);
  const total = weights.some((weight) => weight !== null)
    ? weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
    : null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold tracking-tight">Registered goods</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {goods.length}
        </span>
      </div>

      {goods.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-slate-50">
            <EmptyIcon />
          </div>
          <p className="text-[12px] font-semibold">No goods yet</p>
          <p className="mt-1 text-[10px] text-slate-500">Add your first goods on the left.</p>
        </div>
      ) : (
        <>
          <div className="mt-2.5 flex items-center gap-3 border-b border-slate-100 px-1 pb-1.5 text-[9px] font-semibold text-slate-500">
            <span className="flex-1">Goods</span>
            <span>Qty</span>
            <span className="w-8 text-right">Weight</span>
          </div>
          <ul className="mt-2 max-h-[45vh] space-y-1.5 overflow-y-auto">
            {goods.map((item, index) => (
              <li key={item.id} className="group relative flex items-center gap-2.5 rounded-xl bg-[#f1f5fb] px-2 py-2">
                <PackageIcon />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{item.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {item.width} × {item.length} × {item.height} cm
                  </p>
                </div>
                <span className="text-[11px] font-semibold">{item.quantity}</span>
                <span className="w-8 text-right text-[11px] font-semibold whitespace-nowrap">
                  {formatWeight(weights[index])}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full bg-white text-[10px] text-slate-500 shadow ring-1 ring-slate-200 group-hover:flex hover:text-red-600 focus:flex"
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="text-slate-500">Total weight</span>
            <span className="font-semibold">{formatWeight(total)}</span>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-2.5 w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Continue to workstations →
          </button>
        </>
      )}
    </section>
  );
}
