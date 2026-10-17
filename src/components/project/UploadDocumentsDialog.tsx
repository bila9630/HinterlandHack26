import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
};

type Source = "computer" | "drive";

export const DOCUMENT_TYPES = ".pdf,.xls,.xlsx,.csv,.doc,.docx,image/*";
const READ_DURATION = 1000;
const READ_STEPS = ["Uploading documents…", "Reading tables and drawings…", "Extracting quantities and dimensions…"];

export function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tabClass(active: boolean) {
  return `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
    active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
  }`;
}

export default function UploadDocumentsDialog({ open, onClose, onUpload }: Props) {
  const [source, setSource] = useState<Source>("computer");
  const [staged, setStaged] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reading]);

  if (!open) return null;

  function stage(files: FileList | null) {
    if (!files?.length) return;
    setStaged((current) => {
      const known = new Set(current.map(fileKey));
      return [...current, ...Array.from(files).filter((file) => !known.has(fileKey(file)))];
    });
  }

  function close() {
    if (reading !== null) return;
    reset();
  }

  function reset() {
    setStaged([]);
    setDragging(false);
    setSource("computer");
    setReading(null);
    onClose();
  }

  // Simulated reading of the documents before they are handed over.
  function upload() {
    if (!staged.length || reading !== null) return;
    const files = staged;
    const started = Date.now();
    setReading(0);
    timer.current = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / READ_DURATION);
      setReading(progress);
      if (progress < 1) return;
      window.clearInterval(timer.current);
      onUpload(files);
      reset();
    }, 60);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-documents-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upload-documents-title" className="text-[16px] font-bold tracking-tight">
            Upload documents
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <button type="button" onClick={() => setSource("computer")} className={tabClass(source === "computer")}>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2" y="3" width="12" height="8" rx="1" />
              <path d="M6 14h4M8 11v3" strokeLinecap="round" />
            </svg>
            From computer
          </button>
          <button type="button" onClick={() => setSource("drive")} className={tabClass(source === "drive")}>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 2.5h4l4 7-2 3.5H4L2 9.5z" strokeLinejoin="round" />
            </svg>
            Google Drive
          </button>
        </div>

        {reading !== null ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-8 text-center">
            <span className="mb-3 size-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
            <p className="text-[13px] font-semibold">
              {READ_STEPS[Math.min(READ_STEPS.length - 1, Math.floor(reading * READ_STEPS.length))]}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {staged.length} {staged.length === 1 ? "document" : "documents"} · {Math.round(reading * 100)}%
            </p>
            <div className="mt-3 h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${reading * 100}%` }} />
            </div>
          </div>
        ) : source === "computer" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              stage(event.dataTransfer.files);
            }}
            className={`flex flex-col items-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
              dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50/60"
            }`}
          >
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 11V3M4.5 6.5 8 3l3.5 3.5M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold">Drag files here</p>
            <p className="my-1.5 text-[11px] text-slate-500">or</p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={DOCUMENT_TYPES}
              onChange={(event) => {
                stage(event.target.files);
                event.target.value = "";
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Select files from your computer
            </button>
            <p className="mt-2 text-[10px] text-slate-500">PDF, Excel, Word, CSV or images</p>

            {staged.length > 0 && (
              <ul className="mt-3 w-full space-y-1 text-left">
                {staged.map((file) => (
                  <li
                    key={fileKey(file)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setStaged((current) => current.filter((item) => item !== file))}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 text-slate-400 transition hover:text-red-600"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
            <p className="text-[13px] font-semibold">Google Drive</p>
            <p className="mt-1 text-[11px] text-slate-500">Connecting to Google Drive is coming soon.</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={close}
            disabled={reading !== null}
            className="rounded-lg bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 py-2 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={!staged.length || reading !== null}
            className="rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reading !== null ? "Reading…" : <>Upload{staged.length > 0 && ` (${staged.length})`}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
