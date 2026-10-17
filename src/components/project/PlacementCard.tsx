import { MousePointerClick, Move, RotateCw, Trash2, TriangleAlert, X } from "lucide-react";
import { ZONE_LABELS } from "./layouts";
import { WORKSTATION_ICONS } from "./WorkstationPanel";
import { WorkstationType } from "./workstations";

type Props = {
  type: WorkstationType;
  editing: boolean;
  dropped: boolean;
  problem: string | null;
  onRotate: () => void;
  onRemove: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function PlacementCard({ type, editing, dropped, problem, onRotate, onRemove, onCancel, onConfirm }: Props) {
  const Icon = WORKSTATION_ICONS[type.id];
  const zone = type.fits.map((kind) => (kind === "lane" ? "Lanes" : ZONE_LABELS[kind])).join(" · ");
  const status = !dropped
    ? { icon: MousePointerClick, text: "Click the floor to drop it", className: "bg-blue-50 text-blue-700" }
    : problem
      ? { icon: TriangleAlert, text: problem, className: "bg-red-50 text-red-700" }
      : { icon: Move, text: "Placing · snaps to the 1 m grid", className: "bg-blue-50 text-blue-700" };
  const StatusIcon = status.icon;
  const iconButton =
    "flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none";

  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/10">
      <div className="flex items-start gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: type.tone.bg, color: type.tone.fg }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-bold tracking-wide text-blue-600 uppercase">
            {editing ? "Placed" : "New"} · {zone}
          </p>
          <p className="text-[14px] font-bold tracking-tight">{type.name}</p>
        </div>
        {editing && (
          <button type="button" onClick={onRemove} className={iconButton} aria-label="Remove workstation">
            <Trash2 className="size-3.5" />
          </button>
        )}
        <button type="button" onClick={onCancel} className={iconButton} aria-label="Close">
          <X className="size-3.5" />
        </button>
      </div>

      <p className={`mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${status.className}`}>
        <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
        {status.text}
      </p>

      <dl className="mt-2">
        {type.specs.map((spec) => (
          <div key={spec.label} className="flex justify-between border-b border-slate-100 py-1.5 text-[11px] last:border-b-0">
            <dt className="text-slate-500">{spec.label}</dt>
            <dd className="font-semibold">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onRotate}
          title="Rotate (R)"
          aria-label="Rotate"
          className="flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
        >
          <RotateCw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!dropped || problem !== null}
          className="flex-1 cursor-pointer rounded-lg bg-blue-600 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          Place here
        </button>
      </div>
    </section>
  );
}
