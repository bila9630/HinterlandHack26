import { Leg } from "../metrics";
import { ProcessStep, TRANSPORTS, Transport } from "../model";
import { Arrow } from "../ui";

type Props = {
  // The step the leg leads to, and the leg itself.
  step: ProcessStep;
  leg: Leg;
  open: boolean;
  onToggle: () => void;
  onPick: (transport: Transport) => void;
};

// The arrow between two steps; clicking it chooses how the pallet gets there.
export default function TransportPicker({ step, leg, open, onToggle, onPick }: Props) {
  return (
    <div className="relative mt-[80px] w-[110px] px-2">
      <button
        type="button"
        onClick={onToggle}
        className="block w-full cursor-pointer text-center text-[10px] leading-tight text-slate-600 hover:text-blue-700"
      >
        <Arrow dashed />
        <span className="mt-1.5 block">{Math.round(leg.distance)} m</span>
        <span className="block">{TRANSPORTS[leg.transport].name.toLowerCase()}</span>
      </button>
      {open && (
        <div className="absolute top-full left-1/2 z-20 mt-2 w-[230px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="text-[12px] font-bold">How does the pallet get there?</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {Object.entries(TRANSPORTS).map(([id, transport]) => (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id as Transport)}
                className={`cursor-pointer rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                  step.transport === id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {transport.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Distance from layout: <span className="font-semibold text-slate-900">{Math.round(leg.distance)} m</span>
          </p>
        </div>
      )}
    </div>
  );
}
