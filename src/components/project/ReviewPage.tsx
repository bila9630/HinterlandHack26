import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import {
  COST_SHARES,
  COST_STEPS,
  RAMP_UP,
  RFQ,
  STAFF_COST_PER_VEHICLE,
  annualCost,
  annualProfit,
  annualRevenue,
  cents,
  euros,
  millions,
  percent,
  rampUpPlan,
} from "./pricing";

type Props = { onContinue: () => void };

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
      <div className="mt-5 flex-1">{children}</div>
    </section>
  );
}

function Stat({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-[#f1f5fb] px-4 py-3">
      <p className="text-[11px] font-medium text-slate-600">{label}</p>
      <p className="mt-0.5 text-[22px] font-extrabold tracking-tight">{value}</p>
      <p className={`text-[11px] ${good ? "font-semibold text-emerald-700" : "text-slate-500"}`}>{note}</p>
    </div>
  );
}

function CostDonut() {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-[150px] shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          {COST_SHARES.map((block) => {
            const length = block.share * circumference;
            const dash = (
              <circle
                key={block.name}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={block.color}
                strokeWidth="20"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return dash;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] text-slate-500">Total cost</p>
          <p className="text-[15px] font-extrabold">{millions(annualCost)}</p>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {COST_SHARES.map((block) => (
          <li key={block.name} className="flex items-center gap-2 text-[12px]">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: block.color }} />
            <span className="flex-1">{block.name}</span>
            <span className="font-semibold tabular-nums">{percent(block.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CostWaterfall() {
  // Each overhead floats on top of everything before it; profit tops it up to the price.
  let running = 0;
  const bars = COST_STEPS.map((step, index) => {
    const bar = { name: step.name, from: running, amount: step.amount, color: index === 0 ? "#2563eb" : "#a3b1d6" };
    running += step.amount;
    return bar;
  });
  bars.push({ name: "Profit", from: running, amount: annualProfit, color: "#3fa877" });
  bars.push({ name: "Price", from: 0, amount: annualRevenue, color: "#0f1d3d" });
  const height = 170;
  const scale = height / annualRevenue;

  return (
    <div>
      <div className="flex items-end gap-2 border-b border-slate-200" style={{ height: height + 20 }}>
        {bars.map((bar) => (
          <div key={bar.name} className="flex h-full flex-1 flex-col justify-end">
            <p className="mb-1 text-center text-[10px] font-bold whitespace-nowrap">{millions(bar.amount)}</p>
            <div
              className="rounded-t-[5px]"
              style={{
                height: Math.max(bar.amount * scale, 3),
                marginBottom: bar.from * scale,
                backgroundColor: bar.color,
                borderRadius: bar.from > 0 ? 4 : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {bars.map((bar) => (
          <p key={bar.name} className="flex-1 text-center text-[10px] leading-tight text-slate-600">
            {bar.name}
          </p>
        ))}
      </div>
    </div>
  );
}

function StaffCostBars() {
  const max = Math.max(...STAFF_COST_PER_VEHICLE.map((item) => item.cost));

  return (
    <div>
      <div className="flex h-[190px] items-end gap-5 border-b border-slate-200 px-4">
        {STAFF_COST_PER_VEHICLE.map((item) => (
          <div key={item.phase} className="flex h-full flex-1 flex-col justify-end">
            <p className="mb-1 text-center text-[12px] font-bold">{cents(item.cost)}</p>
            <div className="rounded-t-md bg-blue-600" style={{ height: `${(item.cost / max) * 80}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-5 px-4">
        {STAFF_COST_PER_VEHICLE.map((item) => (
          <p key={item.phase} className="flex-1 text-center text-[11px] text-slate-600">
            {item.phase}
          </p>
        ))}
      </div>
    </div>
  );
}

function RampUpChart() {
  const width = 480;
  const height = 180;
  const left = 34;
  const bottom = 18;
  const x = (month: number) => left + (month / (RAMP_UP.length - 1)) * (width - left - 8);
  const y = (share: number) => 6 + (1 - share) * (height - bottom - 6);
  const actual = RAMP_UP.map((share, month) => `${x(month)},${y(share)}`).join(" ");
  const plan = RAMP_UP.map((_, month) => `${x(month)},${y(rampUpPlan(month))}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Monthly volume against the ramp-up plan">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - 8} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" />
            <text x={left - 6} y={y(tick) + 3} textAnchor="end" className="fill-slate-500 text-[9px]">
              {tick * 100}%
            </text>
          </g>
        ))}
        {RAMP_UP.map((_, month) => (
          <text key={month} x={x(month)} y={height - 3} textAnchor="middle" className="fill-slate-500 text-[9px]">
            M{month + 1}
          </text>
        ))}
        <polygon points={`${x(0)},${y(0)} ${actual} ${x(RAMP_UP.length - 1)},${y(0)}`} fill="#2563eb" fillOpacity="0.1" />
        <polyline points={plan} fill="none" stroke="#94a3c8" strokeWidth="1.5" strokeDasharray="5 4" />
        <polyline points={actual} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />
        {RAMP_UP.map((share, month) => (
          <circle key={month} cx={x(month)} cy={y(share)} r="3.5" fill="#2563eb" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-3 rounded bg-blue-600" />
          Expected volume (indicative, with weekly swings)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t-[1.5px] border-dashed border-[#94a3c8]" />
          Plan: 20% in month 1, then +10% per month
        </span>
      </div>
    </div>
  );
}

export default function ReviewPage({ onContinue }: Props) {
  const margin = annualProfit / annualRevenue;
  const onTarget = margin >= RFQ.targetMargin;

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#e0e7f3]">
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight">Review</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Summary for approval · {RFQ.id} · mixed phase, a typical year
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">Draft</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Annual revenue" value={euros(annualRevenue)} note="Mixed phase" />
            <Stat
              label="Price / vehicle"
              value={cents(annualRevenue / RFQ.vehiclesPerYear)}
              note={`cost ${cents(annualCost / RFQ.vehiclesPerYear)}`}
            />
            <Stat
              label="Profit on revenue"
              value={percent(margin)}
              note={onTarget ? "On target" : "Below target"}
              good={onTarget}
            />
            <Stat label="Profit / year" value={euros(annualProfit)} note="8% on cost + surcharges" />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card title="Where the cost goes" subtitle="Top 4 cost blocks incl. surcharges; the rest is grouped as Other">
            <CostDonut />
          </Card>
          <Card title="From direct cost to price" subtitle="Annual, mixed phase">
            <CostWaterfall />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Operative staff cost per vehicle" subtitle="By phase; the 2-shift ramp-up lowers the share per vehicle">
            <StaffCostBars />
          </Card>
          <Card title="Ramp-up after production starts" subtitle="Monthly volume vs plan">
            <RampUpChart />
          </Card>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-[13px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none"
        >
          Continue to offer
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
