import { useSearchParams } from "react-router";

export const STEPS = ["Goods", "Workstations", "Process", "People", "Review", "Offer"];

// The current step lives in the URL (?step=1..6) so the header and the page share it.
export function useStep() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get("step")) || 1;
  const step = Math.min(Math.max(requested, 1), STEPS.length) - 1;
  const setStep = (index: number) => setSearchParams({ step: String(index + 1) });
  return [step, setStep] as const;
}
