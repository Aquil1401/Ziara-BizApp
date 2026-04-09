"use client";

import { useState, useEffect, useRef } from "react";
import { getCustomers, getInvoices, saveInvoice, deductInventoryForInvoice, updateCustomerStatsFromInvoice, getProducts, getBusinessInfo, saveBusinessInfo } from "@/utils/localStorageService";
import { Customer, Invoice, InvoiceItem, Product, BusinessInfo } from "@/lib/types";
import { Plus, Trash2, Printer, FileText, CheckCircle, ArrowLeft, Eye, X, AlertTriangle, ChevronDown, Search, Box, Download, Settings, Building } from "lucide-react";
import { amountToWords } from "@/utils/formatUtils";
import { exportInvoiceToPDF } from "@/utils/exportService";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function newItem(): InvoiceItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, total: 0, hsnCode: "", taxRate: 0 };
}

export default function InvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [view, setView] = useState<"create" | "list">("list");
  const [previewMode, setPreviewMode] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [saveToast, setSaveToast] = useState<{ invoiceNumber: string; updatedItems: string[] } | null>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isInterState, setIsInterState] = useState(false);
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  
  const grandTotal = items.reduce((sum, i) => sum + i.total, 0);
  const totalTaxable = items.reduce((sum, i) => sum + (i.total / (1 + (i.taxRate || 0) / 100)), 0);
  const totalTaxAmount = grandTotal - totalTaxable;

  // Professional Fields State
  const [eWayBillNo, setEWayBillNo] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [dispatchDocNo, setDispatchDocNo] = useState("");
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [destination, setDestination] = useState("");
  const [termsOfDelivery, setTermsOfDelivery] = useState("");
  const [bankDetails, setBankDetails] = useState({
    name: "",
    accountName: "",
    accountNo: "",
    branch: "",
    ifsc: ""
  });

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(getBusinessInfo());
  const [mounted, setMounted] = useState(false);

  // Dialog State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    showCancel?: boolean;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const printRef = useRef<HTMLDivElement>(null);
  const isSavedManually = useRef(false);
  const stateRef = useRef({
    invoiceNumber,
    date,
    dueDate,
    selectedCustomerId,
    customerName,
    customerPhone,
    customerAddress,
    items,
    totalTaxable,
    totalTaxAmount,
    grandTotal,
    isInterState,
    placeOfSupply,
    notes,
    eWayBillNo,
    deliveryNote,
    orderNo,
    dispatchDocNo,
    dispatchedThrough,
    destination,
    termsOfDelivery,
    bankDetails,
    view
  });

  // Keep stateRef up to date
  useEffect(() => {
    stateRef.current = {
      invoiceNumber, date, dueDate, selectedCustomerId, customerName, customerPhone, customerAddress,
      items, totalTaxable, totalTaxAmount, grandTotal, isInterState, placeOfSupply, notes,
      eWayBillNo, deliveryNote, orderNo, dispatchDocNo, dispatchedThrough, destination,
      termsOfDelivery, bankDetails, view
    };
  }, [
    invoiceNumber, date, dueDate, selectedCustomerId, customerName, customerPhone, customerAddress,
    items, totalTaxable, totalTaxAmount, grandTotal, isInterState, placeOfSupply, notes,
    eWayBillNo, deliveryNote, orderNo, dispatchDocNo, dispatchedThrough, destination,
    termsOfDelivery, bankDetails, view
  ]);

  // Handle Unmount Auto-save
  useEffect(() => {
    return () => {
      const state = stateRef.current;
      const isDirty = (state.items.length > 1 || (state.items[0]?.description || state.items[0]?.rate > 0 || state.customerName));
      
      if (state.view === "create" && isDirty && !isSavedManually.current) {
        const invoice: Invoice = {
          id: crypto.randomUUID(),
          invoiceNumber: state.invoiceNumber,
          date: state.date,
          dueDate: state.dueDate || undefined,
          customerId: state.selectedCustomerId || undefined,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          customerAddress: state.customerAddress,
          items: state.items,
          subtotal: state.totalTaxable,
          taxRate: state.items[0]?.taxRate || 0,
          taxAmount: state.totalTaxAmount,
          total: state.grandTotal,
          isInterState: state.isInterState,
          placeOfSupply: state.placeOfSupply,
          notes: state.notes,
          status: 'draft',
          createdAt: new Date().toISOString(),
          eWayBillNo: state.eWayBillNo || undefined,
          deliveryNote: state.deliveryNote || undefined,
          orderNo: state.orderNo || undefined,
          dispatchDocNo: state.dispatchDocNo || undefined,
          dispatchedThrough: state.dispatchedThrough || undefined,
          destination: state.destination || undefined,
          termsOfDelivery: state.termsOfDelivery || undefined,
          bankDetails: state.bankDetails
        };
        saveInvoice(invoice);
        // We don't deduct inventory or update stats for auto-saved drafts
      }
    };
  }, []);

  useEffect(() => {
    setCustomers(getCustomers());
    const invoices = getInvoices();
    setSavedInvoices(invoices);
    setProducts(getProducts()); // Fetch products
    // Auto-generate invoice number
    const nextNum = (invoices.length + 1).toString().padStart(4, "0");
    setInvoiceNumber(`INV-${nextNum}`);

    setBusinessInfo(getBusinessInfo());
    setMounted(true);

    // Pick up toast set by scan/page.tsx after redirect
    const pending = sessionStorage.getItem("invoiceSaveToast");
    if (pending) {
      try { setSaveToast(JSON.parse(pending)); } catch {}
      sessionStorage.removeItem("invoiceSaveToast");
    }
  }, []);

  const resetForm = () => {
    const invoices = getInvoices();
    const nextNum = (invoices.length + 1).toString().padStart(4, "0");
    setInvoiceNumber(`INV-${nextNum}`);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setItems([newItem()]);
    setIsInterState(false);
    setPlaceOfSupply("");
    setNotes("");
    setEWayBillNo("");
    setDeliveryNote("");
    setOrderNo("");
    setDispatchDocNo("");
    setDispatchedThrough("");
    setDestination("");
    setTermsOfDelivery("");
    setBankDetails({
      name: "",
      accountName: "",
      accountNo: "",
      branch: "",
      ifsc: ""
    });
    setPreviewMode(false);
  };

  const handleCustomerInput = (value: string) => {
    setCustomerName(value);
    const found = customers.find(c => c.name.toLowerCase() === value.toLowerCase().trim());
    if (found) {
      setSelectedCustomerId(found.id);
      setCustomerPhone(found.phone || "");
      setCustomerAddress(found.address || "");
    }
  };

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find(c => c.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone || "");
      setCustomerAddress(c.address || "");
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      // Handle empty numeric inputs to prevent NaN
      let finalValue = value;
      if (field === 'quantity' || field === 'rate' || field === 'taxRate') {
        finalValue = value === "" || isNaN(Number(value)) ? 0 : value;
      }
      
      const updated = { ...item, [field]: finalValue };
      
      // If choosing a product from description, try to auto-fill
      if (field === "description") {
        const searchText = value.toString().toLowerCase().trim();
        const found = products.find(p => p.name.toLowerCase().trim() === searchText);
        if (found) {
          updated.rate = found.sellingPrice || 0;
          updated.hsnCode = found.hsnCode || "";
          updated.taxRate = found.gstRate || 0;
        }
      }

      const qty = Number(updated.quantity) || 0;
      const rate = Number(updated.rate) || 0;
      const taxRate = Number(updated.taxRate) || 0;
      updated.total = qty * rate * (1 + taxRate / 100);
      
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setDialogState({
      isOpen: true,
      title: "Confirm Deletion",
      message: "Are you sure you want to remove this item from the invoice?",
      type: "danger",
      showCancel: true,
      onConfirm: () => {
        setItems(prev => {
          if (prev.length > 1) {
            return prev.filter(i => i.id !== id);
          } else {
            // Clear the only item instead of deleting row
            return [newItem()];
          }
        });
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, newItem()]);
  };

  const handleSave = (status: Invoice["status"]) => {
    isSavedManually.current = true;
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      date,
      dueDate: dueDate || undefined,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      customerAddress,
      items,
      subtotal: totalTaxable,
      taxRate: items[0]?.taxRate || 0, // Fallback for legacy
      taxAmount: totalTaxAmount,
      total: grandTotal,
      isInterState,
      placeOfSupply,
      notes,
      status,
      createdAt: new Date().toISOString(),
      eWayBillNo: eWayBillNo || undefined,
      deliveryNote: deliveryNote || undefined,
      orderNo: orderNo || undefined,
      dispatchDocNo: dispatchDocNo || undefined,
      dispatchedThrough: dispatchedThrough || undefined,
      destination: destination || undefined,
      termsOfDelivery: termsOfDelivery || undefined,
      bankDetails: bankDetails
    };
    saveInvoice(invoice);
    const updatedItems = deductInventoryForInvoice(invoice);
    updateCustomerStatsFromInvoice(invoice);
    const updated = getInvoices();
    setSavedInvoices(updated);
    setSaveToast({ invoiceNumber, updatedItems });
    setView("list");
  };

  // Helper for GST Summary Table
  const getTaxSummary = () => {
    const summary: Record<string, { hsn: string, rate: number, taxable: number, tax: number }> = {};
    items.forEach(item => {
      const hsn = item.hsnCode || "N/A";
      const rate = item.taxRate || 0;
      const key = `${hsn}-${rate}`;
      const itemTaxable = item.total / (1 + rate / 100);
      const itemTax = item.total - itemTaxable;

      if (!summary[key]) {
        summary[key] = { hsn, rate, taxable: 0, tax: 0 };
      }
      summary[key].taxable += itemTaxable;
      summary[key].tax += itemTax;
    });
    return Object.values(summary);
  };

  const deleteInvoice = (id: string) => {
    const invoices = getInvoices();
    const updated = invoices.filter(inv => inv.id !== id);
    localStorage.setItem("invoices", JSON.stringify(updated));
    setSavedInvoices(updated);
  };

  const updateInvoiceStatus = (id: string, newStatus: Invoice["status"]) => {
    const invoices = getInvoices();
    const updated = invoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, status: newStatus };
      }
      return inv;
    });
    localStorage.setItem("invoices", JSON.stringify(updated));
    setSavedInvoices(updated);
  };

  const downloadInvoicePDF = (inv: Invoice) => {
    exportInvoiceToPDF(inv, {
      ...businessInfo,
      bankDetails: inv.bankDetails || businessInfo.bankDetails
    });
  };

  const handlePrint = () => {
    window.print();
  };

  
  let content;

  if (previewMode && viewingInvoice) {
    content = (<><div className="max-w-4xl mx-auto p-4 md:p-10 mb-20 bg-white">
          <div className="border-[1.5px] border-slate-900 p-0 shadow-[20px_20px_0px_rgba(15,23,42,0.05)]">
            <header className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 space-y-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <Building size={28} />
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">{businessInfo.name}</h1>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{businessInfo.address}
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>GSTIN: <span className="text-indigo-600 font-black">{businessInfo.gstin}</span>
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Ph: {businessInfo.phone} | {businessInfo.email}
                  </p>
                </div>
              </div>
              <div className="p-8 flex flex-col justify-center items-end text-right bg-white">
                <div className="bg-slate-900 text-white px-6 py-2 mb-4">
                  <h2 className="text-xl font-black uppercase tracking-[0.2em]">Tax Invoice</h2>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{invoiceNumber}</p>
                  <div className="h-4"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dated</p>
                  <p className="text-sm font-black text-slate-900 leading-none">{date}</p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Buyer (Bill to)</p>
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-900 uppercase leading-none">{customerName || "—"}</p>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed max-w-[280px]">{customerAddress || "—"}</p>
                  {customerPhone && <p className="text-[11px] font-bold text-slate-800 mt-2">Ph: {customerPhone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 bg-slate-50/30">
                <div className="p-6 border-r-[1.5px] border-slate-900 border-b-[1.5px]">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">E-Way Bill No.</p>
                  <p className="text-[10px] font-black text-slate-900">{eWayBillNo || "—"}</p>
                </div>
                <div className="p-6 border-b-[1.5px] border-slate-900">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Order No.</p>
                  <p className="text-[10px] font-black text-slate-900">{orderNo || "—"}</p>
                </div>
                <div className="p-6 border-r-[1.5px] border-slate-900">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Dispatched Through</p>
                  <p className="text-[10px] font-black text-slate-900">{dispatchedThrough || "—"}</p>
                </div>
                <div className="p-6">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Destination</p>
                  <p className="text-[10px] font-black text-slate-900">{destination || "—"}</p>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5px] border-slate-900 bg-slate-900 text-white">
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-12 border-r border-slate-700">#</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-left border-r border-slate-700">Description of Goods</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-24 border-r border-slate-700">HSN/SAC</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-20 border-r border-slate-700">Qty</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-right w-28 border-r border-slate-700">Rate</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200 min-h-[40px]">
                    <td className="p-3 text-[11px] font-bold text-slate-900 text-center border-r-[1.5px] border-slate-900">{idx + 1}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 border-r-[1.5px] border-slate-900">{item.description}</td>
                    <td className="p-3 text-[11px] font-bold text-slate-600 text-center border-r-[1.5px] border-slate-900">{item.hsnCode || "—"}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 text-center border-r-[1.5px] border-slate-900">{item.quantity}</td>
                    <td className="p-3 text-[11px] font-bold text-slate-900 text-right border-r-[1.5px] border-slate-900">{item.rate.toFixed(2)}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 text-right">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-slate-100 min-h-[35px]">
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-[1.5px] border-slate-900 bg-slate-50/50">
                <tr className="font-black">
                  <td colSpan={3} className="p-4 text-xs uppercase border-r-[1.5px] border-slate-900">Total</td>
                  <td className="p-4 text-xs text-center border-r-[1.5px] border-slate-900">{items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td className="p-4 border-r-[1.5px] border-slate-900"></td>
                  <td className="p-4 text-right text-base font-black bg-slate-900 text-white">₹{grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 space-y-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Bank Details</p>
                  <p className="text-[11px] font-black text-slate-900">Bank Name: {businessInfo.bankDetails.name}</p>
                  <p className="text-[11px] font-black text-slate-900">A/c No: {businessInfo.bankDetails.accountNo}</p>
                  <p className="text-[11px] font-black text-slate-900">IFSC Code: {businessInfo.bankDetails.ifsc}</p>
                  <p className="text-[11px] font-black text-slate-900">Branch: {businessInfo.bankDetails.branch}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxable Value (Base)</p>
                  <p className="text-sm font-black text-slate-900">₹{totalTaxable.toFixed(2)}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">GST Amount</p>
                  <p className="text-sm font-black text-indigo-600">₹{totalTaxAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex-1 p-8 text-center border-b border-slate-200">
                  <div className="h-16"></div>
                  <div className="border-t border-slate-900 pt-2 inline-block px-8">
                    <p className="text-[10px] font-black text-slate-900 uppercase">Receiver's Signature</p>
                  </div>
                </div>
                <div className="p-8 text-center bg-slate-50/50">
                  <p className="text-[9px] font-black text-slate-900 uppercase mb-6">For {businessInfo.name}</p>
                  <div className="h-12 w-32 border-b border-dashed border-slate-300 mx-auto mb-2"></div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Authorised Signatory</p>
                </div>
              </div>
            </div>

            <div className="p-4 text-center bg-slate-900 text-white">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em]">Subject to local jurisdiction. This is a computer generated invoice.</p>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between no-print">
            <button 
              onClick={() => setPreviewMode(false)}
              className="px-8 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl hover:bg-slate-50 transition-all flex items-center gap-3 shadow-[8px_8px_0px_rgba(15,23,42,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <ArrowLeft size={20} /> Edit Details
            </button>
            <div className="flex gap-4">
               <button 
                onClick={() => downloadInvoicePDF({
                   id: '',
                   invoiceNumber,
                   date,
                   customerName,
                   customerAddress,
                   items,
                   total: grandTotal,
                   status: 'draft'
                })}
                className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-[8px_8px_0px_rgba(5,150,105,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div></>);
  } else if (view === "list") {
    content = (<div className="p-5 pt-8 pb-28 min-h-screen">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Invoices</h1>
            <p className="text-slate-500 font-medium">{savedInvoices.length} invoice{savedInvoices.length !== 1 ? "s" : ""} created</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => router.push("/settings")} 
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] shadow-sm"
              title="Business Settings"
            >
              <Settings size={18} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={() => { resetForm(); setView("create"); }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98] flex-1 md:flex-none">
              <Plus size={18} /> New Invoice
            </button>
          </div>
        </header>

        {/* Save success toast */}
        {saveToast && (
          <div className="premium-card mb-6 p-4 border-l-4 border-emerald-500 bg-emerald-50/60 flex items-start gap-3">
            <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-emerald-800 text-sm">
                Invoice {saveToast.invoiceNumber} saved successfully ✓
              </p>
              {saveToast.updatedItems.length > 0 ? (
                <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                  📦 Inventory automatically updated for: <strong>{saveToast.updatedItems.join(", ")}</strong>. Please check the <strong>Inventory</strong> section to verify the updated stock quantities.
                </p>
              ) : (
                <p className="text-emerald-600 text-xs mt-1">
                  Note: No matching products found in inventory — stock was not changed. Update manually in the <strong>Inventory</strong> section if needed.
                </p>
              )}
            </div>
            <button onClick={() => setSaveToast(null)} className="text-emerald-400 hover:text-emerald-700 transition-colors shrink-0 outline-none">
              <X size={16} />
            </button>
          </div>
        )}

        {savedInvoices.length === 0 ? (
          <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 text-slate-400 p-5 rounded-full mb-4">
              <FileText size={40} />
            </div>
            <h3 className="text-slate-700 font-bold text-lg mb-1">No invoices yet</h3>
            <p className="text-slate-400 text-sm font-medium">Create your first invoice using the "New Invoice" button above.</p>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Invoice #</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Customer</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Date</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Items</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Total</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...savedInvoices].reverse().map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-indigo-600 text-sm">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{inv.customerName || "—"}</p>
                        {inv.customerAddress && <p className="text-xs text-slate-400 mt-0.5">{inv.customerAddress}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{inv.date}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {inv.items.length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as any)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none text-center min-w-[70px] ${
                            inv.status === "paid" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                            inv.status === "sent" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                            "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-extrabold text-slate-900">₹{inv.total.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            title="View Items"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => downloadInvoicePDF(inv)}
                            title="Download Invoice (PDF)"
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDialogState({
                                isOpen: true,
                                title: "Delete Invoice",
                                message: `Are you sure you want to permanently delete invoice ${inv.invoiceNumber}? This action cannot be undone.`,
                                type: "danger",
                                onConfirm: () => {
                                  deleteInvoice(inv.id);
                                  setDialogState({
                                    isOpen: true,
                                    title: "Deleted!",
                                    message: "The invoice has been removed successfully.",
                                    type: "success",
                                    showCancel: false,
                                    confirmLabel: "OK",
                                    onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
                                  });
                                }
                              });
                            }}
                            title="Delete Invoice"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>);
  } else {
    content = (<div className="p-5 pt-8 pb-28 min-h-screen">
    <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView("list")} 
          className="text-slate-500 hover:text-slate-800 transition-colors p-2 hover:bg-slate-100 rounded-xl"
          title="Back to List"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">New Invoice</h1>
          <p className="text-slate-500 font-medium">Create a professional tax invoice with GST compliance</p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button 
          onClick={() => router.push("/settings")} 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] shadow-sm"
        >
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={() => {
            if (items.length === 0) {
              setDialogState({
                isOpen: true,
                title: "Empty Invoice",
                message: "Please add at least one item to preview the invoice.",
                type: "warning",
                showCancel: false,
                onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
              });
              return;
            }
            setPreviewMode(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl shadow-md hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] flex-1 md:flex-none"
        >
          <Eye size={18} /> Preview
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-6">
      {/* 1. Invoice Metadata */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
          <FileText size={18} className="text-indigo-600" /> Invoice Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-1">
          <div className="space-y-1.5">
            <label className="premium-label">Invoice Number</label>
            <div className="relative group">
              <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={invoiceNumber} 
                onChange={e => setInvoiceNumber(e.target.value)}
                className="premium-input !pl-11" 
                placeholder="INV-001"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="premium-label">Invoice Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="premium-input cursor-pointer" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="premium-label">Due Date (Optional)</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)}
              className="premium-input cursor-pointer" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="premium-label">Place of Supply</label>
            <div className="relative group">
              <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={placeOfSupply} 
                onChange={e => setPlaceOfSupply(e.target.value)}
                className="premium-input pl-11" 
                placeholder="e.g. Maharashtra"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Line Items */}
      <div className="premium-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Box size={18} className="text-indigo-600" /> Line Items
          </h3>
          <button 
            onClick={addItem}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">HSN/SAC</th>
                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (Base)</th>
                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">GST %</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-bold">{index + 1}</td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <input 
                      type="text" 
                      list="products-list"
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 font-semibold text-slate-800 placeholder:text-slate-300"
                      placeholder="Item Description"
                    />
                  </td>
                  <td className="px-6 py-4 w-24">
                    <input 
                      type="text" 
                      value={item.hsnCode} 
                      onChange={e => updateItem(item.id, 'hsnCode', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-center font-mono text-xs text-slate-500 placeholder:text-slate-300"
                      placeholder="HSN"
                    />
                  </td>
                  <td className="px-6 py-4 w-20">
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      className="w-full bg-transparent border-none focus:ring-0 text-center font-black text-slate-900"
                    />
                  </td>
                  <td className="px-6 py-4 w-28">
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={item.rate} 
                        onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value))}
                        className="w-full bg-transparent border-none focus:ring-0 text-right font-semibold text-slate-800 pl-4"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 w-24">
                     <select 
                       value={item.taxRate} 
                       onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}
                       className="w-full bg-transparent border-none focus:ring-0 text-center font-bold text-slate-500 cursor-pointer"
                     >
                       {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                     </select>
                  </td>
                  <td className="px-6 py-4 w-32 text-right">
                    <span className="font-black text-slate-900">₹{item.total.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 w-20 text-center">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length > 0 && (
                <tr className="bg-slate-50/30">
                  <td colSpan={8} className="px-6 py-3">
                    <button 
                      onClick={addItem}
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all active:scale-95"
                    >
                      <Plus size={14} /> Add New Item
                    </button>
                  </td>
                </tr>
              )}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Box size={40} />
                      <p className="font-bold text-slate-500">No items added yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-100">
               <tr className="border-b border-slate-100">
                 <td colSpan={6} className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Total</td>
                 <td className="px-6 py-3 text-right font-bold text-slate-600">₹{totalTaxable.toFixed(2)}</td>
                 <td></td>
               </tr>
               <tr className="border-b border-slate-100">
                 <td colSpan={6} className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Amount</td>
                 <td className="px-6 py-3 text-right font-bold text-slate-600">₹{totalTaxAmount.toFixed(2)}</td>
                 <td></td>
               </tr>
               <tr className="bg-indigo-50/30">
                 <td colSpan={6} className="px-6 py-5 text-right text-xs font-black text-indigo-900 uppercase tracking-widest">Grand Total</td>
                 <td className="px-6 py-5 text-right text-lg font-black text-indigo-600">₹{grandTotal.toFixed(2)}</td>
                 <td></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Party & Settings Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bill To Card */}
        <div className="premium-card p-6 flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building size={18} className="text-indigo-600" /> Buyer (Bill To)
          </h3>
          <div className="space-y-4 flex-1">
            <div className="space-y-1.5">
              <label className="premium-label">Customer Name</label>
              <div className="relative group">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  list="customers-list"
                  value={customerName} 
                  onChange={e => handleCustomerInput(e.target.value)}
                  className="premium-input !pl-11" 
                  placeholder="Search or Enter Name"
                />
                <datalist id="customers-list">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <label className="premium-label">Phone / Mobile</label>
              <input 
                type="text" 
                value={customerPhone} 
                onChange={e => setCustomerPhone(e.target.value)}
                className="premium-input" 
              />
            </div>
            <div className="space-y-2">
              <label className="premium-label">Full Address</label>
              <textarea 
                rows={3}
                value={customerAddress} 
                onChange={e => setCustomerAddress(e.target.value)}
                className="premium-input-field resize-none" 
              />
            </div>
          </div>
        </div>

        {/* Dispatch Card */}
        <div className="premium-card p-6 flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Download size={18} className="text-indigo-600" /> Dispatch Details
          </h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="premium-label">Dispatched Through</label>
              <input 
                type="text" 
                value={dispatchedThrough} 
                onChange={e => setDispatchedThrough(e.target.value)}
                className="premium-input" 
                placeholder="e.g. By Road / Courier"
              />
            </div>
            <div className="space-y-1.5">
              <label className="premium-label">Destination</label>
              <input 
                type="text" 
                value={destination} 
                onChange={e => setDestination(e.target.value)}
                className="premium-input" 
                placeholder="City/State"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="premium-label">E-Way Bill No.</label>
                <input 
                  type="text" 
                  value={eWayBillNo} 
                  onChange={e => setEWayBillNo(e.target.value)}
                  className="premium-input font-mono text-xs" 
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <label className="premium-label">Order No.</label>
                <input 
                  type="text" 
                  value={orderNo} 
                  onChange={e => setOrderNo(e.target.value)}
                  className="premium-input font-mono text-xs" 
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Signature Card */}
        <div className="premium-card p-6 flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building size={18} className="text-indigo-600" /> Bank & Extras
          </h3>
          <div className="space-y-4 flex-1">
             <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-100 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Building size={48} />
                </div>
                <div className="flex items-center justify-between mb-3">
                   <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Default Global Bank</p>
                   {businessInfo.bankDetails.name && (
                     <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full uppercase">Verified</span>
                   )}
                </div>
                <div className="space-y-1 relative">
                   <p className="text-sm font-black text-slate-800 tracking-tight">{businessInfo.bankDetails.name || "No Bank Linked"}</p>
                   <p className="text-[10px] text-slate-500 font-mono font-bold">{businessInfo.bankDetails.accountNo ? `A/c: ${businessInfo.bankDetails.accountNo}` : "Update in Settings"}</p>
                   <p className="text-[10px] text-slate-400 font-mono uppercase">{businessInfo.bankDetails.ifsc}</p>
                </div>
                <button 
                  onClick={() => router.push("/settings")}
                  className="mt-4 w-full py-2 bg-white border border-slate-200 text-[10px] text-slate-600 font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  Configure Details
                </button>
             </div>
             <div className="space-y-2">
              <label className="premium-label">Invoice Notes (Optional)</label>
              <textarea 
                rows={3}
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                className="premium-input resize-none bg-indigo-50/10" 
                placeholder="Any special instructions..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete Action */}
      <div className="flex flex-wrap gap-4 items-center justify-between mt-4">
          <div className="flex items-center gap-6 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live Summary
             </div>
             <div className="h-4 w-[1px] bg-slate-100"></div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Taxable</span>
                <span className="text-xs font-black text-slate-700">₹{totalTaxable.toFixed(2)}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tax</span>
                <span className="text-xs font-black text-slate-700">₹{totalTaxAmount.toFixed(2)}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Total</span>
                <span className="text-sm font-black text-indigo-600">₹{grandTotal.toFixed(2)}</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => { resetForm(); setView("list"); }}
                className="px-6 py-3 font-black text-[10px] text-slate-400 hover:text-rose-500 transition-all uppercase tracking-widest"
             >
                Reset & Discard
             </button>
             <button 
                onClick={() => {
                  if (!customerName) {
                    setDialogState({ 
                      isOpen: true, 
                      title: "Missing Name", 
                      message: "Please enter or select a customer name to proceed.", 
                      type: "warning", 
                      showCancel: false,
                      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
                    });
                    return;
                  }
                  if (items.length === 0) {
                     setDialogState({ 
                       isOpen: true, 
                       title: "No Items", 
                       message: "Add at least one item to save the invoice.", 
                       type: "warning", 
                       showCancel: false,
                       onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
                     });
                     return;
                  }
                  handleSave("paid");
                }}
                className="px-10 py-4 bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3"
             >
                <CheckCircle size={20} /> Complete & Save Invoice
             </button>
          </div>
      </div>
    </div>
