import { useState } from "react";
import { Search, X } from "lucide-react";
import { ZONE_LABELS } from "../../layouts";
import StationArt from "../../StationArt";
import { NextOption, Station, stationName } from "../model";

type Props = {
  options: NextOption[];
  // Before the first stop there is nothing to measure from.
  showDistance: boolean;
  onPick: (station: Station) => void;
  onClose: () => void;
};

// Search box with the next stops to choose from, nearest first.
export default function StationChooser({ options, showDistance, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) =>
    stationName(option.station.kind).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="w-[250px] self-start">
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-blue-600" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && onClose()}
          placeholder="Choose next workstation…"
          className="w-full rounded-xl border-2 border-blue-600 bg-white py-2.5 pr-8 pl-8 text-[12px] shadow-sm ring-4 ring-blue-100 focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </label>
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <p className="px-1.5 pt-1 pb-1.5 text-[9px] font-bold tracking-wide text-slate-500 uppercase">
          {showDistance ? "Nearest first" : "Workstations"}
        </p>
        <ul>
          {filtered.map(({ station, distance }) => (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => onPick(station)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-blue-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2fb]">
                  <StationArt kind={station.kind} className="size-9" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">{stationName(station.kind)}</span>
                  <span className="block text-[9px] text-slate-500">{ZONE_LABELS[station.zone]}</span>
                </span>
                {showDistance && <span className="text-[10px] font-semibold text-slate-600">{distance} m</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-1.5 py-2 text-[11px] text-slate-500">No match</li>}
        </ul>
      </div>
    </div>
  );
}
