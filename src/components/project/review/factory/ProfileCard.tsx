import { ReactNode } from "react";
import { Crosshair, X } from "lucide-react";

export type ShiftPart = { label: string; color: string; share: number };

export const percent = (share: number) => `${Math.round(share * 100)} %`;

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-t border-[#E2E7F0] py-2.5 text-[13px]">
      <span className="text-[#45526C]">{label}</span>
      <span className="text-[#0F1B33]">{children}</span>
    </div>
  );
}

// The card a selected person or vehicle opens: who or what it is, what it is doing, a few
// figures, and how its shift has gone so far.
export default function ProfileCard({
  icon,
  eyebrow,
  title,
  subtitle,
  status,
  detail,
  shift,
  following,
  onFollow,
  onClose,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  status: string;
  detail?: string;
  shift?: ShiftPart[];
  following: boolean;
  onFollow: () => void;
  onClose: () => void;
  // The figures, as Rows.
  children?: ReactNode;
}) {
  return (
    <div className="w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 text-[#0F1B33] shadow-[0_1px_2px_rgba(15,27,51,.06),0_10px_30px_rgba(15,27,51,.12)]">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF]">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold tracking-wide text-[#2456E6] uppercase">{eyebrow}</p>
          <p className="truncate text-[22px] leading-tight font-extrabold tracking-tight">{title}</p>
          {subtitle && <p className="truncate text-[12px] text-[#5A6782]">{subtitle}</p>}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onFollow}
            aria-pressed={following}
            title={following ? "Stop following" : "Show on the floor"}
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
        <span className="shrink-0 rounded-lg bg-[#E5F6EC] px-2.5 py-1 font-bold text-[#137A3F]">{status}</span>
        {detail && <span className="truncate text-[#5A6782]">{detail}</span>}
      </div>

      {children}

      {shift && (
        <div className="border-t border-[#E2E7F0] pt-2.5">
          <p className="mb-2 text-[12px] font-bold text-[#2456E6]">Time this shift</p>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {shift.map((part) => (
              <div key={part.label} style={{ width: `${part.share * 100}%`, backgroundColor: part.color }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-1 text-[10.5px] whitespace-nowrap text-[#45526C]">
            {shift.map((part) => (
              <span key={part.label} className="flex items-center gap-[3px]">
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: part.color }} />
                {part.label} {percent(part.share)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
