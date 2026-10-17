import { Fragment } from "react";
import { Link, useLocation } from "react-router";

const STEPS = ["Goods", "Lanes", "Transport", "Costs", "Review", "Offer"];

function LogoCube() {
  return (
    <svg viewBox="0 0 40 44" className="size-6" aria-hidden="true">
      <polygon points="20,2 38,12 20,22 2,12" fill="#6b95f8" />
      <polygon points="2,12 20,22 20,42 2,32" fill="#3d6cf0" />
      <polygon points="20,22 38,12 38,32 20,42" fill="#2449c9" />
    </svg>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Project steps" className="hidden items-center gap-2.5 md:flex">
      {STEPS.map((step, index) => (
        <Fragment key={step}>
          {index > 0 && <span className="h-px w-3 bg-slate-300" aria-hidden="true" />}
          <span
            aria-current={index === current ? "step" : undefined}
            className={`rounded-full px-3 py-1.5 text-[11px] whitespace-nowrap ${
              index === current ? "bg-blue-600 font-semibold text-white" : "font-medium text-slate-500"
            }`}
          >
            <span className="mr-1.5">{index + 1}</span>
            {step}
          </span>
        </Fragment>
      ))}
    </nav>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const inProject = pathname.startsWith("/project");

  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-7">
      <Link to="/" className="flex items-center gap-2.5">
        <LogoCube />
        <span className="text-lg font-bold tracking-tight">CostCube</span>
      </Link>
      {inProject && <Stepper current={0} />}
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
          LE
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold">Logistics expert</p>
          <p className="text-[11px] text-slate-500">Pricing team</p>
        </div>
      </div>
    </header>
  );
}
