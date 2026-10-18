import type { jsPDF } from "jspdf";
import { PRICE_SHEET, RFQ, annualRevenue, cents, euros } from "../pricing";
import data from "./deckData.json";

// The client proposal deck in the Schnellecke format, ported from the presentation builder
// kit (design/presentation-builder-migration-kit). Until the earlier steps feed it, every
// download is the same synthetic proposal. Slides are 1280 × 720, one pt per px.

const W = 1280;
const H = 720;
const C = {
  green: "#008D5A",
  dark: "#006B46",
  ink: "#18352C",
  grey: "#61736B",
  pale: "#E8F1ED",
  line: "#C9D8D1",
  white: "#FFFFFF",
  orange: "#E26B27",
  stripe: "#F0F5F2",
};
const LINE_HEIGHT = 1.2;

type TextOptions = {
  size?: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "right";
  valign?: "top" | "middle";
};

function deck(doc: jsPDF) {
  let pageNo = 0;

  function text(value: unknown, x: number, y: number, w: number, h: number, opts: TextOptions = {}) {
    const size = opts.size ?? 22;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(opts.color ?? C.ink);
    const lines: string[] = doc.splitTextToSize(String(value ?? ""), w);
    const height = lines.length * size * LINE_HEIGHT;
    const top = opts.valign === "top" ? y : y + Math.max(0, (h - height) / 2);
    const right = opts.align === "right";
    doc.text(lines, right ? x + w : x, top, { baseline: "top", align: right ? "right" : "left" });
  }

  function rect(x: number, y: number, w: number, h: number, fill: string) {
    doc.setFillColor(fill);
    doc.rect(x, y, w, h, "F");
  }

  function newSlide(title: string, section: string, cover = false) {
    if (pageNo > 0) doc.addPage([W, H], "landscape");
    pageNo++;
    if (cover) {
      rect(0, 0, W, H, C.dark);
      rect(0, 0, W, 12, C.orange);
      text("SCHNELLECKE LOGISTICS", 78, 60, 600, 34, { size: 18, bold: true, color: C.white });
      text(title, 78, 190, 900, 112, { size: 48, bold: true, color: C.white });
      rect(78, 324, 74, 6, C.orange);
      text(`${data.customer}\n${data.location}\n${data.proposal_date}  |  ${data.revision}`, 78, 366, 820, 116, {
        size: 22,
        color: "#E7F2ED",
      });
      text("CLIENT PROPOSAL | DRAFT FOR REVIEW", 78, 634, 650, 30, { size: 15, bold: true, color: "#B8D5C8" });
      return;
    }
    rect(0, 0, W, 8, C.green);
    text(section.toUpperCase(), 72, 34, 1000, 22, { size: 14, bold: true, color: C.green });
    text(title, 72, 66, 1136, 54, { size: 34, bold: true, color: C.dark });
    rect(72, 132, 1136, 1, C.line);
    rect(72, 674, 1136, 1, C.line);
    text(`${data.project}  |  ${data.rfq}`, 72, 680, 920, 20, { size: 12, color: C.grey });
    text(String(pageNo).padStart(2, "0"), 1150, 680, 58, 20, { size: 12, color: C.grey, align: "right" });
  }

  function bullets(rows: string[], x = 88, y = 168, width = 1080, size = 23, step = 62) {
    rows.forEach((row, i) => {
      // Centred on the text, which sits in the middle of its row.
      rect(x, y + i * step + (step - 4) / 2 - 4.5, 9, 9, C.green);
      text(row, x + 25, y + i * step, width - 25, step - 4, { size });
    });
  }

  function table(headers: string[], rows: string[][], x: number, y: number, widths: number[], rowH = 43, size = 18) {
    const total = widths.reduce((a, b) => a + b, 0);
    rect(x, y, total, rowH, C.dark);
    let cx = x;
    headers.forEach((header, i) => {
      text(header, cx + 8, y + 3, widths[i] - 14, rowH - 6, { size: size - 1, bold: true, color: C.white });
      cx += widths[i];
    });
    rows.forEach((row, ri) => {
      const yy = y + rowH * (ri + 1);
      if (ri % 2 === 0) rect(x, yy, total, rowH, C.stripe);
      rect(x, yy + rowH - 1, total, 1, C.line);
      let xx = x;
      row.forEach((value, i) => {
        text(value, xx + 8, yy + 2, widths[i] - 14, rowH - 4, { size });
        xx += widths[i];
      });
    });
  }

  function paragraph(value: string, x = 88, y = 168, w = 1080, h = 340, size = 22) {
    text(value, x, y, w, h, { size, valign: "top" });
  }

  function stepCards(lines: string[], x: number, y: number, cols = 2) {
    const gap = 24;
    const cardW = (1080 - gap * (cols - 1)) / cols;
    const cardH = 104;
    lines.forEach((line, i) => {
      const xx = x + (i % cols) * (cardW + gap);
      const yy = y + Math.floor(i / cols) * (cardH + 18);
      text(String(i + 1).padStart(2, "0"), xx, yy, 58, 48, { size: 28, bold: true, color: C.green });
      text(line.replace(/^\d+\.\s*/, ""), xx + 66, yy, cardW - 76, cardH, { size: 22, valign: "top" });
      rect(xx, yy + cardH + 7, cardW, 1, C.line);
    });
  }

  const lines = (value: string) => value.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const fields = (value: string) => value.split("|").map((part) => part.trim());

  newSlide(data.project, "Proposal", true);

  newSlide("Agenda", "Proposal");
  bullets(
    [
      "1  Company and project contacts",
      "2  Logistics concept and process description",
      "3  Personnel and training concept",
      "4  Implementation and start-up",
      "5  Quality, safety, environment and lean",
      "6  Commercial offer, conditions and assumptions",
    ],
    120, 170, 980, 24, 66,
  );

  newSlide("Why Schnellecke Logistics", "1  Company and contacts");
  paragraph(data.company_pitch, 88, 168, 1080, 160, 22);
  text("COMPANY PROFILE", 88, 342, 420, 25, { size: 15, bold: true, color: C.green });
  paragraph(data.company_profile, 88, 376, 1080, 130, 20);

  newSlide("Project contacts", "1  Company and contacts");
  const contacts = [
    ["Tender manager", data.contact],
    ...lines(data.additional_contacts).map((row) => {
      const [role, ...contact] = fields(row);
      return [role, contact.join(" | ")];
    }),
  ];
  table(["Role", "Contact"], contacts, 88, 174, [300, 860], 56, 18);

  newSlide("Project profile", "1  Company and contacts");
  table(
    ["Item", "Proposal input"],
    [
      ["Customer", data.customer],
      ["RFQ and revision", `${data.rfq} | ${data.revision}`],
      ["Service", data.service_scope],
      ["Location", data.location],
      ["Contract period", `${data.sop} to ${data.eop}`],
      ["Proposal date", data.proposal_date],
    ],
    88, 156, [320, 840], 51, 18,
  );

  newSlide("Relevant operating experience", "1  Company and contacts");
  const references = lines(data.references).map((row) => {
    const [name, scope, ...scale] = fields(row);
    return [name, scope, scale.join(" | ")];
  });
  table(["Reference", "Scope", "Scale"], references, 88, 178, [330, 510, 320], 58, 17);
  text("Replace illustrative entries with approved, permissioned customer references.", 88, 410, 1070, 56, {
    size: 17,
    color: C.grey,
  });

  newSlide("Logistics concept and process description", "2  Logistics concept");
  text("02", 80, 220, 160, 100, { size: 76, bold: true, color: C.green });
  text(data.service_scope, 280, 220, 820, 144, { size: 32, bold: true, color: C.dark });

  newSlide("Contract and operating facts", "2  Logistics concept");
  table(
    ["Topic", "Planning basis"],
    [
      ["Contract", `${data.sop} to ${data.eop}`],
      ["Award milestone", data.award],
      ["Operating calendar", `${data.workdays} working days per year`],
      ["Shift model", data.shifts],
      ["Mix phase", data.mix_phase],
      ["Scope", data.service_scope],
    ],
    88, 154, [290, 870], 61, 17,
  );

  newSlide("Site footprint and operating areas", "2  Logistics concept");
  paragraph(data.site_summary, 88, 170, 1080, 180, 24);
  bullets(
    [
      "Confirm the external site lease and availability before award commitment.",
      "Finalize zone layout, route distances and storage capacity during detailed design.",
    ],
    88, 408, 1080, 19, 60,
  );

  newSlide("Volumes by operating phase", "2  Logistics concept");
  table(
    ["Flow", "Volume", "Unit", "Phase"],
    data.flows.map((row) => [row.Flow, row.Volume.toLocaleString("en-US"), row.Unit, row.Phase]),
    72, 152, [340, 130, 290, 396], 55, 15,
  );

  newSlide("End-to-end operating process", "2  Logistics concept");
  stepCards(lines(data.process_steps), 92, 164, 2);

  newSlide("Inbound receipt and storage", "2  Logistics concept");
  table(
    ["Activity", "Operating method", "Control point"],
    [
      ["Truck arrival and unload", "Side unload to inbound buffer", "Load-unit count and damage check"],
      ["Receipt booking", "Scan, verify and book to WMS", "Part, quantity and label match"],
      ["Put-away", "Move to block or rack location", "Location scan and FIFO rule"],
      ["Replenishment", "Move stock to sequencing zone", "Production call and stock check"],
    ],
    80, 166, [270, 490, 396], 67, 16,
  );

  newSlide("Sequencing, dispatch and transport", "2  Logistics concept");
  bullets(
    [
      "Pick parts against the production call and sequence requirements.",
      "Record every sequence and resequence movement at the load-carrier level.",
      "Stage completed JIS racks at the agreed handover zone.",
      "Transport racks to the production assembly halls using planned round trips.",
      "Return empty racks to the designated buffer and report shortages or damage.",
    ],
    88, 170, 1080, 21, 76,
  );

  newSlide("Personnel plan by role", "2  Logistics concept");
  table(
    ["Role", "H40", "External", "Planning basis"],
    data.resource_rows.map((row) => [row.Role, String(row.H40), String(row.External), row.Basis]),
    80, 160, [440, 120, 140, 456], 58, 17,
  );
  text(
    "Indicative workstations by operating location. Confirm shift allocation and gross headcount coverage before release.",
    80, 630, 1080, 32, { size: 16, color: C.grey },
  );

  newSlide("Equipment and responsibilities", "2  Logistics concept");
  paragraph(data.equipment, 88, 156, 1080, 130, 20);
  table(
    ["Responsibility area", "Customer", "Provider / shared"],
    [
      ["H40 building and core infrastructure", "Customer", ""],
      ["External warehouse and supplementary equipment", "", "Provider"],
      ["Process, master data and interfaces", "", "Shared"],
    ],
    88, 324, [470, 300, 406], 60, 16,
  );

  newSlide("Personnel and training concept", "3  Personnel and training");
  paragraph(data.hr_training, 88, 160, 1080, 280, 21);
  bullets(
    [
      "Recruitment and onboarding follow the approved role plan.",
      "Training records, practical checks and site authorizations are prerequisites for assignment.",
    ],
    88, 476, 1080, 18, 58,
  );

  newSlide("Recruitment and qualification", "3  Personnel and training");
  stepCards(
    [
      "Confirm role demand and required qualifications",
      "Recruit and assess candidates",
      "Train systems, safety and task steps",
      "Complete supervised live-process practice",
      "Record qualification and refresher dates",
    ],
    92, 170, 2,
  );

  newSlide("Implementation and start-up plan", "4  Implementation");
  table(
    ["Milestone", "Target"],
    lines(data.implementation).map((row) => {
      const [milestone, target] = fields(row);
      return [milestone, target ?? "Date to confirm"];
    }),
    88, 155, [800, 360], 54, 17,
  );

  newSlide("Continuity, IT and governance", "4  Implementation");
  paragraph(data.contingency, 88, 158, 1080, 160, 21);
  bullets(
    [
      "Daily operating review and named escalation route",
      "Joint IT interface testing before production start",
      "Customer approval of incident response and continuity steps",
    ],
    88, 370, 1080, 19, 65,
  );

  newSlide("Quality, safety and sustainability", "5  Quality, environment and lean");
  paragraph(data.quality_safety, 88, 152, 1080, 210, 19);
  text("CERTIFICATIONS AND SCOPE", 88, 372, 540, 25, { size: 15, bold: true, color: C.green });
  paragraph(data.certifications, 88, 402, 1080, 80, 17);
  text("SUSTAINABILITY AND LEAN", 88, 492, 540, 25, { size: 15, bold: true, color: C.green });
  paragraph(`${data.sustainability}\n\n${data.lean_approach}`, 88, 522, 1080, 105, 15);

  // The price sheet from the Offer step, in the deck's table style.
  newSlide("Commercial offer", "6  Commercial offer and conditions");
  table(
    ["Item", "Charged", "Unit price", "Per year"],
    [
      ...PRICE_SHEET.map((item) => [item.name, item.charged, cents(item.unitPrice), euros(item.perYear)]),
      ["Total", "", `${cents(annualRevenue / RFQ.vehiclesPerYear)} / vehicle`, euros(annualRevenue)],
    ],
    88, 160, [340, 360, 230, 230], 56, 18,
  );
  text(`Indicative annual prices for the mixed phase. Offer valid until ${RFQ.validUntil}.`, 88, 520, 1080, 32, {
    size: 16,
    color: C.grey,
  });

  newSlide("Conditions, assumptions and open points", "6  Commercial offer and conditions");
  paragraph(data.assumptions, 88, 150, 1080, 180, 19);
  paragraph(data.conditions, 88, 360, 1080, 210, 19);

  newSlide("Thank you", "Closing", true);
}

export async function downloadClientDeck() {
  // jsPDF is only needed once someone downloads, so it stays out of the main bundle.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [W, H] });
  doc.setLineHeightFactor(LINE_HEIGHT);
  deck(doc);
  doc.save(`${data.rfq.toLowerCase()}-client-proposal.pdf`);
}
