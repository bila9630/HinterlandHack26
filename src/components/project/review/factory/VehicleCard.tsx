import { ReactNode } from "react";
import { Crosshair, X } from "lucide-react";
import { Vehicle } from "./layout";
import { ForkliftSprite, PalletJackSprite } from "./parts/Vehicle";

const TYPE_NAMES: Record<Vehicle["type"], string> = { forklift: "Forklift", palletJackWithWorker: "Pallet jack" };
const SHIFT_PARTS = [
  { key: "driving", label: "Driving", color: "#2456E6" },
  { key: "lifting", label: "Lifting", color: "#6E98FF" },
  { key: "waiting", label: "Waiting", color: "#E8871E" },
  { key: "idle", label: "Idle", color: "#D5DCE8" },
] as const;

const percent = (share: number) => `${Math.round(share * 100)} %`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-t border-[#E2E7F0] py-2.5 text-[13px]">
      <span className="text-[#45526C]">{label}</span>
      <span className="text-[#0F1B33]">{children}</span>
    </div>
  );
}

// The selected vehicle's profile: who drives it, what it is doing, and how its shift went.
export default function VehicleCard({
  vehicle,
  following,
  onFollow,
  onClose,
}: {
  vehicle: Vehicle;
  following: boolean;
  onFollow: () => void;
  onClose: () => void;
}) {
  const profile = vehicle.profile;
  const forklift = vehicle.type === "forklift";
  return (
    <div className="w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 text-[#0F1B33] shadow-[0_1px_2px_rgba(15,27,51,.06),0_10px_30px_rgba(15,27,51,.12)]">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF]">
          <svg viewBox={forklift ? "-32 -62 82 78" : "-42 -52 72 66"} className="h-12 w-12" aria-hidden="true">
            {forklift ? <ForkliftSprite loaded /> : <PalletJackSprite />}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold tracking-wide text-[#2456E6] uppercase">
            {TYPE_NAMES[vehicle.type]}
            {profile && ` · ${profile.hall}`}
          </p>
          <p className="text-[22px] leading-tight font-extrabold tracking-tight">{vehicle.id}</p>
          {profile && (
            <p className="truncate text-[12px] text-[#5A6782]">
              Driver {profile.driver} · {profile.capacity}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onFollow}
            aria-pressed={following}
            title={following ? "Stop following" : "Follow on the floor"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              following ? "border-[#2456E6] bg-[#2456E6] text-white" : "border-[#D5DCE8] text-[#45526C] hover:bg-[#F3F6FB]"
            }`}
          >
            <Crosshair size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D5DCE8] text-[#45526C] hover:bg-[#F3F6FB]"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 mb-3 flex items-center gap-2 text-[12px]">
        <span className="shrink-0 rounded-lg bg-[#E5F6EC] px-2.5 py-1 font-bold text-[#137A3F]">
          {profile?.status ?? vehicle.task}
        </span>
        {profile && <span className="truncate text-[#5A6782]">{profile.job}</span>}
      </div>

      {profile && (
        <>
          <Row label="Avg. move time">
            <b>{profile.avgMoveMin.toLocaleString("en", { maximumFractionDigits: 1 })} min</b>
          </Row>
          <Row label="Utilisation">
            <b>{percent(profile.utilisation)}</b>
          </Row>
          <Row label="Cost per hour">
            <b>€ {profile.costPerHour}</b> <span className="text-[#5A6782]">({profile.costNote})</span>
          </Row>
          <div className="border-t border-[#E2E7F0] pt-2.5">
            <p className="mb-2 text-[12px] font-bold text-[#2456E6]">Time this shift</p>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {SHIFT_PARTS.map((part) => (
                <div key={part.key} style={{ width: `${profile.shift[part.key] * 100}%`, backgroundColor: part.color }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between gap-1.5 text-[11px] whitespace-nowrap text-[#45526C]">
              {SHIFT_PARTS.map((part) => (
                <span key={part.key} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: part.color }} />
                  {part.label} {percent(profile.shift[part.key])}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
