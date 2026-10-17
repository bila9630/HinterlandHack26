import { ReactNode } from "react";
import { useProcessContext } from "./ProcessContext";

export const BOTTLENECK = "#d97706";
export const DOTTED = { backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "18px 18px" };

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[16px] font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export function Arrow({ dashed = false, muted = false }: { dashed?: boolean; muted?: boolean }) {
  return (
    <span className="flex w-full items-center" aria-hidden="true">
      <span className={`flex-1 border-t-2 ${dashed ? "border-dashed" : ""} ${muted ? "border-slate-300" : "border-blue-600"}`} />
      <span
        className={`border-y-[5px] border-l-[7px] border-y-transparent ${muted ? "border-l-slate-300" : "border-l-blue-600"}`}
      />
    </span>
  );
}

export function Dot({ filled = false, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <span
      className={`absolute top-[92px] size-4 -translate-y-1/2 rounded-full border-2 border-blue-600 ${
        filled ? "bg-blue-600" : "bg-white"
      } ${className}`}
    />
  );
}

// The way on to the next project step, once the process has at least two stops.
export function ContinueButton({ className = "" }: { className?: string }) {
  const { steps, onContinue } = useProcessContext();
  return (
    <button
      type="button"
      disabled={steps.length < 2}
      onClick={onContinue}
      className={`cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
    >
      Continue to people →
    </button>
  );
}
