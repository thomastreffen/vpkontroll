/**
 * PDF generation from dynamic form data.
 * Uses jsPDF to create a clean report document.
 */
import { jsPDF } from "jspdf";
import type { TemplateField } from "@/components/service/DynamicFormRenderer";

export interface PdfContext {
  title: string;
  templateName: string;
  customerName?: string;
  address?: string;
  siteName?: string;
  date?: string;
  technicianName?: string;
  agreementNumber?: string;
  jobNumber?: string;
  dealTitle?: string;
}

export interface SignoffData {
  technician_name: string;
  customer_name: string;
  signed_by_technician: boolean;
  signed_by_customer: boolean;
  signed_at: string | null;
  comment: string;
}

const CONDITION_LABELS: Record<number, string> = {
  1: "Kritisk",
  2: "Dårlig",
  3: "Akseptabel",
  4: "God",
  5: "Utmerket",
};

export function generateFormPdf(
  fields: TemplateField[],
  values: Record<string, any>,
  context: PdfContext,
  signoff?: SignoffData | null,
): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(context.title, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  if (context.templateName) {
    doc.text(`Mal: ${context.templateName}`, margin, y);
    y += 5;
  }
  if (context.date) {
    doc.text(`Dato: ${context.date}`, margin, y);
    y += 5;
  }

  y += 2;

  // ── Context info box ──
  const infoLines: string[] = [];
  if (context.customerName) infoLines.push(`Kunde: ${context.customerName}`);
  if (context.siteName) infoLines.push(`Anleggssted: ${context.siteName}`);
  if (context.address) infoLines.push(`Adresse: ${context.address}`);
  if (context.technicianName) infoLines.push(`Tekniker: ${context.technicianName}`);
  if (context.agreementNumber) infoLines.push(`Avtale: ${context.agreementNumber}`);
  if (context.jobNumber) infoLines.push(`Jobb: ${context.jobNumber}`);
  if (context.dealTitle) infoLines.push(`Deal: ${context.dealTitle}`);

  if (infoLines.length > 0) {
    const boxHeight = infoLines.length * 5 + 6;
    checkPageBreak(boxHeight + 5);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "F");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    infoLines.forEach((line, i) => {
      doc.text(line, margin + 4, y + 5 + i * 5);
    });
    y += boxHeight + 6;
  }

  // ── Separator ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Fields ──
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  for (const field of sorted) {
    const key = field.field_key || field.id;
    const val = values[key];

    switch (field.field_type) {
      case "section_header": {
        checkPageBreak(14);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(field.label, margin, y + 4);
        y += 10;
        if (field.help_text) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(120, 120, 120);
          doc.text(field.help_text, margin, y);
          y += 5;
        }
        break;
      }

      case "checkbox": {
        checkPageBreak(8);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const checked = !!val;
        const symbol = checked ? "[X]" : "[  ]";
        doc.text(`${symbol}  ${field.label}`, margin, y);
        y += 6;
        break;
      }

      case "checkbox_list": {
        checkPageBreak(8);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(field.label, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const opts: string[] = field.options?.choices || field.options || [];
        const selected: string[] = val || [];
        for (const opt of opts) {
          checkPageBreak(6);
          const sym = selected.includes(opt) ? "[X]" : "[  ]";
          doc.setTextColor(60, 60, 60);
          doc.text(`  ${sym}  ${opt}`, margin, y);
          y += 5;
        }
        y += 2;
        break;
      }

      case "measurement": {
        checkPageBreak(8);
        const mVal = val as { value?: number | null; unit?: string } | null;
        const unit = mVal?.unit || field.unit || field.options?.unit || "";
        const display = mVal?.value != null ? `${mVal.value} ${unit}` : "–";
        renderLabelValue(doc, field.label, display, margin, y);
        y += 7;
        break;
      }

      case "rating": {
        checkPageBreak(8);
        const rVal = val as number | null;
        const display = rVal != null ? `${rVal}/5 – ${CONDITION_LABELS[rVal] || ""}` : "–";
        renderLabelValue(doc, field.label, display, margin, y);
        y += 7;
        break;
      }

      case "dropdown": {
        checkPageBreak(8);
        renderLabelValue(doc, field.label, val || "–", margin, y);
        y += 7;
        break;
      }

      case "number": {
        checkPageBreak(8);
        const numDisplay = val != null ? String(val) + (field.unit ? ` ${field.unit}` : "") : "–";
        renderLabelValue(doc, field.label, numDisplay, margin, y);
        y += 7;
        break;
      }

      case "date": {
        checkPageBreak(8);
        renderLabelValue(doc, field.label, val || "–", margin, y);
        y += 7;
        break;
      }

      case "text": {
        checkPageBreak(8);
        renderLabelValue(doc, field.label, val || "–", margin, y);
        y += 7;
        break;
      }

      case "textarea": {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(field.label, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        const text = val || "–";
        const lines = doc.splitTextToSize(text, contentWidth);
        for (const line of lines) {
          checkPageBreak(5);
          doc.text(line, margin, y);
          y += 5;
        }
        y += 3;
        break;
      }

      case "file": {
        checkPageBreak(8);
        renderLabelValue(doc, field.label, val ? "Fil vedlagt" : "Ingen fil", margin, y);
        y += 7;
        break;
      }
    }
  }

  // ── Signoff section ──
  if (signoff) {
    checkPageBreak(35);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Signering / bekreftelse", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    if (signoff.technician_name) {
      const techStatus = signoff.signed_by_technician ? "Bekreftet" : "Ikke bekreftet";
      doc.text(`Tekniker: ${signoff.technician_name} – ${techStatus}`, margin, y);
      y += 6;
    }
    if (signoff.customer_name) {
      const custStatus = signoff.signed_by_customer ? "Bekreftet" : "Ikke bekreftet";
      doc.text(`Kunde: ${signoff.customer_name} – ${custStatus}`, margin, y);
      y += 6;
    }
    if (signoff.signed_at) {
      doc.text(`Signert: ${signoff.signed_at}`, margin, y);
      y += 6;
    }
    if (signoff.comment) {
      doc.text(`Kommentar: ${signoff.comment}`, margin, y);
      y += 6;
    }
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Generert ${new Date().toLocaleDateString("nb-NO")} – Side ${i} av ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );
  }

  return doc.output("blob");
}

function renderLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  const labelWidth = doc.getTextWidth(label) + 3;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(value, x + labelWidth, y);
}
