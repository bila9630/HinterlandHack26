import { useState } from "react";
import { Check } from "lucide-react";
import { PRICE_SHEET, RFQ, annualRevenue, cents, euros } from "./pricing";

const KEY_TERMS = [
  ["Customer", RFQ.customer],
  ["Contract term", RFQ.contractTerm],
  ["Valid until", RFQ.validUntil],
  ["Buildings, racking, IT devices", "Provided by the customer"],
];

export default function OfferPage() {
  const [sent, setSent] = useState(false);
  const pricePerVehicle = annualRevenue / RFQ.vehiclesPerYear;

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#e0e7f3]">
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight">Offer</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">{RFQ.title} · draft for customer</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="cursor-pointer rounded-lg bg-[#eef1f8] px-4 py-2 text-[12px] font-semibold transition hover:bg-slate-200 focus:ring-4 focus:ring-blue-100 focus:outline-none"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setSent(true)}
                disabled={sent}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:cursor-default disabled:bg-emerald-600"
              >
                {sent && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                {sent ? "Offer sent" : "Send offer"}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-blue-600 px-4 py-3 text-white">
              <p className="text-[11px] font-medium text-blue-100">Annual price, mixed phase</p>
              <p className="mt-0.5 text-[24px] font-extrabold tracking-tight">{euros(annualRevenue)}</p>
            </div>
            <div className="rounded-xl bg-[#f1f5fb] px-4 py-3">
              <p className="text-[11px] font-medium text-slate-600">Price per vehicle</p>
              <p className="mt-0.5 text-[24px] font-extrabold tracking-tight">{cents(pricePerVehicle)}</p>
            </div>
            <div className="rounded-xl bg-[#f1f5fb] px-4 py-3">
              <p className="text-[11px] font-medium text-slate-600">Valid until</p>
              <p className="mt-0.5 text-[24px] font-extrabold tracking-tight">{RFQ.validUntil}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold tracking-tight">Price sheet</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Indicative prices for a typical year</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-1.5 py-2 font-semibold">Item</th>
                  <th className="px-1.5 py-2 font-semibold">Charged</th>
                  <th className="px-1.5 py-2 text-right font-semibold">Unit price</th>
                  <th className="px-1.5 py-2 text-right font-semibold">Per year</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_SHEET.map((item) => (
                  <tr key={item.name} className="border-b border-slate-200 last:border-slate-900">
                    <td className="px-1.5 py-2.5 font-semibold">{item.name}</td>
                    <td className="px-1.5 py-2.5 text-slate-600">{item.charged}</td>
                    <td className="px-1.5 py-2.5 text-right font-bold tabular-nums">{cents(item.unitPrice)}</td>
                    <td className="px-1.5 py-2.5 text-right tabular-nums">{euros(item.perYear)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-900">
                  <td className="px-1.5 py-2.5 font-bold" colSpan={2}>
                    Total
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-bold tabular-nums">{cents(pricePerVehicle)} / vehicle</td>
                  <td className="px-1.5 py-2.5 text-right tabular-nums">{euros(annualRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold tracking-tight">Key terms</h2>
          <dl className="mt-3 divide-y divide-slate-200 border-t border-slate-200 text-[12px]">
            {KEY_TERMS.map(([term, value]) => (
              <div key={term} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-600">{term}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
