import { Fragment } from "react";
import { Link, useLocation } from "react-router";
import { Check } from "lucide-react";
import { STEPS, useStep } from "@/hooks/useStep";

function LogoCube() {
  return (
    <svg viewBox="0 0 40 44" className="size-6" aria-hidden="true">
      <polygon points="20,2 38,12 20,22 2,12" fill="#6b95f8" />
      <polygon points="2,12 20,22 20,42 2,32" fill="#3d6cf0" />
      <polygon points="20,22 38,12 38,32 20,42" fill="#2449c9" />
    </svg>
  );
}

function Stepper() {
  const [current, setStep] = useStep();

  return (
    <nav aria-label="Project steps" className="hidden items-center gap-2.5 md:flex">
      {STEPS.map((step, index) => (
        <Fragment key={step}>
          {index > 0 && <span className="h-px w-3 bg-slate-300" aria-hidden="true" />}
          <button
            type="button"
            onClick={() => setStep(index)}
            aria-current={index === current ? "step" : undefined}
            className={`flex cursor-pointer items-center rounded-full px-3 py-1.5 text-[11px] whitespace-nowrap transition-colors ${
              index === current
                ? "bg-blue-600 font-semibold text-white"
                : index < current
                  ? "bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100"
                  : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {index < current ? (
              <Check className="mr-1.5 size-3" strokeWidth={3} aria-label="Done" />
            ) : (
              <span className="mr-1.5">{index + 1}</span>
            )}
            {step}
          </button>
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
      {inProject && <Stepper />}
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
