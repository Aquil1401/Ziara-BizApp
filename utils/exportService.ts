// utils/exportService.ts
// Handles Excel (xlsx) and PDF (jsPDF) export — runs 100% in the browser

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportRow {
  [key: string]: string | number | undefined;
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export const exportToExcel = async (
  sheets: { name: string; columns: ExportColumn[]; rows: ExportRow[] }[],
  filename: string
) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, columns, rows }) => {
    // Header row
    const header = columns.map((c) => c.header);
    // Data rows
    const data = rows.map((row) => columns.map((c) => row[c.key] ?? ""));
    const wsData = [header, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

    // Style header row bold (basic)
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "EEF2FF" } } };
    }

    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ─── PDF Export ───────────────────────────────────────────────────────────────

export const exportToPDF = async (
  title: string,
  subtitle: string,
  sections: { heading: string; columns: string[]; rows: (string | number)[][] }[],
  filename: string
) => {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(title, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 31);

  let y = 38;

  sections.forEach(({ heading, columns, rows }) => {
    if (heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(heading, 14, y);
      y += 4;
    }

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows.map((row) => row.map((v) => (typeof v === "number" ? v.toLocaleString("en-IN") : v))),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  });

  doc.save(`${filename}.pdf`);
};

export const exportInvoiceToPDF = async (
  invoice: any,
  businessInfo: { 
    name: string; 
    address: string; 
    phone: string; 
    email: string; 
    gstin?: string;
    bankDetails: {
      name: string;
      accountName: string;
      accountNo: string;
      branch: string;
      ifsc: string;
    }
  }
) => {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { amountToWords } = await import("./formatUtils");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Helper for drawing grid boxes
  const drawBox = (x: number, y: number, w: number, h: number, title?: string) => {
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(x, y, w, h);
    if (title) {
       doc.setFillColor(248, 250, 252); // slate-50
       doc.rect(x, y, w, 5, 'F');
       doc.setFont("helvetica", "bold");
       doc.setFontSize(7);
       doc.setTextColor(100, 116, 139); // slate-500
       doc.text(title.toUpperCase(), x + 2, y + 3.5);
    }
  };

  // 1. TOP HEADER - TAX INVOICE
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("TAX INVOICE", pageWidth / 2, 18, { align: "center" });

  if (businessInfo.gstin) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSTIN: ${businessInfo.gstin}`, pageWidth / 2, 22, { align: "center" });
  }

  // 2. BUSINESS INFO
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(businessInfo.name, margin, 28);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(businessInfo.address, margin, 33);
  doc.text(`Phone: ${businessInfo.phone} | Email: ${businessInfo.email}`, margin, 37);

  // 3. INVOICE META GRID
  let currentY = 45;
  const colWidth = contentWidth / 3;

  drawBox(margin, currentY, colWidth, 18, "Invoice Details");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Inv #: ${invoice.invoiceNumber}`, margin + 3, currentY + 10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${invoice.date}`, margin + 3, currentY + 14);

  drawBox(margin + colWidth, currentY, colWidth, 18, "Transport / Order");
  doc.setFontSize(8);
  doc.text(`Order No: ${invoice.orderNo || "-"}`, margin + colWidth + 3, currentY + 10);
  doc.text(`E-Way Bill: ${invoice.eWayBillNo || "-"}`, margin + colWidth + 3, currentY + 14);

  drawBox(margin + (colWidth * 2), currentY, colWidth, 18, "Shipping / Destination");
  doc.text(`Through: ${invoice.dispatchedThrough || "-"}`, margin + (colWidth * 2) + 3, currentY + 10);
  doc.text(`Dest: ${invoice.destination || "-"}`, margin + (colWidth * 2) + 3, currentY + 14);

  // 4. BILL TO
  currentY += 22;
  drawBox(margin, currentY, contentWidth, 22, "Bill To");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(invoice.customerName || "Cash Sale", margin + 5, currentY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`, margin + 5, currentY + 14);
  if (invoice.customerAddress) doc.text(invoice.customerAddress, margin + 5, currentY + 18, { maxWidth: contentWidth - 10 });

  // 5. ITEMS TABLE
  const tableData = invoice.items.map((item: any, idx: number) => [
    idx + 1,
    item.description || "N/A",
    item.hsnCode || "-",
    item.quantity || 0,
    item.rate?.toFixed(2) || "0.00",
    `${item.taxRate || 0}%`,
    item.total?.toFixed(2) || "0.00"
  ]);

  autoTable(doc, {
    startY: currentY + 28,
    head: [["#", "Description", "HSN/SAC", "Qty", "Rate", "GST", "Amount"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5, font: "helvetica" },
    headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: "bold", lineWidth: 0.1, lineColor: [203, 213, 225] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 30, halign: "right" }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 6. TOTALS & WORDS
  drawBox(margin, currentY, contentWidth * 0.65, 10, "Total in Words");
  doc.setFontSize(7);
  doc.text(amountToWords(invoice.total || 0), margin + 3, currentY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`Total (Incl. Tax): INR ${invoice.total?.toFixed(2)}`, pageWidth - margin, currentY + 7, { align: "right" });

  // 7. BOTTOM GRID (GST Summary & Bank Details)
  currentY += 15;
  const footerColWidth = contentWidth / 2;

  // Tax Summary Table (Simplified in PDF)
  drawBox(margin, currentY, footerColWidth, 35, "GST Summary");
  const taxSummary = invoice.items.reduce((acc: any, item: any) => {
    const rate = item.taxRate || 0;
    const taxable = item.total / (1 + rate / 100);
    const tax = item.total - taxable;
    const key = `${rate}%`;
    if (!acc[key]) acc[key] = { taxable: 0, tax: 0 };
    acc[key].taxable += taxable;
    acc[key].tax += tax;
    return acc;
  }, {});

  const taxRows = Object.entries(taxSummary).map(([rate, data]: any) => [
    rate,
    data.taxable.toFixed(2),
    data.tax.toFixed(2)
  ]);

  autoTable(doc, {
    startY: currentY + 6,
    margin: { left: margin + 2 },
    tableWidth: footerColWidth - 4,
    head: [["Rate", "Taxable Value (Base)", "GST Amount"]],
    body: taxRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59] }
  });

  // Bank & Signature
  drawBox(margin + footerColWidth, currentY, footerColWidth, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("COMPANY'S BANK DETAILS", margin + footerColWidth + 3, currentY + 4);
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.text(`Bank: ${businessInfo.bankDetails?.name || "-"}`, margin + footerColWidth + 3, currentY + 10);
  doc.text(`A/c: ${businessInfo.bankDetails?.accountNo || "-"}`, margin + footerColWidth + 3, currentY + 14);
  doc.text(`IFSC: ${businessInfo.bankDetails?.ifsc || "-"}`, margin + footerColWidth + 3, currentY + 18);
  if (businessInfo.bankDetails?.upiId) {
    doc.text(`UPI: ${businessInfo.bankDetails.upiId}`, margin + footerColWidth + 3, currentY + 22);
  }

  if (businessInfo.bankDetails?.upiQrCode) {
    try {
      const qrImage = businessInfo.bankDetails.upiQrCode;
      let format = 'PNG';
      if (qrImage.startsWith('data:image/jpeg')) format = 'JPEG';
      doc.addImage(qrImage, format, pageWidth - margin - 22, currentY + 6, 16, 16);
    } catch (e) {
      console.error("Failed to add QR code", e);
    }
  }

  doc.setTextColor(148, 163, 184);
  doc.text(`For ${businessInfo.name?.toUpperCase() || "BUSINESS"}`, pageWidth - margin - 3, currentY + 26, { align: "right" });
  doc.text("Authorized Signatory", pageWidth - margin - 3, currentY + 32, { align: "right" });
  doc.line(pageWidth - margin - 35, currentY + 29, pageWidth - margin - 3, currentY + 29);

  // 8. DISCLAIMER
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("SUBJECT TO LOCAL JURISDICTION. THIS IS A COMPUTER GENERATED INVOICE.", pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save(`${invoice.invoiceNumber}_${invoice.customerName || "Invoice"}.pdf`);
};
