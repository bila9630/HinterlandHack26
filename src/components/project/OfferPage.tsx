import { ReactNode, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  COST_SHARES,
  COST_STEPS,
  FIXED_COST_SHARE,
  MARKET_CEILING_MARGIN,
  PRICE_RANGE,
  PROJECT_REVENUE_BY_SERVICE,
  PROJECT_YEARS,
  RFQ,
  annualCost,
  millions,
  percent,
  projectCost,
  projectMargin,
  projectRevenue,
  rampUpPlan,
} from "./pricing";

const directCost = COST_STEPS[0].amount;
const fullVolumeMonth = Array.from({ length: 24 }, (_, month) => month).find((month) => rampUpPlan(month) >= 1) ?? 0;

const ASSUMPTIONS = [
  `${RFQ.vehiclesPerYear.toLocaleString("en-US")} vehicles a year at full volume over ${RFQ.contractTerm}.`,
  `Ramp-up starts at 20% and reaches full volume in month ${fullVolumeMonth + 1}, so ${RFQ.firstYear} runs at ${percent(PROJECT_YEARS[0].volume)} volume.`,
  `${percent(FIXED_COST_SHARE)} of the cost is fixed (leasing, area); the rest scales with volume.`,
  `Overheads add ${percent(annualCost / directCost - 1)} on top of the direct cost.`,
  "Buildings, racking and IT devices are provided by the customer.",
];

function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${accent ? "bg-blue-600 text-white" : "bg-[#f1f5fb]"}`}>
      <p className={`text-[11px] font-medium ${accent ? "text-blue-100" : "text-slate-600"}`}>{label}</p>
      <p className="mt-0.5 text-[24px] font-extrabold tracking-tight">{value}</p>
      <p className={`text-[11px] ${accent ? "text-blue-100" : "text-slate-500"}`}>{note}</p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
      {children}
    </section>
  );
}

// A donut drawn from stroked circle segments, one per cost block.
function CostDonut() {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          {COST_SHARES.map((block) => {
            const length = block.share * circumference;
            const segment = (
              <circle
                key={block.name}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={block.color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(length - 1, 0)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500">Total cost</span>
          <span className="text-[15px] font-extrabold tracking-tight">{millions(annualCost)}</span>
        </div>
      </div>
      <ul className="min-w-[180px] flex-1 space-y-2 text-[12px]">
        {COST_SHARES.map((block) => (
          <li key={block.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: block.color }} />
            <span className="flex-1">{block.name}</span>
            <span className="font-bold tabular-nums">{percent(block.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The total contract price on one scale, from the lowest offer we can make to the highest the market accepts.
function PriceRange() {
  const { lowest, target, offer, highest } = PRICE_RANGE;
  const padding = (highest - lowest) * 0.08;
  const min = lowest - padding;
  const max = highest + padding;
  const at = (value: number) => `${((value - min) / (max - min)) * 100}%`;
  const marks = [
    { label: "Lowest offer", value: lowest, note: "Break-even, no profit" },
    { label: "Our offer", value: offer, note: `${percent(1 - projectCost / offer)} margin`, ours: true },
    { label: "Highest offer", value: highest, note: `${percent(MARKET_CEILING_MARGIN)} margin, market limit` },
  ];

  return (
    <div className="mt-4">
      <div className="relative h-14">
        <div className="absolute top-[22px] h-3 w-full rounded-full bg-slate-100" />
        <div
          className="absolute top-[22px] h-3 rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300"
          style={{ left: at(lowest), width: `calc(${at(highest)} - ${at(lowest)})` }}
        />
        <div
          className="absolute top-[18px] h-5 w-0.5 -translate-x-1/2 bg-slate-500"
          style={{ left: at(target) }}
          title={`Target margin ${percent(RFQ.targetMargin)}: ${millions(target)}`}
        />
        <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: at(offer) }}>
          <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-white">
            Our offer {millions(offer)}
          </span>
          <span className="mx-auto mt-1 block h-7 w-0.5 bg-blue-600" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        {marks.map((mark) => (
          <div key={mark.label} className={`rounded-lg px-2.5 py-2 ${mark.ours ? "bg-blue-50 ring-1 ring-blue-200" : "bg-[#f1f5fb]"}`}>
            <p className="text-slate-600">{mark.label}</p>
            <p className="text-[14px] font-extrabold tabular-nums">{millions(mark.value)}</p>
            <p className="text-slate-500">{mark.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Total for the whole contract. The grey tick marks {millions(target)}, the price that reaches the{" "}
        {percent(RFQ.targetMargin)} target margin.
      </p>
    </div>
  );
}

function RevenueByService() {
  const largest = Math.max(...PROJECT_REVENUE_BY_SERVICE.map((service) => service.revenue));
  return (
    <ul className="mt-4 space-y-3 text-[12px]">
      {PROJECT_REVENUE_BY_SERVICE.map((service) => (
        <li key={service.name}>
          <div className="flex justify-between gap-2">
            <span>{service.name}</span>
            <span className="font-bold tabular-nums">{millions(service.revenue)}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${(service.revenue / largest) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Assumptions() {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6E98FF] to-[#2456E6] text-white">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold tracking-tight">Assumptions behind the numbers</h2>
          <p className="text-[11px] text-slate-500">What the cost calculation is based on</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-[12px]">
        {ASSUMPTIONS.map((assumption) => (
          <li key={assumption} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>{assumption}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function OfferPage() {
  const [sent, setSent] = useState(false);
  const belowTarget = projectMargin < RFQ.targetMargin;

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#e0e7f3]">
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight">Offer</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {RFQ.title} · {RFQ.customer} · bid decision
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="cursor-pointer rounded-lg bg-[#eef1f8] px-4 py-2 text-[12px] font-semibold transition hover:bg-slate-200 focus:ring-4 focus:ring-blue-100 focus:outline-none"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setSent(true)}
                disabled={sent}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:cursor-default disabled:bg-emerald-600"
              >
                {sent && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                {sent ? "Offer sent" : "Send offer"}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Kpi accent label="Project revenue" value={millions(projectRevenue)} note={RFQ.contractTerm} />
            <Kpi label="Project costs" value={millions(projectCost)} note="Incl. overheads and ramp-up" />
            <Kpi
              label="Profit margin"
              value={percent(projectMargin)}
              note={`${millions(projectRevenue - projectCost)} profit · target ${percent(RFQ.targetMargin)}${belowTarget ? ", not met" : ""}`}
            />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Where the cost goes" subtitle="Cost per full-volume year by block">
            <CostDonut />
          </Card>
          <Card title="Price range" subtitle="Total contract price, how low and how high we can go">
            <PriceRange />
          </Card>
          <Card title="Revenue by service" subtitle="What the customer pays for over the whole contract">
            <RevenueByService />
          </Card>
          <Assumptions />
        </div>
      </div>
    </main>
  );
}
