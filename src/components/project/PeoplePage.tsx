import { RefObject, useState } from "react";
import { Html } from "@react-three/drei";
import { Frown, Minus, Plus, Smile } from "lucide-react";
import { FacilityLayout } from "./layouts";
import LayoutScene from "./LayoutScene";
import WorkerFigure, { WorkerAvatar } from "./WorkerFigure";
import { PlacedWorkstation } from "./workstations";
import {
  MAX_DAYS,
  ROLES,
  RoleId,
  SHIFT_HOURS,
  Staffing,
  headcount,
  staffCost,
  teamMood,
  thousands,
  workerSpots,
} from "./people";

type Props = {
  layout: FacilityLayout;
  workstations: PlacedWorkstation[];
  staffing: Staffing;
  onStaffingChange: (staffing: Staffing) => void;
  onContinue: () => void;
};

const MAX_PER_ROLE = 20;
const wage = (value: number) => `€${value.toFixed(2)}/h`;

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const button =
    "flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className={button}
        aria-label={`Fewer ${label}s`}
      >
        <Minus className="size-3" strokeWidth={3} />
      </button>
      <span className="w-5 text-center text-[12px] font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_PER_ROLE}
        className={button}
        aria-label={`More ${label}s`}
      >
        <Plus className="size-3" strokeWidth={3} />
      </button>
    </div>
  );
}

function DaysSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold">{value} days</span>
      </div>
      <input
        type="range"
        min={0}
        max={MAX_DAYS}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full cursor-pointer accent-blue-600"
        aria-label={label}
      />
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>0</span>
        <span>{MAX_DAYS} days</span>
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition focus:ring-4 focus:ring-blue-100 focus:outline-none ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

function CostCard({ staffing }: { staffing: Staffing }) {
  const cost = staffCost(staffing);
  const mood = teamMood(staffing);
  const Face = mood.happy ? Smile : Frown;
  const rows = [
    { label: "Staff cost", value: thousands(cost.staff) },
    { label: "Backup workers", value: `+${thousands(cost.backup)}` },
    { label: "Christmas bonus", value: staffing.christmasBonus ? `+${thousands(cost.bonus)}` : "—" },
  ];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
      <h2 className="text-[13px] font-bold tracking-tight">Cost to company</h2>
      <p className="mt-1 text-[24px] leading-none font-bold tracking-tight">{thousands(cost.total)}</p>
      <p className="mt-1.5 text-[10px] text-slate-500">
        {cost.people.toFixed(1)} people per year, including backup workers
      </p>

      <dl className="mt-2 border-t border-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between border-b border-slate-100 py-1.5 text-[11px] last:border-b-0">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-[#f1f5fb] px-3 py-2.5">
        <Face
          className={`size-7 shrink-0 ${mood.happy ? "text-emerald-600" : "text-amber-600"}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-snug font-semibold">{mood.reason}</p>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="meter"
            aria-label="Team happiness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={mood.score}
          >
            <div
              className={`h-full rounded-full transition-all ${mood.happy ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${mood.score}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PeoplePage({ layout, workstations, staffing, onStaffingChange, onContinue }: Props) {
  const [selected, setSelected] = useState<RoleId | null>(null);
  const people = headcount(staffing);
  const update = (patch: Partial<Staffing>) => onStaffingChange({ ...staffing, ...patch });

  function setCount(role: RoleId, count: number) {
    setSelected(role);
    update({ counts: { ...staffing.counts, [role]: Math.min(Math.max(count, 0), MAX_PER_ROLE) } });
  }

  return (
    <main className="relative flex flex-col bg-[#e0e7f3] lg:block lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
      <div className="relative order-2 h-[60vh] lg:absolute lg:inset-0 lg:right-[260px] lg:left-[240px] lg:h-auto">
        <LayoutScene
          layout={layout}
          showLabels={false}
          quiet
          workstations={workstations}
          overlay={(labels) =>
            ROLES.map((role) => {
              const spots = workerSpots(layout, workstations, role, staffing.counts[role.id]);
              const [first] = spots;
              return (
                <group key={role.id}>
                  {spots.map(([x, z], index) => (
                    <WorkerFigure
                      key={index}
                      x={x}
                      z={z}
                      color={role.tone.fg}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(role.id);
                      }}
                    />
                  ))}
                  {selected === role.id && first && (
                    <Html
                      portal={labels as RefObject<HTMLElement>}
                      position={[first[0], 0.6, first[1]]}
                      center
                      zIndexRange={[5, 0]}
                    >
                      <span
                        className="pointer-events-none rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-sm"
                        style={{ backgroundColor: role.tone.fg }}
                      >
                        {role.name} ×{spots.length}
                      </span>
                    </Html>
                  )}
                </group>
              );
            })
          }
        />
      </div>

      <div className="relative z-10 order-1 m-4 space-y-3 lg:absolute lg:top-4 lg:bottom-4 lg:left-4 lg:m-0 lg:w-[280px] lg:overflow-y-auto">
        <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
          <h1 className="text-[15px] font-bold tracking-tight">People</h1>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {people} {people === 1 ? "person" : "people"} · {SHIFT_HOURS} h shifts
          </p>

          <ul className="mt-3 space-y-1.5">
            {ROLES.map((role) => (
              <li
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-2 transition ${
                  selected === role.id ? "border-blue-600 bg-blue-50/70" : "border-transparent bg-[#f1f5fb] hover:border-slate-200"
                }`}
              >
                <WorkerAvatar tone={role.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{role.name}</p>
                  <p className="text-[9px] text-slate-500">{wage(role.wage)}</p>
                </div>
                <Stepper
                  label={role.name.toLowerCase()}
                  value={staffing.counts[role.id]}
                  onChange={(count) => setCount(role.id, count)}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onContinue}
            disabled={people === 0}
            className="mt-3 w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Continue to review →
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/5">
          <h2 className="text-[13px] font-bold tracking-tight">Configuration</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Sick days, vacation and bonus per person</p>

          <div className="mt-3 space-y-3">
            <DaysSlider label="Sick days" value={staffing.sickDays} onChange={(sickDays) => update({ sickDays })} />
            <DaysSlider
              label="Vacation days"
              value={staffing.vacationDays}
              onChange={(vacationDays) => update({ vacationDays })}
            />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
              <span className="text-slate-600">Christmas bonus</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{staffing.christmasBonus ? "On" : "Off"}</span>
                <Switch
                  label="Christmas bonus"
                  checked={staffing.christmasBonus}
                  onChange={(christmasBonus) => update({ christmasBonus })}
                />
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="relative z-10 order-3 m-4 lg:absolute lg:top-4 lg:right-4 lg:m-0 lg:w-[244px]">
        <CostCard staffing={staffing} />
      </div>
    </main>
  );
}
