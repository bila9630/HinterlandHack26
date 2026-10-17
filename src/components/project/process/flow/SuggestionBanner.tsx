import { Sparkles } from "lucide-react";
import { useProcessContext } from "../ProcessContext";
import { stationName } from "../model";

// Offers a route derived from the layout while the process has fewer than two steps.
export default function SuggestionBanner() {
  const { sim, steps, suggestion, applySuggestion } = useProcessContext();
  if (sim || steps.length >= 2 || suggestion.length < 2) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-[12px]">
        <span className="font-semibold text-blue-700">Suggested from your layout: </span>
        <span className="font-semibold">{suggestion.map((station) => stationName(station.kind)).join(" → ")}</span>
      </p>
      <button
        type="button"
        onClick={applySuggestion}
        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
      >
        Use suggestion
      </button>
    </div>
  );
}
