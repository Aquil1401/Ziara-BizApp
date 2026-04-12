"use client";

import { useState, useEffect, useMemo } from "react";
import { getPurchases, getInvoices, getBusinessInfo } from "@/utils/localStorageService";
import { Purchase, Invoice, InvoiceItem, BusinessInfo } from "@/lib/types";
import { exportToExcel, exportToPDF } from "@/utils/exportService";
import { FileText, Download, FileSpreadsheet, AlertCircle, Calculator, IndianRupee, LayoutDashboard, ShoppingCart, Tag, Calendar as CalendarIcon, CheckCircle2, Info, Copy, ChevronDown, Building, Shield } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const GST_SLABS = [0, 5, 12, 18, 28];

// Split a GST rate into CGST + SGST (intra-state) or IGST (inter-state)
function splitGST(total: number, gstRate: number, isInterState = false) {
  const taxableValue = total / (1 + gstRate / 100);
  const totalTax = total - taxableValue;
  if (isInterState) {
    return { taxableValue, cgst: 0, sgst: 0, igst: totalTax, totalTax };
  }
  return { taxableValue, cgst: totalTax / 2, sgst: totalTax / 2, igst: 0, totalTax };
}

export default function GSTPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [gstRate, setGstRate] = useState(18);
  const [isInterState, setIsInterState] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(getBusinessInfo());
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "purchases" | "annual">("overview");
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "danger" | "success" | "warning";
    showCancel?: boolean;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    setInvoices(getInvoices());
    setPurchases(getPurchases());
    setBusinessInfo(getBusinessInfo());
    setMounted(true);
  }, []);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Output Tax — from paid/sent invoices
  const filteredInvoices = invoices.filter(inv =>
    inv.date.startsWith(monthKey) && inv.status !== "draft"
  );

  // Input Tax Credit — from purchases (assume GST paid on purchases)
  const filteredPurchases = purchases.filter(p => p.date.startsWith(monthKey));

  // Calculate output GST per invoice (Multi-rate and Inter-state aware)
  const outputRows = filteredInvoices.map(inv => {
    // Resolve inter-state status: prioritize invoice field, fallback to global toggle
    const currentInterState = inv.isInterState !== undefined ? inv.isInterState : isInterState;
    
    // If invoice has detailed items, sum their tax breakdowns
    if (inv.items && inv.items.length > 0) {
      const totals = inv.items.reduce((acc, item) => {
        const rate = item.taxRate || inv.taxRate || gstRate;
        const res = splitGST(item.total, rate, currentInterState);
        return {
          taxable: acc.taxable + res.taxableValue,
          cgst: acc.cgst + res.cgst,
          sgst: acc.sgst + res.sgst,
          igst: acc.igst + res.igst,
          totalTax: acc.totalTax + res.totalTax
        };
      }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 });

      return {
        invoiceNo: inv.invoiceNumber,
        date: inv.date,
        party: inv.customerName,
        total: inv.total,
        taxableValue: totals.taxable,
        rate: "Mixed",
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        placeOfSupply: inv.placeOfSupply || "N/A"
      };
    }

    // Fallback for invoices without item details
    const rate = inv.taxRate || gstRate;
    const { taxableValue, cgst, sgst, igst, totalTax } = splitGST(inv.total, rate, currentInterState);
    return {
      invoiceNo: inv.invoiceNumber,
      date: inv.date,
      party: inv.customerName,
      total: inv.total,
      taxableValue,
      rate: `${rate}%`,
      cgst,
      sgst,
      igst,
      totalTax,
      placeOfSupply: inv.placeOfSupply || "N/A"
    };
  });

  // Calculate input GST per purchase
  const inputRows = filteredPurchases.map(p => {
    const rate = p.taxRate || gstRate;
    const { taxableValue, cgst, sgst, igst, totalTax } = splitGST(p.total, rate, isInterState);
    return {
      date: p.date,
      party: p.supplier,
      product: p.productName,
      total: p.total,
      taxableValue,
      rate: `${rate}%`,
      cgst,
      sgst,
      igst,
      totalTax,
    };
  });

  // HSN Summary — required for GSTR-1
  const hsnSummary = useMemo(() => {
    const summary: Record<string, { hsn: string, rate: number, taxable: number, cgst: number, sgst: number, igst: number, totalTax: number }> = {};
    
    filteredInvoices.forEach(inv => {
      const currentInterState = inv.isInterState !== undefined ? inv.isInterState : isInterState;
      inv.items.forEach(item => {
        const hsn = item.hsnCode || "N/A";
        const rate = item.taxRate || inv.taxRate || gstRate;
        const key = `${hsn}-${rate}`;
        
        const { taxableValue, cgst, sgst, igst, totalTax } = splitGST(item.total, rate, currentInterState);
        
        if (!summary[key]) {
          summary[key] = { hsn, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
        }
        summary[key].taxable += taxableValue;
        summary[key].cgst += cgst;
        summary[key].sgst += sgst;
        summary[key].igst += igst;
        summary[key].totalTax += totalTax;
      });
    });
    
    return Object.values(summary);
  }, [filteredInvoices, gstRate, isInterState]);

  // Totals
  const totalOutputTax = outputRows.reduce((s, r) => s + r.totalTax, 0);
  const totalInputTax  = inputRows.reduce((s, r)  => s + r.totalTax, 0);
  const totalOutputCGST = outputRows.reduce((s, r) => s + r.cgst, 0);
  const totalOutputSGST = outputRows.reduce((s, r) => s + r.sgst, 0);
  const totalOutputIGST = outputRows.reduce((s, r) => s + r.igst, 0);
  const totalInputCGST  = inputRows.reduce((s, r)  => s + r.cgst, 0);
  const totalInputSGST  = inputRows.reduce((s, r)  => s + r.sgst, 0);
  const totalInputIGST  = inputRows.reduce((s, r)  => s + r.igst, 0);

  const netGSTPayable = totalOutputTax - totalInputTax;
  const totalSalesValue = outputRows.reduce((s, r) => s + r.taxableValue, 0);
  const totalPurchaseValue = inputRows.reduce((s, r) => s + r.taxableValue, 0);

  // Annual summary (all months of selected year)
  const annualRows = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const mInv = invoices.filter(inv => inv.date.startsWith(key) && inv.status !== "draft");
    const mPur = purchases.filter(p => p.date.startsWith(key));
    const outTax = mInv.reduce((s, inv) => {
      const currentInterState = inv.isInterState !== undefined ? inv.isInterState : isInterState;
      // Logic same as outputRows (summing items or fallback)
      if (inv.items && inv.items.length > 0) {
        return s + inv.items.reduce((sum, item) => sum + splitGST(item.total, item.taxRate || inv.taxRate || gstRate, currentInterState).totalTax, 0);
      }
      const { totalTax } = splitGST(inv.total, inv.taxRate || gstRate, currentInterState);
      return s + totalTax;
    }, 0);
    const inTax = mPur.reduce((s, p) => {
      const { totalTax } = splitGST(p.total, p.taxRate || gstRate, isInterState);
      return s + totalTax;
    }, 0);
    return {
      month: MONTH_NAMES[i],
      sales: mInv.reduce((s, inv) => s + inv.total, 0),
      purchases: mPur.reduce((s, p) => s + p.total, 0),
      outputGST: outTax,
      inputGST: inTax,
      net: outTax - inTax,
    };
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const periodLabel = `${FULL_MONTHS[month]} ${year}`;
      await exportToExcel([
        {
          name: "GST Summary",
          columns: [
            { header: "Description", key: "desc", width: 35 },
            { header: "Amount (₹)", key: "amount", width: 20 },
          ],
          rows: [
            { desc: `Business: ${businessInfo.name}`, amount: "" },
            { desc: `GSTIN: ${businessInfo.gstin || "Not set"}`, amount: "" },
            { desc: `Period: ${periodLabel}`, amount: "" },
            { desc: `GST Rate Applied: ${gstRate}%`, amount: "" },
            { desc: "", amount: "" },
            { desc: "Total Sales (Taxable Value)", amount: totalSalesValue.toFixed(2) },
            { desc: "Output CGST", amount: totalOutputCGST.toFixed(2) },
            { desc: "Output SGST", amount: totalOutputSGST.toFixed(2) },
            { desc: "Output IGST", amount: totalOutputIGST.toFixed(2) },
            { desc: "Total Output Tax", amount: totalOutputTax.toFixed(2) },
            { desc: "", amount: "" },
            { desc: "Total Purchases (Taxable Value)", amount: totalPurchaseValue.toFixed(2) },
            { desc: "Input CGST (ITC)", amount: totalInputCGST.toFixed(2) },
            { desc: "Input SGST (ITC)", amount: totalInputSGST.toFixed(2) },
            { desc: "Input IGST (ITC)", amount: totalInputIGST.toFixed(2) },
            { desc: "Total Input Tax Credit (ITC)", amount: totalInputTax.toFixed(2) },
            { desc: "", amount: "" },
            { desc: "NET GST PAYABLE", amount: netGSTPayable.toFixed(2) },
          ],
        },
        {
          name: "Sales (GSTR-1)",
          columns: [
            { header: "Invoice No.", key: "invoiceNo", width: 16 },
            { header: "Date", key: "date", width: 14 },
            { header: "Party Name", key: "party", width: 28 },
            { header: "Invoice Total (₹)", key: "total", width: 18 },
            { header: "Taxable Value (₹)", key: "taxableValue", width: 18 },
            { header: "GST Rate (%)", key: "rate", width: 14 },
            { header: "CGST (₹)", key: "cgst", width: 14 },
            { header: "SGST (₹)", key: "sgst", width: 14 },
            { header: "IGST (₹)", key: "igst", width: 14 },
            { header: "Total Tax (₹)", key: "totalTax", width: 14 },
          ],
          rows: outputRows.map(r => ({
            ...r,
            total: r.total.toFixed(2),
            taxableValue: r.taxableValue.toFixed(2),
            cgst: r.cgst.toFixed(2),
            sgst: r.sgst.toFixed(2),
            igst: r.igst.toFixed(2),
            totalTax: r.totalTax.toFixed(2),
          })),
        },
        {
          name: "Purchases (GSTR-2B ITC)",
          columns: [
            { header: "Date", key: "date", width: 14 },
            { header: "Supplier", key: "party", width: 28 },
            { header: "Product", key: "product", width: 24 },
            { header: "Bill Total (₹)", key: "total", width: 16 },
            { header: "Taxable Value (₹)", key: "taxableValue", width: 18 },
            { header: "CGST ITC (₹)", key: "cgst", width: 14 },
            { header: "SGST ITC (₹)", key: "sgst", width: 14 },
            { header: "IGST ITC (₹)", key: "igst", width: 14 },
          ],
          rows: inputRows.map(r => ({
            ...r,
            total: r.total.toFixed(2),
            taxableValue: r.taxableValue.toFixed(2),
            cgst: r.cgst.toFixed(2),
            sgst: r.sgst.toFixed(2),
            igst: r.igst.toFixed(2),
          })),
        },
        {
          name: `Annual ${year}`,
          columns: [
            { header: "Month", key: "month", width: 14 },
            { header: "Sales (₹)", key: "sales", width: 16 },
            { header: "Purchases (₹)", key: "purchases", width: 16 },
            { header: "Output GST (₹)", key: "outputGST", width: 16 },
            { header: "ITC (₹)", key: "inputGST", width: 14 },
            { header: "Net GST (₹)", key: "net", width: 14 },
          ],
          rows: annualRows.map(r => ({
            ...r,
            sales: r.sales.toFixed(2),
            purchases: r.purchases.toFixed(2),
            outputGST: r.outputGST.toFixed(2),
            inputGST: r.inputGST.toFixed(2),
            net: r.net.toFixed(2),
          })),
        },
      ], `GST-Report-${FULL_MONTHS[month]}-${year}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePDFExport = async () => {
    setExporting(true);
    try {
      await exportToPDF(
        `GST Report — ${FULL_MONTHS[month]} ${year}`,
        `${businessInfo.name} | GSTIN: ${businessInfo.gstin || "N/A"} | Rate: ${gstRate}% | ${isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}`,
        [
          {
            heading: "GST Summary (GSTR-3B)",
            columns: ["Description", "Amount (₹)"],
            rows: [
              ["Total Sales (Taxable)", totalSalesValue.toFixed(2)],
              [isInterState ? "Output IGST" : "Output CGST", (isInterState ? totalOutputIGST : totalOutputCGST).toFixed(2)],
              ...(!isInterState ? [["Output SGST", totalOutputSGST.toFixed(2)]] : []),
              ["Total Output GST", totalOutputTax.toFixed(2)],
              ["Input Tax Credit (ITC)", totalInputTax.toFixed(2)],
              ["NET GST PAYABLE", netGSTPayable.toFixed(2)],
            ],
          },
          {
            heading: "Outward Supplies — Sales (GSTR-1)",
            columns: ["Invoice", "Date", "Party", "Invoice Total", "Taxable Value", "CGST", "SGST", "IGST"],
            rows: outputRows.map(r => [r.invoiceNo, r.date, r.party, r.total.toFixed(2), r.taxableValue.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2)]),
          },
          {
            heading: "Inward Supplies — Purchases (ITC)",
            columns: ["Date", "Supplier", "Product", "Bill Total", "Taxable Value", "CGST ITC", "SGST ITC", "IGST ITC"],
            rows: inputRows.map(r => [r.date, r.party, r.product, r.total.toFixed(2), r.taxableValue.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2)]),
          },
          {
            heading: `Annual GST Summary — ${year}`,
            columns: ["Month", "Sales", "Purchases", "Output GST", "ITC", "Net GST"],
            rows: annualRows.map(r => [r.month, r.sales.toFixed(2), r.purchases.toFixed(2), r.outputGST.toFixed(2), r.inputGST.toFixed(2), r.net.toFixed(2)]),
          },
        ],
        `GST-Report-${FULL_MONTHS[month]}-${year}`
      );
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">GST Report</h1>
          <p className="text-slate-500 font-medium">GSTR-1, GSTR-2B (ITC) & GSTR-3B summary for filing</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExcelExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md transition-all text-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={handlePDFExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md transition-all text-sm">
            <FileText size={16} /> PDF
          </button>
        </div>
      </header>

      {/* ─── Settings ────────────────────────────────────────────────── */}
      <div className="premium-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calculator size={18} />
          </div>
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Report Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-6 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">Filing Month</label>
            <div className="relative group">
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="premium-input appearance-none text-sm font-bold text-slate-700 pr-10">
                {FULL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">Filing Year</label>
            <div className="relative group">
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="premium-input appearance-none text-sm font-bold text-slate-700 pr-10">
                {[2026,2025,2024,2023].map(y => <option key={y}>{y}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">Fallback GST Rate</label>
            <div className="relative group">
              <select value={gstRate} onChange={e => setGstRate(parseInt(e.target.value))} className="premium-input appearance-none text-sm font-bold text-slate-700 pr-10">
                {GST_SLABS.map(r => <option key={r} value={r}>{r}% slab (Fallback)</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Used only if tax is missing in records</p>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">Tax Transaction Type</label>
            <div className="relative group">
              <select value={isInterState ? "inter" : "intra"} onChange={e => setIsInterState(e.target.value === "inter")} className="premium-input appearance-none text-sm font-bold text-slate-700 pr-10">
                <option value="intra">Intra-State (CGST + SGST)</option>
                <option value="inter">Inter-State (Export/IGST)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          <div className="space-y-2 lg:col-span-1 xl:col-span-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">Registered Business</label>
            <div className="premium-input bg-slate-50 text-sm font-bold text-slate-500 flex items-center gap-2">
              <Building size={14} /> {businessInfo.name}
            </div>
          </div>
          <div className="space-y-2 lg:col-span-1 xl:col-span-2">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">GSTIN (From Settings)</label>
            <div className="premium-input bg-slate-50 text-sm font-bold font-mono text-slate-500 flex items-center gap-2">
              <Shield size={14} /> {businessInfo.gstin || "Not Set"}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────── */}
      <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 w-fit shadow-inner">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "sales", label: "Sales (GSTR-1)", icon: Tag },
          { id: "purchases", label: "Purchases (GSTR-2B)", icon: ShoppingCart },
          { id: "annual", label: "Annual Summary", icon: CalendarIcon },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === t.id
                ? "bg-white text-indigo-600 shadow-md shadow-indigo-500/10 scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <t.icon size={18} strokeWidth={activeTab === t.id ? 2.5 : 2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────────────────────────── */}
      
      {activeTab === "overview" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Output Tax */}
            <div className="premium-card p-6 relative overflow-hidden group hover:shadow-xl transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500" />
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Total Output Liability</p>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300"><Tag size={20} /></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end"><span className="text-slate-500 text-sm font-medium">Taxable Value</span><span className="font-bold text-slate-700">{fmt(totalSalesValue)}</span></div>
                <div className="pt-4 border-t border-slate-100/80 space-y-3">
                  {!isInterState ? (<>
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">CGST ({gstRate/2}%)</span><span className="font-bold text-indigo-600">{fmt(totalOutputCGST)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">SGST ({gstRate/2}%)</span><span className="font-bold text-blue-600">{fmt(totalOutputSGST)}</span></div>
                  </>) : (
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">IGST ({gstRate}%)</span><span className="font-bold text-violet-600">{fmt(totalOutputIGST)}</span></div>
                  )}
                </div>
                <div className="flex justify-between items-center text-2xl font-black text-indigo-600 pt-2">
                  <span className="text-base text-indigo-400/80">Total Tax</span><span>{fmt(totalOutputTax)}</span>
                </div>
              </div>
            </div>

            {/* ITC */}
            <div className="premium-card p-6 relative overflow-hidden group hover:shadow-xl transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Input Tax Credit (ITC)</p>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300"><ShoppingCart size={20} /></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end"><span className="text-slate-500 text-sm font-medium">Taxable Value</span><span className="font-bold text-slate-700">{fmt(totalPurchaseValue)}</span></div>
                <div className="pt-4 border-t border-slate-100/80 space-y-3">
                  {!isInterState ? (<>
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">CGST ITC ({gstRate/2}%)</span><span className="font-bold text-emerald-600">{fmt(totalInputCGST)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">SGST ITC ({gstRate/2}%)</span><span className="font-bold text-teal-600">{fmt(totalInputSGST)}</span></div>
                  </>) : (
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">IGST ITC ({gstRate}%)</span><span className="font-bold text-teal-600">{fmt(totalInputIGST)}</span></div>
                  )}
                </div>
                <div className="flex justify-between items-center text-2xl font-black text-emerald-600 pt-2">
                  <span className="text-base text-emerald-400/80">Total ITC</span><span>{fmt(totalInputTax)}</span>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className={`premium-card p-6 relative overflow-hidden group hover:shadow-xl transition-shadow ${netGSTPayable > 0 ? " ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5" : "ring-2 ring-emerald-500/20"}`}>
              <div className={`absolute top-0 left-0 w-full h-1.5 ${netGSTPayable > 0 ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Net GST (GSTR-3B)</p>
                <div className={`p-2 rounded-lg transition-colors duration-300 ${netGSTPayable > 0 ? "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"}`}><Calculator size={20} /></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Output Tax</span><span className="font-bold">{fmt(totalOutputTax)}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Minus ITC</span><span className="font-bold text-emerald-600">- {fmt(totalInputTax)}</span></div>
                <div className={`flex justify-between items-center text-3xl font-black border-t-2 border-slate-100 pt-5 mt-2 ${netGSTPayable > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  <span className="text-sm font-bold uppercase tracking-widest opacity-60">Net Duel</span><span>{fmt(netGSTPayable)}</span>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold leading-tight ${netGSTPayable > 0 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                  {netGSTPayable > 0 ? (
                    <><AlertCircle size={18} /> Tax Liability! Amount to be paid in GSTR-3B.</>
                  ) : (
                    <><CheckCircle2 size={18} /> Tax Asset! Credit will carry forward.</>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filing Checklist */}
            <div className="premium-card p-6">
              <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-indigo-600" size={24} /> Filing Health Check
              </h3>
              <div className="space-y-5">
                {[
                  { label: "Invoice Status Check", value: `${filteredInvoices.length} Paid/Sent invoices found.`, ok: filteredInvoices.length > 0 },
                  { label: "Purchase Documentation", value: `${filteredPurchases.length} Purchase entries recorded.`, ok: filteredPurchases.length > 0 },
                  { label: "GSTIN Profile", value: businessInfo.gstin ? `Ready (${businessInfo.gstin})` : "GSTIN not set in config.", ok: !!businessInfo.gstin },
                  { label: "Tax Calculation Type", value: isInterState ? "Inter-State (IGST) selected." : "Intra-State (CGST+SGST) selected.", ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${item.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                      {item.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{item.label}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions/Info */}
            <div className="premium-card p-6 bg-slate-900 text-white border-0 shadow-indigo-200/50">
              <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2">
                <Info size={24} className="text-indigo-400" /> Professional Filing Tips
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-xs font-black text-indigo-400 tracking-wider uppercase mb-1">GSTR-1 Deadline</p>
                  <p className="text-sm font-medium text-white/80 leading-snug">Usually due by the 11th of the following month. Ensure all sales are uploaded here before filing 3B.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-xs font-black text-emerald-400 tracking-wider uppercase mb-1">Claiming ITC</p>
                  <p className="text-sm font-medium text-white/80 leading-snug">Match your Purchase table with GSTR-2B on the GST portal to ensure your suppliers filed their returns.</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Net GST Payable for ${FULL_MONTHS[month]} ${year}: ₹${netGSTPayable.toFixed(2)}`);
                    setDialogState({
                      isOpen: true,
                      title: "Copied!",
                      message: "The Net GST Payable summary has been copied to your clipboard.",
                      type: "success",
                      showCancel: false,
                      onConfirm: () => setDialogState(null)
                    });
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Copy size={18} /> Copy Summary Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* HSN Summary */}
          <div className="premium-card p-6">
            <h2 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <Calculator className="text-indigo-600" size={24} /> HSN Summary (Grouped by HSN Code)
            </h2>
            {hsnSummary.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm font-medium">
                <AlertCircle size={16} className="mr-2" /> No items with HSN codes found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      {["HSN Code", "GST Rate", "Taxable Value (₹)", isInterState ? "IGST (₹)" : "CGST (₹)", !isInterState ? "SGST (₹)" : "", "Total Tax (₹)"].filter(Boolean).map(h => (
                        <th key={h} className="text-right first:text-left py-3 text-xs font-black tracking-[0.1em] text-slate-400 uppercase px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {hsnSummary.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-3 font-black text-slate-900">{h.hsn}</td>
                        <td className="py-4 px-3 text-right font-black text-indigo-600">{h.rate}%</td>
                        <td className="py-4 px-3 text-right font-medium">{h.taxable.toFixed(2)}</td>
                        {isInterState ? (
                          <td className="py-4 px-3 text-right font-bold text-violet-600">{h.igst.toFixed(2)}</td>
                        ) : (
                          <>
                            <td className="py-4 px-3 text-right font-bold text-indigo-600">{h.cgst.toFixed(2)}</td>
                            <td className="py-4 px-3 text-right font-bold text-blue-600">{h.sgst.toFixed(2)}</td>
                          </>
                        )}
                        <td className="py-4 px-3 text-right font-black text-slate-900">{h.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sales List */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-extrabold text-slate-900">Outward Supplies — Details (GSTR-1)</h2>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-500 uppercase tracking-tighter">{filteredInvoices.length} invoices</span>
            </div>
            {outputRows.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                <AlertCircle size={20} className="mr-2" /> No paid/sent invoices found for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      {["Invoice","Date","Party Name","Place of Supply","GST Rate","Total Value","Taxable Value","CGST","SGST","IGST","Tax Total"].map(h => (
                        <th key={h} className="text-right first:text-left py-4 text-xs font-black tracking-[0.1em] text-slate-400 uppercase px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {outputRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-3 font-black text-indigo-600 text-xs">{r.invoiceNo}</td>
                        <td className="py-4 px-3 text-slate-500 text-xs font-bold">{r.date}</td>
                        <td className="py-4 px-3 font-extrabold text-slate-800">{r.party}</td>
                        <td className="py-4 px-3 text-right font-medium text-slate-500 text-[10px]">{r.placeOfSupply}</td>
                        <td className="py-4 px-3 text-right font-black text-indigo-600 italic text-[10px]">{r.rate}</td>
                        <td className="py-4 px-3 text-right font-black text-slate-900">₹{r.total.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right font-medium text-slate-600">₹{r.taxableValue.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-indigo-600 font-bold">₹{r.cgst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-blue-600 font-bold">₹{r.sgst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-violet-600 font-bold">₹{r.igst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right font-black text-indigo-600 bg-indigo-50/0 group-hover:bg-indigo-50/40 transition-colors">₹{r.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-4 border-slate-100 bg-slate-50/80 font-black">
                    <tr>
                      <td colSpan={5} className="py-5 px-3 text-slate-700 uppercase tracking-widest text-xs">Monthly Total</td>
                      <td className="py-5 px-3 text-right text-slate-900">{fmt(outputRows.reduce((s,r)=>s+r.total,0))}</td>
                      <td className="py-5 px-3 text-right text-slate-600">{fmt(totalSalesValue)}</td>
                      <td className="py-5 px-3 text-right text-indigo-600">{fmt(totalOutputCGST)}</td>
                      <td className="py-5 px-3 text-right text-blue-600">{fmt(totalOutputSGST)}</td>
                      <td className="py-5 px-3 text-right text-violet-600">{fmt(totalOutputIGST)}</td>
                      <td className="py-5 px-3 text-right text-indigo-700">{fmt(totalOutputTax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-extrabold text-slate-900">Inward Supplies / ITC Details (GSTR-2B)</h2>
              <span className="px-3 py-1 bg-emerald-100 rounded-lg text-xs font-black text-emerald-700 uppercase tracking-tighter">{filteredPurchases.length} purchases</span>
            </div>
            {inputRows.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                <AlertCircle size={20} className="mr-2" /> No purchase entries found for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      {["Date","Supplier Name","Product","GST Rate","Bill Total","Taxable Value","CGST ITC","SGST ITC","IGST ITC","Total ITC"].map(h => (
                        <th key={h} className="text-right first:text-left py-4 text-xs font-black tracking-[0.1em] text-slate-400 uppercase px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {inputRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-3 text-slate-500 text-xs font-bold">{r.date}</td>
                        <td className="py-4 px-3 font-extrabold text-slate-800">{r.party}</td>
                        <td className="py-4 px-3 text-slate-500 font-medium">{r.product}</td>
                        <td className="py-4 px-3 text-right font-black text-emerald-600 italic text-[10px]">{r.rate}</td>
                        <td className="py-4 px-3 text-right font-black">₹{r.total.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right font-medium text-slate-600">₹{r.taxableValue.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-emerald-600 font-bold">₹{r.cgst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-teal-600 font-bold">₹{r.sgst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right text-violet-600 font-bold">₹{r.igst.toFixed(2)}</td>
                        <td className="py-4 px-3 text-right font-black text-emerald-700 bg-emerald-50/0 group-hover:bg-emerald-50/40 transition-colors">₹{r.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-4 border-slate-100 bg-slate-50/80 font-black">
                    <tr>
                      <td colSpan={4} className="py-5 px-3 text-slate-700 uppercase tracking-widest text-xs">Total ITC Claimable</td>
                      <td className="py-5 px-3 text-right text-slate-900">{fmt(inputRows.reduce((s,r)=>s+r.total,0))}</td>
                      <td className="py-5 px-3 text-right text-slate-600">{fmt(totalPurchaseValue)}</td>
                      <td className="py-5 px-3 text-right text-emerald-600">{fmt(totalInputCGST)}</td>
                      <td className="py-5 px-3 text-right text-teal-600">{fmt(totalInputSGST)}</td>
                      <td className="py-5 px-3 text-right text-violet-600">{fmt(totalInputIGST)}</td>
                      <td className="py-5 px-3 text-right text-emerald-700">{fmt(totalInputTax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "annual" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="premium-card p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="text-indigo-600" size={24} /> Annual Financial Performance — {year}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    {["Month","Total Sales (₹)","Total Purchases (₹)","Output GST (₹)","ITC Credit (₹)","Net GST (₹)"].map(h => (
                      <th key={h} className="text-right first:text-left py-4 text-xs font-black tracking-[0.1em] text-slate-400 uppercase px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {annualRows.map((r, idx) => (
                    <tr key={r.month} className={`hover:bg-slate-50/50 transition-all group ${r.month === MONTH_NAMES[month] ? "bg-indigo-50/40 ring-1 ring-inset ring-indigo-200" : ""}`}>
                      <td className={`py-4 px-3 font-black ${r.month === MONTH_NAMES[month] ? "text-indigo-700" : "text-slate-800"}`}>{r.month}</td>
                      <td className="py-4 px-3 text-right font-bold text-slate-900 group-hover:scale-105 transition-transform origin-right">₹{r.sales.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td className="py-4 px-3 text-right text-slate-500 font-medium">₹{r.purchases.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td className="py-4 px-3 text-right text-indigo-600 font-black">₹{r.outputGST.toFixed(0)}</td>
                      <td className="py-4 px-3 text-right text-emerald-600 font-black">₹{r.inputGST.toFixed(0)}</td>
                      <td className={`py-4 px-3 text-right font-black text-base ${r.net > 0 ? "text-amber-600" : r.net < 0 ? "text-emerald-600 font-extrabold" : "text-slate-400"}`}>₹{r.net.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-4 border-slate-100 bg-slate-900 text-white font-black">
                  <tr>
                    <td className="py-5 px-3 uppercase tracking-widest text-xs">Yearly Performance</td>
                    <td className="py-5 px-3 text-right text-indigo-300">₹{annualRows.reduce((s,r)=>s+r.sales,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                    <td className="py-5 px-3 text-right text-slate-400">₹{annualRows.reduce((s,r)=>s+r.purchases,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                    <td className="py-5 px-3 text-right">₹{annualRows.reduce((s,r)=>s+r.outputGST,0).toFixed(0)}</td>
                    <td className="py-5 px-3 text-right text-emerald-400">₹{annualRows.reduce((s,r)=>s+r.inputGST,0).toFixed(0)}</td>
                    <td className={`py-5 px-3 text-right text-lg ${annualRows.reduce((s,r)=>s+r.net,0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>₹{annualRows.reduce((s,r)=>s+r.net,0).toFixed(0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={dialogState?.isOpen || false}
        title={dialogState?.title || ""}
        message={dialogState?.message || ""}
        type={dialogState?.type}
        showCancel={dialogState?.showCancel}
        onConfirm={dialogState?.onConfirm || (() => {})}
        onCancel={() => setDialogState(null)}
      />
    </div>
  );
}
