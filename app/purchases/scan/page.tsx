"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, CheckCircle, ScanLine as ScanLineIcon, Trash2, Save, Edit3, ShoppingCart, FileText, ChevronLeft } from "lucide-react";
import { parseBillFileWithAI, ParsedBillItem } from "@/utils/aiParser";
import { savePurchase, saveProduct, incrementInventoryForPurchase, getPurchases } from "@/utils/localStorageService";
import { Purchase } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";

export default function PurchaseScan() {
  const router = useRouter();
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  
  // Editable purchase fields
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const total = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileType(file.type);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFileData(ev.target?.result as string);
        setShowEditor(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const runScan = async () => {
    if (!fileData) return;
    setIsScanning(true);

    try {
      setScanStatus("AI Reading Document...");
      const parsed = await parseBillFileWithAI(fileData);

      if (parsed) {
        if (parsed.date) setDate(parsed.date);
        setSupplier(parsed.supplier || parsed.customerName || "");
        setItems(parsed.items || []);
        setNotes(parsed.notes || "");
      } else {
        setItems([{ description: "", quantity: 1, rate: 0, total: 0 }]);
      }
      setShowEditor(true);
    } catch (err) {
      console.error(err);
      setDialogState({
        isOpen: true,
        title: "Scan Failed",
        message: "AI was unable to read the document. Please enter the data manually.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      setItems([{ description: "", quantity: 1, rate: 0, total: 0 }]);
      setShowEditor(true);
    } finally {
      setIsScanning(false);
      setScanStatus("");
    }
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "rate") {
        updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.rate) || 0);
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!supplier.trim()) {
      setDialogState({
        isOpen: true,
        title: "Missing Info",
        message: "Please enter a vendor/supplier name before saving.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    if (items.length === 0) {
      setDialogState({
        isOpen: true,
        title: "No Items",
        message: "Please ensure there is at least one item extracted or added.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);

    try {
      for (const item of items) {
        const product = {
          id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
          name: item.description,
          stock: parseFloat(item.quantity) || 0,
          createdAt: new Date().toISOString()
        };

        const purchase: Purchase = {
          id: crypto.randomUUID(),
          date,
          supplier: supplier.trim(),
          productId: product.id,
          productName: item.description,
          quantity: parseFloat(item.quantity) || 0,
          costPrice: parseFloat(item.rate) || 0,
          total: parseFloat(item.total) || 0
        };

        savePurchase(purchase);
        incrementInventoryForPurchase(purchase);
      }

      setDialogState({
        isOpen: true,
        title: "Success",
        message: "All items saved and inventory updated successfully!",
        type: "success",
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          router.push("/purchases");
        }
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen bg-slate-50/30">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchases" className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Scan Bill</h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Automate inventory with AI extraction.</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <ScanLineIcon size={24} strokeWidth={2.5} />
        </div>
      </header>

      {!fileData && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="premium-card flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer transition-all bg-white group"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
            <Camera size={40} />
          </div>
          <p className="font-extrabold text-slate-800 text-xl mb-2 text-center px-4 tracking-tight">AI Billing Center</p>
          <p className="font-medium text-slate-400 text-sm text-center px-8">Take a photo or upload PDF/Word bills to extract data automatically.</p>
          <input type="file" accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      )}

      {fileData && !showEditor && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 premium-card p-4 flex items-center justify-center bg-white border border-slate-100 min-h-[400px] overflow-hidden">
            {fileType.startsWith("image/") ? (
              <img src={fileData} className="w-full rounded-2xl shadow-sm object-contain max-h-[70vh]" />
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <FileText size={100} strokeWidth={1} className="text-indigo-200" />
                <div className="text-center">
                  <p className="font-black text-slate-700 text-lg">Document Attached</p>
                  <p className="text-xs font-bold bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full uppercase tracking-widest mt-2">
                    {fileType.split("/")[1] || "DOC"} FORMAT
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4 justify-center">
            <button 
              onClick={runScan} 
              disabled={isScanning}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-lg uppercase tracking-tight"
            >
              {isScanning ? <><Loader2 className="animate-spin" /> {scanStatus}</> : <><ScanLineIcon /> Run AI Analysis</>}
            </button>
            <button onClick={() => setFileData(null)} className="w-full py-4 bg-white text-slate-400 font-bold rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest">
              Retake / Change File
            </button>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
          <div className="premium-card p-8 border-t-4 border-indigo-600 bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ShoppingCart size={20} /></div>
              <h2 className="font-black text-slate-800 text-xl tracking-tight uppercase">Vendor & Transaction</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supplier Name</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Who is the vendor?" className="premium-input font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="premium-input font-bold" />
              </div>
            </div>
          </div>

          <div className="premium-card p-8 bg-white overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><ShoppingCart size={20} /></div>
                <h2 className="font-black text-slate-800 text-xl tracking-tight uppercase">Purchase Items</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-center relative group">
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1">Description</label>
                    <input className="premium-input text-sm font-bold bg-white" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1">HSN/SAC</label>
                    <input className="premium-input text-sm font-bold bg-white" value={item.hsnCode || ""} onChange={e => updateItem(idx, "hsnCode", e.target.value)} placeholder="0000" />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1 text-center">Qty</label>
                    <input type="number" className="premium-input text-sm text-center font-black bg-white" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1 text-right">Cost (₹)</label>
                    <input type="number" className="premium-input text-sm text-right font-black text-slate-700 bg-white" value={item.rate} onChange={e => updateItem(idx, "rate", e.target.value)} />
                  </div>
                  <div className="col-span-6 md:col-span-1">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1 text-center">Tax %</label>
                    <input type="number" className="premium-input text-sm text-center font-black text-indigo-600 bg-white" value={item.taxRate || 0} onChange={e => updateItem(idx, "taxRate", e.target.value)} />
                  </div>
                  <div className="col-span-6 md:col-span-1">
                    <label className="block text-[9px] font-black text-slate-300 uppercase tracking-tight mb-1 text-right">Total</label>
                    <div className="premium-input text-sm text-right font-black text-emerald-600 bg-slate-100/50 flex items-center justify-end px-3 min-h-[42px]">
                      ₹{(item.total || 0).toFixed(0)}
                    </div>
                  </div>
                  <button onClick={() => removeItem(idx)} className="col-span-12 md:col-span-1 flex justify-center text-rose-300 hover:text-rose-500 transition-colors md:pt-4">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-6 gap-6">
              <div>
                <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Total Purchase Value</span>
                <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{total.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black rounded-3xl shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-tighter text-base group"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <div className="p-1.5 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                    <CheckCircle size={20} />
                  </div>
                )} 
                Commit to Inventory
              </button>
            </div>
          </div>
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
    </div>
  );
}
