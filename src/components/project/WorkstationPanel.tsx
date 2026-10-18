import { Boxes, Columns3, Factory, Forklift, LucideIcon, Package, Sparkles } from "lucide-react";
import { WORKSTATION_TYPES, WorkstationTypeId, fitsLabel } from "./workstations";

export const WORKSTATION_ICONS: Record<WorkstationTypeId, LucideIcon> = {
  "pallet-rack": Columns3,
  "assembly-line": Factory,
  "packing-table": Package,
  "pallet-staging": Boxes,
  forklift: Forklift,
};

type Props = {
  counts: Record<string, number>;
  placingTypeId: WorkstationTypeId | null;
  onPick: (typeId: WorkstationTypeId) => void;
  onAutoPlace: () => void;
  onContinue: () => void;
};

export default function WorkstationPanel({ counts, placingTypeId, onPick, onAutoPlace, onContinue }: Props) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
      <h1 className="text-[15px] font-bold tracking-tight">Add workstations</h1>
      <p className="mt-0.5 text-[10px] text-slate-500">Drag onto a matching zone on the floor</p>

      <ul className="mt-3 space-y-2">
        {WORKSTATION_TYPES.map((type) => {
          const Icon = WORKSTATION_ICONS[type.id];
          const placing = type.id === placingTypeId;
          return (
            <li key={type.id}>
              {/* Pointer down starts placing, so the item can be dragged straight onto the floor. */}
              <button
                type="button"
                onPointerDown={() => onPick(type.id)}
                onClick={(event) => event.detail === 0 && onPick(type.id)}
                className={`flex w-full cursor-grab items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition select-none focus:ring-4 focus:ring-blue-100 focus:outline-none ${
                  placing ? "border-blue-600 bg-blue-50/60" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: type.tone.bg, color: type.tone.fg }}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">{type.name}</span>
                  <span className="block truncate text-[9px] text-slate-500">Fits: {fitsLabel(type)}</span>
                </span>
                {placing ? (
                  <span className="text-[10px] font-semibold text-blue-600">Placing</span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-600">{counts[type.id] ?? 0}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onContinue}
        className="mt-3 w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none"
      >
        Continue to process →
      </button>

      <div className="my-3 flex items-center gap-2 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={onAutoPlace}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
      >
        <Sparkles className="size-3.5 text-blue-600" aria-hidden="true" />
        FloorGenie AI
      </button>
    </section>
  );
}
