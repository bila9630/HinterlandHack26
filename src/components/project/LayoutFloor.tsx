import { useEffect, useState } from "react";
import { FacilityLayout, TILE, ZONE_COLORS, ZONE_LABELS, formatArea, layoutSize, layoutZones } from "./layouts";
import LayoutScene, { FloorPointer, SceneDraft } from "./LayoutScene";
import PlacementCard from "./PlacementCard";
import WorkstationPanel from "./WorkstationPanel";
import {
  PlacedWorkstation,
  Placement,
  WorkstationTypeId,
  autoPlace,
  placementProblem,
  snapPlacement,
  workstationType,
} from "./workstations";

export type FloorMode = "summary" | "workstations";

type Props = {
  layout: FacilityLayout;
  mode: FloorMode;
  workstations: PlacedWorkstation[];
  onWorkstationsChange: (workstations: PlacedWorkstation[]) => void;
  onChangeLayout: () => void;
  onAddWorkstations: () => void;
  onContinue: () => void;
};

// The workstation being placed. It follows the pointer until it is dropped, and
// picking it up again (pointer down on the floor) lets it be dragged elsewhere.
type Draft = {
  typeId: WorkstationTypeId;
  placement: Placement | null;
  dropped: boolean;
  editingId?: string;
};

function LayoutSummary({
  layout,
  placedCount,
  onChangeLayout,
  onAddWorkstations,
}: {
  layout: FacilityLayout;
  placedCount: number;
  onChangeLayout: () => void;
  onAddWorkstations: () => void;
}) {
  const { length, depth } = layoutSize(layout);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
      <p className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">Facility layout</p>
      <h1 className="mt-0.5 text-[15px] font-bold tracking-tight">{layout.name}</h1>
      <p className="text-[10px] text-slate-500">
        {length} × {depth} m · {formatArea(length * depth)} · 1 square = {TILE} × {TILE} m
      </p>

      <ul className="mt-3">
        {layoutZones(layout).map((zone) => (
          <li
            key={zone.kind}
            className="flex items-center gap-2.5 border-b border-slate-100 py-2 text-[11px] last:border-b-0"
          >
            <span
              className="size-3 rounded-[4px] border-2"
              style={{ backgroundColor: ZONE_COLORS[zone.kind].fill, borderColor: ZONE_COLORS[zone.kind].edge }}
            />
            <span className="flex-1 font-medium">
              {zone.kind === "lane" ? "Forklift lanes" : ZONE_LABELS[zone.kind]}
            </span>
            <span className="text-slate-500">{formatArea(zone.area)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        {placedCount === 0
          ? "The floor is empty. Next, place your workstations on the zones."
          : `${placedCount} workstation${placedCount === 1 ? "" : "s"} placed.`}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onChangeLayout}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
        >
          Change layout
        </button>
        <button
          type="button"
          onClick={onAddWorkstations}
          className="flex-1 cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none"
        >
          Add workstations →
        </button>
      </div>
    </section>
  );
}

export default function LayoutFloor({
  layout,
  mode,
  workstations,
  onWorkstationsChange,
  onChangeLayout,
  onAddWorkstations,
  onContinue,
}: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftType = draft && workstationType(draft.typeId);
  const others = workstations.filter((item) => item.id !== draft?.editingId);
  const problem = draftType && draft.placement ? placementProblem(layout, draftType, draft.placement, others) : null;
  const sceneDraft: SceneDraft | null =
    draftType && draft.placement
      ? { type: draftType, placement: draft.placement, problem, editingId: draft.editingId }
      : null;

  const counts: Record<string, number> = {};
  for (const item of workstations) counts[item.typeId] = (counts[item.typeId] ?? 0) + 1;

  function handleFloorPointer(event: FloorPointer, x: number, z: number) {
    if (!draft || !draftType) return;
    const placement = snapPlacement(layout, draftType, { x, z, rotated: draft.placement?.rotated ?? false });
    if (event === "move" && !draft.dropped) setDraft({ ...draft, placement });
    if (event === "down" && draft.dropped) setDraft({ ...draft, placement, dropped: false });
    if (event === "up" && !draft.dropped) {
      // A new workstation dropped on a valid spot is placed straight away; otherwise the
      // card stays open to explain the problem or to confirm a move.
      if (!draft.editingId && !placementProblem(layout, draftType, placement, workstations)) {
        onWorkstationsChange([...workstations, { ...placement, typeId: draft.typeId, id: crypto.randomUUID() }]);
        setDraft(null);
      } else {
        setDraft({ ...draft, placement, dropped: true });
      }
    }
  }

  function rotate() {
    if (!draft || !draftType || !draft.placement) return;
    const placement = { ...draft.placement, rotated: !draft.placement.rotated };
    setDraft({ ...draft, placement: snapPlacement(layout, draftType, placement) });
  }

  function confirm() {
    if (!draft || !draft.placement || !draft.dropped || problem) return;
    const placed = { ...draft.placement, typeId: draft.typeId, id: draft.editingId ?? crypto.randomUUID() };
    onWorkstationsChange(draft.editingId ? [...others, placed] : [...workstations, placed]);
    setDraft(null);
  }

  function remove() {
    if (draft?.editingId) onWorkstationsChange(others);
    setDraft(null);
  }

  function select(id: string) {
    const item = workstations.find((workstation) => workstation.id === id);
    if (!item) return;
    const placement = { x: item.x, z: item.z, rotated: item.rotated };
    setDraft({ typeId: item.typeId, placement, dropped: true, editingId: id });
  }

  // Escape cancels, R rotates.
  useEffect(() => {
    if (!draft) return;
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape") setDraft(null);
      if (event.key === "r" || event.key === "R") rotate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const placing = mode === "workstations";

  return (
    <main className="relative flex flex-col bg-[#e0e7f3] lg:block lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <div className="relative order-2 h-[60vh] lg:absolute lg:inset-0 lg:h-auto">
        <LayoutScene
          covered={{ left: 200 }}
          layout={layout}
          showLabels={!placing}
          workstations={workstations}
          draft={placing ? sceneDraft : null}
          onFloorPointer={placing ? handleFloorPointer : undefined}
          onSelectWorkstation={placing ? select : undefined}
        />
      </div>
      <div className="relative z-10 order-1 m-4 lg:absolute lg:top-4 lg:left-4 lg:m-0 lg:w-[264px]">
        {placing ? (
          <WorkstationPanel
            counts={counts}
            placingTypeId={draft?.typeId ?? null}
            onPick={(typeId) => setDraft({ typeId, placement: null, dropped: false })}
            onAutoPlace={() => {
              setDraft(null);
              onWorkstationsChange(autoPlace(layout, workstations));
            }}
            onContinue={onContinue}
          />
        ) : (
          <LayoutSummary
            layout={layout}
            placedCount={workstations.length}
            onChangeLayout={onChangeLayout}
            onAddWorkstations={onAddWorkstations}
          />
        )}
      </div>
      {placing && draft && draftType && (
        <div className="relative z-10 order-3 m-4 lg:absolute lg:right-4 lg:bottom-4 lg:m-0 lg:w-[248px]">
          <PlacementCard
            type={draftType}
            editing={Boolean(draft.editingId)}
            dropped={draft.dropped && draft.placement !== null}
            problem={problem}
            onRotate={rotate}
            onRemove={remove}
            onCancel={() => setDraft(null)}
            onConfirm={confirm}
          />
        </div>
      )}
    </main>
  );
}
