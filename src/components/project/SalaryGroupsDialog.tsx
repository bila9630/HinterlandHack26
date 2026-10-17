import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WorkerAvatar } from "./WorkerFigure";
import { ROLES, RoleId, TARIFF_GROUPS, TariffId } from "./people";

type Props = {
  open: boolean;
  tariffs: Record<RoleId, TariffId>;
  onClose: () => void;
  onSave: (tariffs: Record<RoleId, TariffId>) => void;
};

const wage = (value: number) => `€${value.toFixed(2)}/h`;
const tariff = (id: TariffId) => TARIFF_GROUPS.find((group) => group.id === id)!;

// Picks the salary group (Tarif-Stufe) each worker type is paid by.
export default function SalaryGroupsDialog({ open, tariffs, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(tariffs);

  // Start from the saved groups every time the dialog opens.
  useEffect(() => {
    if (open) setDraft(tariffs);
  }, [open, tariffs]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="salary-groups-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="salary-groups-title" className="text-[16px] font-bold tracking-tight">
              Salary groups
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Choose the Tarif-Stufe each worker type is paid by</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {ROLES.map((role) => {
            const chosen = tariff(draft[role.id]);
            return (
              <li key={role.id} className="rounded-xl bg-[#f1f5fb] p-3">
                <div className="flex items-center gap-2.5">
                  <WorkerAvatar tone={role.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{role.name}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {chosen.id} · {chosen.description}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold">{wage(chosen.wage)}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3" role="radiogroup" aria-label={`${role.name} salary group`}>
                  {TARIFF_GROUPS.map((group) => {
                    const active = group.id === draft[role.id];
                    return (
                      <button
                        key={group.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={`${group.id} · ${group.description} · ${wage(group.wage)}`}
                        onClick={() => setDraft({ ...draft, [role.id]: group.id })}
                        className={`cursor-pointer rounded-lg border py-2 text-center transition focus:ring-4 focus:ring-blue-100 focus:outline-none ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="block text-[11px] font-bold">{group.id}</span>
                        <span className={`block text-[9px] ${active ? "text-blue-100" : "text-slate-500"}`}>
                          €{group.wage.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-100 py-2 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
