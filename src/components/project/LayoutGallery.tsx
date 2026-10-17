import { useRef } from "react";
import { ArrowRight, Check, Upload } from "lucide-react";
import { LAYOUTS, ZONE_COLORS, ZONE_LABELS, layoutSize } from "./layouts";
import LayoutPreview from "./LayoutPreview";

export type LayoutChoice = { kind: "example"; id: string } | { kind: "upload"; file: File };

type Props = {
  choice: LayoutChoice;
  onChoose: (choice: LayoutChoice) => void;
  onUse: () => void;
};

function SelectedBadge() {
  return (
    <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white shadow">
      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

function UploadCard({ file, onFile }: { file: File | null; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 px-5 py-6 text-center ${
        file ? "border-blue-600 bg-white shadow-lg shadow-blue-600/10" : "border-dashed border-slate-300 bg-white/50"
      }`}
    >
      {file && <SelectedBadge />}
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-white shadow-sm">
        <Upload className="size-5 text-blue-600" aria-hidden="true" />
      </div>
      <p className="text-[12.5px] font-semibold">Upload your floor plan</p>
      <p className="mt-1 text-[10px] leading-relaxed break-all text-slate-500">
        {file ? file.name : "PDF, DWG or image — we turn it into a 3D layout you can adjust."}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold transition hover:bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:outline-none"
      >
        {file ? "Choose another" : "Browse files"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.dwg,image/*"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) onFile(picked);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function LayoutGallery({ choice, onChoose, onUse }: Props) {
  const selectedLayout = choice.kind === "example" ? LAYOUTS.find((layout) => layout.id === choice.id) : undefined;
  const selectedSize = selectedLayout && layoutSize(selectedLayout);

  return (
    <main className="flex min-h-[calc(100vh-3rem)] flex-col">
      <div className="mx-auto w-full max-w-[880px] flex-1 px-4 pt-8 pb-10">
        <h1 className="text-[22px] font-extrabold tracking-tight">Choose a facility layout</h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[11px] text-slate-500">
            Start from an example or upload your own plan. You place the workstations on it next.
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {(["inbound", "warehouse", "lane", "production", "outbound"] as const).map((kind) => (
              <li key={kind} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="size-2 rounded-[3px]" style={{ backgroundColor: ZONE_COLORS[kind].edge }} />
                {ZONE_LABELS[kind]}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UploadCard
            file={choice.kind === "upload" ? choice.file : null}
            onFile={(file) => onChoose({ kind: "upload", file })}
          />
          {LAYOUTS.map((layout) => {
            const selected = layout.id === selectedLayout?.id;
            return (
              <button
                key={layout.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChoose({ kind: "example", id: layout.id })}
                className={`relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition focus:ring-4 focus:ring-blue-100 focus:outline-none ${
                  selected
                    ? "border-blue-600 shadow-lg shadow-blue-600/10"
                    : "border-transparent shadow-sm hover:border-slate-200"
                }`}
              >
                {selected && <SelectedBadge />}
                <div className="flex h-[118px] items-center justify-center bg-[#eef1f8] px-8 py-4">
                  <LayoutPreview layout={layout} />
                </div>
                <div className="flex-1 px-3 pt-3 pb-5">
                  <p className="text-[12.5px] font-semibold">{layout.name}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{layout.description}</p>
                  <p className="mt-2 text-[9px] text-slate-500">Best for: {layout.bestFor}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <p className="min-w-0 truncate text-[11px] text-slate-500">
          Selected:{" "}
          {selectedLayout && selectedSize ? (
            <>
              <span className="font-semibold text-slate-900">{selectedLayout.name}</span> · {selectedSize.length} ×{" "}
              {selectedSize.depth} m
            </>
          ) : (
            choice.kind === "upload" && <span className="font-semibold text-slate-900">{choice.file.name}</span>
          )}
        </p>
        <button
          type="button"
          onClick={onUse}
          // Uploaded plans can't be turned into a floor yet.
          disabled={!selectedLayout}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          Use this layout
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
