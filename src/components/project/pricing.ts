// Sample pricing for the Review and Offer steps until the earlier steps feed real numbers in.

export const RFQ = {
  id: "RFQ202613463",
  title: "just-in-sequence delivery, Sindelfingen hall H40",
  customer: "Schnellecke Modul GmbH",
  contractTerm: "2028 – 2032 (5 years)",
  firstYear: 2028,
  contractYears: 5,
  validUntil: "28.02.2027",
  vehiclesPerYear: 61_677,
  targetMargin: 0.07,
};

export type PriceItem = { name: string; charged: string; unitPrice: number; perYear: number };

export const PRICE_SHEET: PriceItem[] = [
  { name: "Goods receipt and storage", charged: "per load unit received", unitPrice: 15.55, perYear: 2_652_742 },
  { name: "Sequencing", charged: "per part sequenced", unitPrice: 0.56, perYear: 1_688_108 },
  { name: "Vehicle handling", charged: "per vehicle", unitPrice: 3.91, perYear: 241_158 },
  { name: "Transport", charged: "per round trip", unitPrice: 115.94, perYear: 723_476 },
];

// Direct cost first, then the overheads stacked on top of it.
export const COST_STEPS = [
  { name: "Direct", amount: 4_368_000 },
  { name: "Regional allocation", amount: 112_000 },
  { name: "Admin", amount: 108_000 },
  { name: "Group apportionment", amount: 198_000 },
  { name: "Insurance", amount: 107_485 },
  { name: "Financing", amount: 19_000 },
];

export const COST_SHARES = [
  { name: "Operative staff", share: 0.512, color: "#2563eb" },
  { name: "Equipment leasing", share: 0.137, color: "#6b95f8" },
  { name: "External area (optional)", share: 0.122, color: "#0f1d3d" },
  { name: "Surcharges", share: 0.111, color: "#e5a03c" },
  { name: "Other (area, supplies)", share: 0.117, color: "#a3b1d6" },
];

export const STAFF_COST_PER_VEHICLE = [
  { phase: "Start-up", cost: 19.09 },
  { phase: "Mixed", cost: 19.52 },
  { phase: "1 shift", cost: 39.79 },
  { phase: "2 shifts", cost: 37.75 },
];

// Share of the planned full volume, month by month after production starts.
export const RAMP_UP = [0.2, 0.26, 0.41, 0.36, 0.53, 0.47, 0.64, 0.61, 0.74];
export const rampUpPlan = (month: number) => Math.min(0.2 + 0.1 * month, 1);

export const annualRevenue = PRICE_SHEET.reduce((sum, item) => sum + item.perYear, 0);
export const annualCost = COST_STEPS.reduce((sum, step) => sum + step.amount, 0);
export const annualProfit = annualRevenue - annualCost;

// Leasing, area and overheads run at full cost from day one; the rest scales with volume.
export const FIXED_COST_SHARE = 0.25;
// The highest margin we expect a customer to accept, from comparable tenders.
export const MARKET_CEILING_MARGIN = 0.12;

// Year one runs at the ramp-up plan's average volume, every later year at full volume.
const firstYearVolume = Array.from({ length: 12 }, (_, month) => rampUpPlan(month)).reduce((a, b) => a + b, 0) / 12;

export const PROJECT_YEARS = Array.from({ length: RFQ.contractYears }, (_, index) => {
  const volume = index === 0 ? firstYearVolume : 1;
  const revenue = annualRevenue * volume;
  const cost = annualCost * (FIXED_COST_SHARE + (1 - FIXED_COST_SHARE) * volume);
  return { year: RFQ.firstYear + index, volume, revenue, cost, profit: revenue - cost };
});

export const projectRevenue = PROJECT_YEARS.reduce((sum, year) => sum + year.revenue, 0);
export const projectCost = PROJECT_YEARS.reduce((sum, year) => sum + year.cost, 0);
export const projectMargin = (projectRevenue - projectCost) / projectRevenue;

// Total price for the whole contract: the lowest offer breaks even, the highest is what the market still accepts.
export const PRICE_RANGE = {
  lowest: projectCost,
  target: projectCost / (1 - RFQ.targetMargin),
  offer: projectRevenue,
  highest: projectCost / (1 - MARKET_CEILING_MARGIN),
};

// Revenue per service over the whole contract, following the yearly volume.
const contractVolume = PROJECT_YEARS.reduce((sum, year) => sum + year.volume, 0);
export const PROJECT_REVENUE_BY_SERVICE = PRICE_SHEET.map((item) => ({ name: item.name, revenue: item.perYear * contractVolume }));

const euroFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const centsFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export const euros = (value: number) => euroFormat.format(value);
export const cents = (value: number) => centsFormat.format(value);
export const millions = (value: number) => `€${(value / 1_000_000).toFixed(2)}M`;
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
