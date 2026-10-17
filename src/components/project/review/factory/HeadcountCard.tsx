import { Users } from "lucide-react";
import { FactoryLayout, onShift } from "./layout";

// How many people are working on the floor right now.
export default function HeadcountCard({ layout }: { layout: FactoryLayout }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white py-2 pr-4 pl-2 text-[#0F1B33] shadow-[0_1px_2px_rgba(15,27,51,.06),0_10px_30px_rgba(15,27,51,.12)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#2456E6]">
        <Users size={17} />
      </span>
      <span className="leading-none">
        <span className="block text-[20px] font-extrabold tracking-tight">{onShift(layout)}</span>
        <span className="text-[12px] text-[#5A6782]">on shift</span>
      </span>
    </div>
  );
}
