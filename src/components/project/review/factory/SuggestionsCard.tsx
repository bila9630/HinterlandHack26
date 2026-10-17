import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Suggestion } from "./layout";

// Ideas for the hall drawn from this shift's simulation. The header folds the list away.
export default function SuggestionsCard({
  suggestions,
  onTry,
}: {
  suggestions: Suggestion[];
  onTry?: (suggestion: Suggestion) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex max-h-[calc(100vh-8rem)] w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-3xl bg-white text-[#0F1B33] shadow-[0_1px_2px_rgba(15,27,51,.06),0_10px_30px_rgba(15,27,51,.12)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E98FF] to-[#2456E6] text-white">
          <Sparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-tight font-bold">AI suggestions</span>
          <span className="block truncate text-[12px] text-[#5A6782]">Based on this shift's simulation</span>
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-[#45526C]">
          {suggestions.length} {suggestions.length === 1 ? "idea" : "ideas"}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#45526C] transition-transform duration-200 ${open ? "" : "-rotate-180"}`}
        />
      </button>

      {/* Folds by animating the row height between the list's own height and zero. */}
      <div
        className={`grid min-h-0 transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <ol className="min-h-0 overflow-y-auto px-4">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} className="flex gap-3 border-t border-[#E2E7F0] py-3.5 last:pb-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[11px] font-bold text-[#2456E6]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{suggestion.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#5A6782]">{suggestion.body}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-[#E5F6EC] px-2 py-1 text-[12px] font-bold text-[#137A3F]">
                    {suggestion.impact}
                  </span>
                  <button
                    type="button"
                    onClick={() => onTry?.(suggestion)}
                    className="rounded-lg bg-[#EEF3FF] px-2.5 py-1 text-[12px] font-semibold text-[#2456E6] hover:bg-[#DCE6FF]"
                  >
                    Try in simulation
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
