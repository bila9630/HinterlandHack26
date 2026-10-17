import { FormEvent, useState } from "react";
import { Goods, TEMPERATURES, Temperature } from "./goods";

type Props = {
  onAdd: (goods: Omit<Goods, "id">) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-1 block text-[10px] text-slate-700";

function parseNumber(value: string) {
  return value.trim() ? Number(value.replace(",", ".")) : NaN;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default function AddGoodsForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState<Temperature>("ambient");
  const [stackable, setStackable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unitWidth = parseNumber(width);
    const unitLength = parseNumber(length);
    const unitHeight = parseNumber(height);
    const units = Number(quantity);
    const unitWeight = weight.trim() ? parseNumber(weight) : null;

    if (!name.trim()) return setError("Enter a name for the goods.");
    if (!(unitWidth > 0) || !(unitLength > 0) || !(unitHeight > 0)) {
      return setError("Enter width, length and height in cm.");
    }
    if (!Number.isInteger(units) || units < 1) return setError("Quantity must be at least 1.");
    if (unitWeight !== null && !(unitWeight > 0)) return setError("Weight must be a positive number.");

    onAdd({
      name: name.trim(),
      quantity: units,
      length: unitLength,
      width: unitWidth,
      height: unitHeight,
      weight: unitWeight,
      temperature,
      stackable,
    });
    setError(null);
    setName("");
    setWidth("");
    setLength("");
    setHeight("");
    setQuantity("");
    setWeight("");
    setStackable(false);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex size-7.5 items-center justify-center rounded-lg bg-blue-50 text-base text-blue-600">
          +
        </div>
        <h2 className="text-[15px] font-bold tracking-tight">Add goods</h2>
      </div>

      <label htmlFor="goods-name" className={labelClass}>
        Name
      </label>
      <input
        id="goods-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Packaged electronics"
        className={inputClass}
      />

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3">
        <NumberField id="goods-width" label="Width (cm)" value={width} onChange={setWidth} />
        <NumberField id="goods-length" label="Length (cm)" value={length} onChange={setLength} />
        <NumberField id="goods-height" label="Height (cm)" value={height} onChange={setHeight} />
        <NumberField id="goods-quantity" label="Quantity" value={quantity} onChange={setQuantity} />
        <NumberField
          id="goods-weight"
          label="Weight / unit"
          value={weight}
          onChange={setWeight}
          placeholder="kg"
        />
        <div>
          <label htmlFor="goods-temperature" className={labelClass}>
            Temperature
          </label>
          <select
            id="goods-temperature"
            value={temperature}
            onChange={(event) => setTemperature(event.target.value as Temperature)}
            className={inputClass}
          >
            {Object.entries(TEMPERATURES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-[11px]">
        Stackable
        <input
          type="checkbox"
          checked={stackable}
          onChange={(event) => setStackable(event.target.checked)}
          className="size-3.5 cursor-pointer accent-blue-600"
        />
      </label>

      {error && <p className="mt-2 text-[10px] text-red-600">{error}</p>}

      <button
        type="submit"
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
      >
        <span className="text-sm leading-none">+</span>
        Add to floor
      </button>
    </form>
  );
}
