"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, CheckCircle, ScanLine as ScanLineIcon, Plus, Trash2, Printer, Save, Edit3 } from "lucide-react";
import { parseBillFileWithAI, ParsedBillItem } from "@/utils/aiParser";
import { saveInvoice, getInvoices, getCustomers, saveCustomer, deductInventoryForInvoice, updateCustomerStatsFromInvoice } from "@/utils/localStorageService";
import { Invoice, InvoiceItem } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";

function toInvoiceItem(p: ParsedBillItem): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: p.description,
    hsnCode: p.hsnCode,
    quantity: p.quantity,
    rate: p.rate,
    total: p.total,
  };
}

export default function ScanBill() {
  const router = useRouter();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [saved, setSaved] = useState(false);

  // Dialog State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Editable invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageSrc(ev.target?.result as string);
        setShowEditor(false);
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const runScan = async () => {
    if (!imageSrc) return;
    setIsScanning(true);

    try {
      setScanStatus("Reading bill with Gemini Vision AI...");
      const parsed = await parseBillFileWithAI(imageSrc);

      if (parsed) {
        // Populate invoice number
        const existingInvoices = getInvoices();
        const nextNum = (existingInvoices.length + 1).toString().padStart(4, "0");
        setInvoiceNumber(parsed.invoiceNumber || `INV-${nextNum}`);

        if (parsed.date) setDate(parsed.date);
        setCustomerName(parsed.customerName || parsed.supplier || "");
        setCustomerAddress(parsed.customerAddress || "");
        setNotes(parsed.notes || "");

        const extractedItems: InvoiceItem[] =
          parsed.items.length > 0
            ? parsed.items.map(toInvoiceItem)
            : [{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, total: 0 }];

        setItems(extractedItems);
      } else {
        // No parse result — open blank editor
        resetToBlankEditor();
      }

      setShowEditor(true);
    } catch (err) {
      console.error(err);
      setDialogState({
        isOpen: true,
        title: "Scan Failed",
        message: "Vision AI was unable to parse the bill. Please enter the details manually.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      resetToBlankEditor();
    } finally {
      setIsScanning(false);
      setScanStatus("");
    }
  };

  const resetToBlankEditor = () => {
    const existingInvoices = getInvoices();
    const nextNum = (existingInvoices.length + 1).toString().padStart(4, "0");
    setInvoiceNumber(`INV-${nextNum}`);
    setDate(new Date().toISOString().split("T")[0]);
    setCustomerName("");
    setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, total: 0 }]);
    setNotes("");
    setShowEditor(true);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.total = Number(updated.quantity) * Number(updated.rate);
        }
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, total: 0 }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems((prev) => prev.filter((i) => i.id !== id)); };

  const handleSave = async () => {
    if (!customerName.trim()) {
      setDialogState({
        isOpen: true,
        title: "Missing Name",
        message: "Please enter a customer or party name to create the invoice.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    if (items.some(i => !i.description.trim())) {
      setDialogState({
        isOpen: true,
        title: "Incomplete Items",
        message: "Please fill in descriptions for all scanned items.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);

    // Auto-create customer if not exists or find existing
    const customers = getCustomers();
    let targetCustomer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase().trim());

    if (customerName.trim() && !targetCustomer) {
      targetCustomer = {
        id: crypto.randomUUID(),
        name: customerName.trim(),
        phone: customerPhone || undefined,
        totalSales: 0,
        paymentsReceived: 0,
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      saveCustomer(targetCustomer);
    }

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      date,
      customerId: targetCustomer?.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      isInterState: false,
      notes: notes || undefined,
      status: "paid",
      createdAt: new Date().toISOString(),
    };

    saveInvoice(invoice);
    const updatedItems = deductInventoryForInvoice(invoice);
    updateCustomerStatsFromInvoice(invoice);

    // Store toast info so invoice list page can display it after redirect
    sessionStorage.setItem("invoiceSaveToast", JSON.stringify({ invoiceNumber, updatedItems }));

    // Brief pause so user sees the processing state
    await new Promise(resolve => setTimeout(resolve, 1500));

    router.push("/invoice");
  };

  const handlePrint = () => window.print();

  const resetAll = () => {
    setImageSrc(null);
    setShowEditor(false);
    setSaved(false);
    setItems([]);
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #scan-invoice-print, #scan-invoice-print * { visibility: visible !important; }
          #scan-invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-5 pt-8 pb-28 min-h-screen no-print">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Scan Bill</h1>
            <p className="text-slate-500 font-medium">Scan a handwritten bill to generate an invoice.</p>
          </div>
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100">
            <ScanLineIcon size={24} strokeWidth={2.5} />
          </div>
        </header>

        {/* Step 1: Upload image */}
        {!imageSrc && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="premium-card flex flex-col items-center justify-center min-h-[55vh] border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50 cursor-pointer transition-all duration-300 group"
          >
            <div className="bg-indigo-50 text-indigo-600 p-6 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm">
              <Camera size={56} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Tap to Scan Bill</h2>
            <p className="text-slate-500 text-sm text-center max-w-sm font-medium leading-relaxed">
              Take a photo of a handwritten invoice or receipt.<br />
              All items will be automatically extracted.
            </p>
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
        )}

        {/* Step 2: Image + Scan button */}
        {imageSrc && !showEditor && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="premium-card overflow-hidden relative group">
              <img src={imageSrc} alt="Scanned Bill" className="w-full max-h-[70vh] object-contain bg-slate-100" />
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={resetAll}
                  className="bg-slate-900/70 backdrop-blur-md text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-slate-900"
                >
                  Retake
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="premium-card p-6 text-center">
                <div className="bg-sky-50 text-sky-600 p-5 rounded-full inline-flex mb-4">
                  <ScanLineIcon size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-slate-800 font-bold text-xl mb-2">Ready to Extract</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">AI will read all items, quantities, and amounts from your handwritten bill and build a complete invoice.</p>
                <button
                  onClick={runScan}
                  disabled={isScanning}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 text-lg"
                >
                  {isScanning ? (
                    <><Loader2 className="animate-spin" size={22} /> {scanStatus}</>
                  ) : (
                    <><ScanLineIcon size={22} /> Extract All Items</>
                  )}
                </button>
                <button onClick={resetToBlankEditor} className="mt-3 w-full text-slate-500 hover:text-slate-700 font-medium text-sm py-2 transition-colors">
                  Skip scan — enter manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Editable Invoice Editor */}
        {showEditor && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className={`premium-card p-4 flex items-center gap-3 border-l-4 ${saved ? "border-emerald-500 bg-emerald-50/50" : "border-sky-500 bg-sky-50/50"}`}>
              <CheckCircle size={22} className={saved ? "text-emerald-600 shrink-0" : "text-sky-600 shrink-0"} />
              <div>
                <p className={`font-bold text-sm ${saved ? "text-emerald-800" : "text-sky-800"}`}>
                  {saved ? `Invoice ${invoiceNumber} saved as PAID ✓` : "Items extracted! Review and edit before saving."}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} found · Total: ₹{total.toFixed(2)}</p>
              </div>
              {imageSrc && (
                <button onClick={() => setShowEditor(false)} className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 shrink-0">
                  <Edit3 size={13} /> View Image
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Left — Invoice Editor */}
              <div className="xl:col-span-3 space-y-5">
                {/* Header Info */}
                <div className="premium-card p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Invoice Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Invoice #</label>
                      <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="premium-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Date</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="premium-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Tax Rate (%)</label>
                      <input type="number" value={taxRate} min="0" max="100" step="0.5" onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="premium-input text-center" />
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="premium-card p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Line Items ({items.length})</h2>
                    <button onClick={addItem} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
                      <Plus size={16} /> Add Item
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-1 mb-2">
                    <p className="col-span-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Item</p>
                    <p className="col-span-2 text-xs font-bold tracking-wider text-slate-400 uppercase">HSN</p>
                    <p className="col-span-2 text-xs font-bold tracking-wider text-slate-400 uppercase text-center">Qty</p>
                    <p className="col-span-1 text-xs font-bold tracking-wider text-slate-400 uppercase text-right">Rate</p>
                    <p className="col-span-2 text-xs font-bold tracking-wider text-slate-400 uppercase text-right">Total</p>
                    <p className="col-span-1"></p>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="col-span-12 md:col-span-4 flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold w-4 shrink-0">{idx + 1}.</span>
                          <input
                            type="text" value={item.description}
                            onChange={e => updateItem(item.id, "description", e.target.value)}
                            placeholder="Product"
                            className="premium-input bg-white text-sm py-2 px-3"
                          />
                        </div>
                        <input
                          type="text" value={item.hsnCode || ""}
                          onChange={e => updateItem(item.id, "hsnCode", e.target.value)}
                          placeholder="HSN"
                          className="col-span-4 md:col-span-2 premium-input bg-white text-sm py-2 px-3"
                        />
                        <input
                          type="number" value={item.quantity} min="0.01" step="0.01"
                          onChange={e => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="col-span-4 md:col-span-2 premium-input bg-white text-center text-sm py-2 px-1"
                        />
                        <input
                          type="number" value={item.rate} min="0" step="0.01"
                          onChange={e => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                          className="col-span-4 md:col-span-1 premium-input bg-white text-right text-sm py-2 px-1"
                        />
                        <div className="col-span-4 md:col-span-2 text-right font-bold text-slate-800 text-sm pr-1">
                          ₹{item.total.toFixed(0)}
                        </div>
                        <button onClick={() => removeItem(item.id)} className="col-span-1 text-slate-300 hover:text-rose-500 transition-colors flex justify-center">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                    <div className="min-w-[200px] space-y-1.5">
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span><span className="font-semibold text-slate-700">₹{subtotal.toFixed(2)}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Tax ({taxRate}%)</span><span className="font-semibold text-slate-700">₹{taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-slate-900 text-xl border-t-2 border-slate-200 pt-2 mt-1">
                        <span>Total</span><span className="text-indigo-600">₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="premium-card p-5">
                  <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Extra notes..." className="premium-input resize-none text-sm" />
                </div>
              </div>

              {/* Right — Customer + Actions */}
              <div className="xl:col-span-2 space-y-5">
                <div className="premium-card p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Customer / Party</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Name *</label>
                      <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer or party name" className="premium-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Address</label>
                      <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Customer address" className="premium-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Phone</label>
                      <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" className="premium-input" />
                    </div>
                  </div>
                </div>

                {/* Image thumbnail */}
                {imageSrc && (
                  <div className="premium-card overflow-hidden">
                    <img src={imageSrc} alt="Bill" className="w-full max-h-48 object-contain bg-slate-50" />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-emerald-400 disabled:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 text-base"
                  >
                    {isSaving ? (
                      <><Loader2 size={20} className="animate-spin" /> Processing...</>
                    ) : (
                      <><Save size={20} /> Save as Paid Invoice</>
                    )}
                  </button>
                  <button onClick={handlePrint} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl transition-all">
                    <Printer size={18} /> Print / Save PDF
                  </button>
                  <button onClick={resetAll} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 rounded-xl transition-all text-sm">
                    Scan Another Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print-only invoice */}
      {showEditor && (
        <div id="scan-invoice-print" className="hidden print:block p-10 bg-white">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">My Business</h1>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-slate-900">INVOICE</h2>
              <p className="text-indigo-600 font-bold">{invoiceNumber}</p>
              <p className="text-slate-500 text-sm mt-1">Date: {date}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 mb-8">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Bill To</p>
            <p className="font-bold text-slate-900 text-lg">{customerName}</p>
            {customerAddress && <p className="text-slate-600 text-sm">{customerAddress}</p>}
            {customerPhone && <p className="text-slate-500 text-sm">{customerPhone}</p>}
          </div>
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 text-xs font-black uppercase text-slate-400">#</th>
                <th className="text-left py-3 text-xs font-black uppercase text-slate-400">Description</th>
                <th className="text-right py-3 text-xs font-black uppercase text-slate-400 w-16">Qty</th>
                <th className="text-right py-3 text-xs font-black uppercase text-slate-400 w-24">Rate</th>
                <th className="text-right py-3 text-xs font-black uppercase text-slate-400 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="py-2 text-slate-400 text-xs">{i + 1}</td>
                  <td className="py-2 text-slate-800 font-medium">{item.description}</td>
                  <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-2 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              {taxRate > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Tax ({taxRate}%)</span><span>₹{taxAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-extrabold text-xl text-slate-900 border-t-2 border-slate-200 pt-3 mt-2">
                <span>Total</span><span className="text-indigo-600">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          {notes && <div className="mt-8 pt-6 border-t border-slate-100"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Notes</p><p className="text-slate-600 text-sm">{notes}</p></div>}
          <div className="mt-8 text-center text-slate-400 text-xs border-t border-slate-100 pt-6">Thank you for your business.</div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
