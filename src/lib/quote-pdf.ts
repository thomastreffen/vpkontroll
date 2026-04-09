/**
 * PDF generation for quotes/tilbud.
 */
import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/crm-labels";

export interface QuotePdfContext {
  quoteNumber: string;
  version: number;
  customerName?: string;
  contactName?: string;
  address?: string;
  dealTitle?: string;
  validUntil?: string;
  createdAt?: string;
  notes?: string;
}

export interface QuotePdfLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  discount_percent?: number | null;
}

export function generateQuotePdf(
  lines: QuotePdfLine[],
  context: QuotePdfContext,
  totalAmount: number,
  vatAmount: number,
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
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Tilbud", margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`${context.quoteNumber} (v${context.version})`, margin, y);
  y += 8;

  // ── Info box ──
  const infoLines: string[] = [];
  if (context.createdAt) infoLines.push(`Dato: ${context.createdAt}`);
  if (context.validUntil) infoLines.push(`Gyldig til: ${context.validUntil}`);
  if (context.customerName) infoLines.push(`Kunde: ${context.customerName}`);
  if (context.contactName) infoLines.push(`Kontakt: ${context.contactName}`);
  if (context.address) infoLines.push(`Adresse: ${context.address}`);
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

  // ── Table header ──
  checkPageBreak(12);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const colX = {
    desc: margin,
    qty: margin + contentWidth * 0.5,
    unit: margin + contentWidth * 0.6,
    price: margin + contentWidth * 0.72,
    total: margin + contentWidth * 0.88,
  };

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("Beskrivelse", colX.desc, y);
  doc.text("Antall", colX.qty, y);
  doc.text("Enhet", colX.unit, y);
  doc.text("Enhetspris", colX.price, y);
  doc.text("Sum", colX.total, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ── Lines ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  for (const line of lines) {
    checkPageBreak(8);
    const descLines = doc.splitTextToSize(line.description, contentWidth * 0.48);
    doc.text(descLines[0] || "", colX.desc, y);
    doc.text(String(line.quantity), colX.qty, y);
    doc.text(line.unit || "stk", colX.unit, y);
    doc.text(formatCurrency(line.unit_price), colX.price, y);
    doc.text(formatCurrency(line.line_total), colX.total, y);
    y += 6;
    // Extra description lines
    for (let i = 1; i < descLines.length; i++) {
      checkPageBreak(6);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(descLines[i], colX.desc, y);
      y += 5;
    }
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
  }

  // ── Totals ──
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  checkPageBreak(25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Sum ekskl. MVA", margin, y);
  doc.setTextColor(40, 40, 40);
  doc.text(formatCurrency(totalAmount), colX.total, y);
  y += 6;

  doc.setTextColor(80, 80, 80);
  doc.text("MVA (25%)", margin, y);
  doc.setTextColor(40, 40, 40);
  doc.text(formatCurrency(vatAmount), colX.total, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(colX.price, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Totalt inkl. MVA", margin, y);
  doc.text(formatCurrency(totalAmount + vatAmount), colX.total, y);
  y += 10;

  // ── Notes ──
  if (context.notes) {
    checkPageBreak(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Merknader / vilkår", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(context.notes, contentWidth);
    for (const nl of noteLines) {
      checkPageBreak(5);
      doc.text(nl, margin, y);
      y += 5;
    }
  }

  // ── Footer ──
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
