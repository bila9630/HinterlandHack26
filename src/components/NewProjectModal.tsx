import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { format, startOfToday } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type NewProjectInput = {
  customer: string;
  deadline: Date;
  files: File[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
};

const ACCEPTED_FILES = ".xlsx,.xls,.csv,.pdf";
const DEFAULT_DEADLINE = new Date(2026, 11, 20);

function CubeIcon() {
  return (
    <svg viewBox="0 0 40 44" className="size-4" aria-hidden="true">
      <polygon points="20,2 38,12 20,22 2,12" fill="#f7bf67" />
      <polygon points="2,12 20,22 20,42 2,32" fill="#e9a54a" />
      <polygon points="20,22 38,12 38,32 20,42" fill="#c97b2c" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function NewProjectModal({ open, onClose, onCreate }: Props) {
  const [customer, setCustomer] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>(DEFAULT_DEADLINE);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<{ customer?: string; deadline?: string }>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const customerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setCustomer("");
    setDeadline(DEFAULT_DEADLINE);
    setFiles([]);
    setErrors({});
    customerInput.current?.focus();
  }, [open]);

  useEffect(() => {
    // While the calendar is open, Escape only closes the calendar.
    if (!open || calendarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, calendarOpen, onClose]);

  if (!open) return null;

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customer.trim();
    const nextErrors = {
      customer: name ? undefined : "Enter a company name.",
      deadline: deadline ? undefined : "Pick a submission deadline.",
    };
    setErrors(nextErrors);
    if (!name || !deadline) return;

    onCreate({ customer: name, deadline, files });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
            <CubeIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="new-project-title" className="text-base font-bold tracking-tight">
              New tender project
            </h2>
            <p className="text-[10px] text-slate-500">
              Add the basics — you can change them later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label htmlFor="customer" className="mb-1 block text-[10px] font-semibold">
          Customer
        </label>
        <input
          id="customer"
          ref={customerInput}
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          placeholder="Company name"
          className={inputClass}
        />
        {errors.customer && <p className="mt-1 text-[10px] text-red-600">{errors.customer}</p>}

        <label htmlFor="deadline" className="mt-4 mb-1 block text-[10px] font-semibold">
          Submission deadline
        </label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            id="deadline"
            type="button"
            className={`${inputClass} flex items-center justify-between text-left`}
          >
            <span className={deadline ? "" : "text-slate-400"}>
              {deadline ? format(deadline, "dd.MM.yyyy") : "DD.MM.YYYY"}
            </span>
            <CalendarIcon className="size-3.5 text-slate-400" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={(date) => {
                setDeadline(date);
                setCalendarOpen(false);
              }}
              defaultMonth={deadline}
              disabled={{ before: startOfToday() }}
              weekStartsOn={1}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {errors.deadline && <p className="mt-1 text-[10px] text-red-600">{errors.deadline}</p>}

        <p className="mt-4 mb-1 text-[10px] font-semibold">Tender files</p>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-3 py-3.5 transition ${
            dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-[#f5f8fd] hover:border-blue-400"
          }`}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm">
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
              <path d="M6 9V2M3 5l3-3 3 3M2 11h8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">Drop Excel or PDF here</p>
            <p className="text-[10px] text-slate-500">or click to browse · optional</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[10px]"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="text-slate-400 transition hover:text-red-600"
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-[11px] font-semibold transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Create project
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