</div>);
  }

  if (!mounted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <>
      {content}

      <datalist id="products-list">
        {products.map(p => (
          <option key={p.id} value={p.name}>
            ₹{(p.sellingPrice || 0).toFixed(2)} | Stock: {p.stock}
          </option>
        ))}
      </datalist>

      <ConfirmDialog 
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        showCancel={dialogState.showCancel}
        confirmLabel={dialogState.confirmLabel}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* View Items Modal */}
      {view === 'list' && viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(15,23,42,0.5)", backdropFilter:"blur(4px)"}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{viewingInvoice.invoiceNumber}</p>
                  <h2 className="text-lg font-extrabold text-slate-900">{viewingInvoice.customerName || "—"}</h2>
                  {viewingInvoice.customerAddress && <p className="text-xs text-slate-400">{viewingInvoice.customerAddress}</p>}
                </div>
                <button onClick={() => setViewingInvoice(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">#</th>
                      <th className="text-left pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Item</th>
                      <th className="text-center pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Qty</th>
                      <th className="text-right pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Rate</th>
                      <th className="text-right pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-3 text-slate-400 text-xs font-bold">{idx + 1}</td>
                        <td className="py-3 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="py-3 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                        <td className="py-3 text-right font-semibold text-slate-900">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">{viewingInvoice.items.length} item{viewingInvoice.items.length !== 1 ? "s" : ""}</span>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-extrabold text-indigo-600">₹{viewingInvoice.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
