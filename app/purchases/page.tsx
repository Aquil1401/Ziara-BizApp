"use client";

import { useState, useEffect, useMemo } from "react";
import { getProducts, getPurchases, savePurchase, saveProduct, deletePurchase, updatePurchase } from "@/utils/localStorageService";
import { Product, Purchase } from "@/lib/types";
import { Package, ScanLine, Eye, X, Receipt, Calendar, User, TrendingDown, Edit2, Trash2, CheckCircle, Save } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Purchases() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [hsnCode, setHsnCode] = useState("");
  
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Purchase[] | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Edit fields state
  const [editProductName, setEditProductName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editTaxRate, setEditTaxRate] = useState("");
  const [editHsnCode, setEditHsnCode] = useState("");

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

  useEffect(() => {
    setPurchaseHistory(getPurchases());
  }, []);

  // Aggregate purchases by vendor and date
  const aggregatedPurchases = useMemo(() => {
    const groups: { [key: string]: Purchase[] } = {};
    purchaseHistory.forEach(p => {
      const key = `${p.supplier}_${p.date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    
    return Object.values(groups).sort((a, b) => 
      new Date(b[0].date).getTime() - new Date(a[0].date).getTime()
    );
  }, [purchaseHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !productName || !quantity || !costPrice) return;

    const qty = parseFloat(quantity);
    const cost = parseFloat(costPrice);
    const tax = parseFloat(taxRate) || 0;
    const taxAmt = (qty * cost * tax) / 100;
    const total = qty * cost + taxAmt;

    // Handle Product
    const products = getProducts();
    let product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product) {
      product = { 
        id: Date.now().toString() + "_p", 
        name: productName, 
        stock: qty, 
        hsnCode: hsnCode || undefined,
        gstRate: parseFloat(taxRate) || 0,
        createdAt: new Date().toISOString() 
      };
    } else {
      product.stock += qty;
    }
    saveProduct(product);

    // Handle Purchase
    const purchase: Purchase = {
      id: Date.now().toString(),
      date,
      supplier,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      costPrice: cost,
      taxRate: tax,
      taxAmount: taxAmt,
      hsnCode: hsnCode || undefined,
      total
    };
    savePurchase(purchase);

    // Reset Form
    setProductName("");
    setQuantity("");
    setCostPrice("");
    setTaxRate("0");
    setHsnCode("");
    
    // Refresh History
    setPurchaseHistory(getPurchases());
    
    setDialogState({
      isOpen: true,
      title: "Success",
      message: "Purchase recorded successfully!",
      type: "success",
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDelete = (id: string, groupKey: string) => {
    setDialogState({
      isOpen: true,
      title: "Delete Purchase",
      message: "Are you sure you want to delete this specific purchase entry? Inventory stock will be adjusted accordingly.",
      type: "danger",
      onConfirm: () => {
        deletePurchase(id);
        const updatedHistory = getPurchases();
        setPurchaseHistory(updatedHistory);
        
        // Update selected group to reflect deletion
        if (selectedGroup) {
          const newGroup = updatedHistory.filter(p => `${p.supplier}_${p.date}` === groupKey);
          if (newGroup.length === 0) setSelectedGroup(null);
          else setSelectedGroup(newGroup);
        }
        
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const startEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setEditProductName(p.productName);
    setEditQuantity(p.quantity.toString());
    setEditCostPrice(p.costPrice.toString());
    setEditTaxRate((p.taxRate || 0).toString());
    setEditHsnCode(p.hsnCode || "");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const qty = parseFloat(editQuantity);
    const cost = parseFloat(editCostPrice);
    const tax = parseFloat(editTaxRate) || 0;
    const taxAmt = (qty * cost * tax) / 100;
    const total = qty * cost + taxAmt;

    const updated: Purchase = {
      ...editingPurchase,
      productName: editProductName,
      quantity: qty,
      costPrice: cost,
      taxRate: tax,
      taxAmount: taxAmt,
      hsnCode: editHsnCode || undefined,
      total
    };

    updatePurchase(updated);
    const updatedHistory = getPurchases();
    setPurchaseHistory(updatedHistory);
    
    // Update selected group to reflect changes
    if (selectedGroup) {
      const groupKey = `${updated.supplier}_${updated.date}`;
      const newGroup = updatedHistory.filter(p => `${p.supplier}_${p.date}` === groupKey);
      setSelectedGroup(newGroup);
    }
    
    setEditingPurchase(null);
    setDialogState({
      isOpen: true,
      title: "Updated",
      message: "Purchase entry updated and inventory adjusted.",
      type: "success",
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const totalPreview = (parseFloat(quantity || "0") * parseFloat(costPrice || "0")).toFixed(2);

  return (
    <div className="p-5 pt-10 pb-28 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Stock Purchases</h1>
          <p className="text-slate-500 font-medium">Aggregate and track incoming stock from vendors.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/purchases/scan" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-all duration-200 flex-1 md:flex-none uppercase text-xs tracking-wider">
            <ScanLine size={18} /> Scan Purchase Bill
          </Link>
        </div>
      </header>

      <div className="premium-card p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Transaction Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Supplier Name</label>
              <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} required placeholder="Vendor or Supplier Name" className="premium-input" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Product Details</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Product Name or SKU" className="premium-input font-bold text-lg" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">HSN/SAC</label>
                <input type="text" value={hsnCode} onChange={e => setHsnCode(e.target.value)} placeholder="Code" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Quantity</label>
                <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required placeholder="0" className="premium-input font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Cost (Base) (₹)</label>
                <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} required placeholder="0.00" className="premium-input font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Tax Rate (GST%)</label>
                <input type="number" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} required placeholder="0" className="premium-input font-bold text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-2 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full flex justify-between items-center md:justify-start md:gap-6">
              <span className="text-slate-500 font-bold tracking-wider uppercase text-xs">Estimated Value</span>
              <span className="text-3xl font-black text-rose-600 tracking-tight">₹{totalPreview}</span>
            </div>
            <button type="submit" className="w-full md:w-auto md:px-12 md:py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-black py-4 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-tighter group">
              <div className="p-1 px-2 bg-white/10 rounded-lg group-hover:bg-indigo-500 transition-colors">
                <Receipt size={18} />
              </div>
              Confirm Order
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Purchase History</h2>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          <Calendar size={14} />
          Grouped by Vendor & Date
        </div>
      </div>

      {aggregatedPurchases.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {aggregatedPurchases.map((group, idx) => {
            const totalAmount = group.reduce((sum, p) => sum + p.total, 0);
            const firstPurchase = group[0];
            const itemCount = group.length;

            return (
              <div key={idx} className="premium-card group hover:shadow-xl transition-all duration-300">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm transition-transform group-hover:scale-110">
                      <Receipt size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{firstPurchase.supplier}</h3>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(firstPurchase.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">{itemCount} {itemCount === 1 ? 'Product' : 'Products'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Bill</p>
                      <p className="font-black text-rose-600 text-xl tracking-tight">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedGroup(group)}
                      className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="premium-card p-12 text-center border-dashed border-2 flex flex-col items-center justify-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
            <TrendingDown size={32} />
          </div>
          <h3 className="text-slate-700 font-bold text-lg mb-1">No Purchases Found</h3>
          <p className="text-slate-400 font-medium">Start by adding a manual purchase or scanning a bill.</p>
        </div>
      )}

      {/* Purchase Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedGroup(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{selectedGroup[0].supplier}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> {new Date(selectedGroup[0].date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedGroup(null)}
                className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Product</th>
                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest px-2">HSN</th>
                    <th className="py-3 text-center text-xs font-black text-slate-400 uppercase tracking-widest px-4">Qty</th>
                    <th className="py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Tax%</th>
                    <th className="py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest pl-4">Total</th>
                    <th className="py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedGroup.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-700">{item.productName}</td>
                      <td className="py-4 text-xs font-bold text-slate-400 px-2">{item.hsnCode || "-"}</td>
                      <td className="py-4 text-center font-black text-indigo-600 px-4">{item.quantity}</td>
                      <td className="py-4 text-right font-medium text-slate-500">{item.taxRate || 0}%</td>
                      <td className="py-4 text-right font-black text-rose-600 pl-4">₹{item.total.toFixed(2)}</td>
                      <td className="py-4 text-right pl-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(item)}
                            className="p-1.5 bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
                            title="Edit Item"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id, `${item.supplier}_${item.date}`)}
                            className="p-1.5 bg-slate-100 text-slate-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-slate-900 flex justify-between items-center text-white">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-70">Grand Total Amount</p>
                <p className="text-3xl font-black">₹{selectedGroup.reduce((sum, p) => sum + p.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Receipt size={32} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingPurchase(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">Edit Purchase Item</h3>
                  <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-0.5">Adjust quantity and price</p>
                </div>
              </div>
              <button onClick={() => setEditingPurchase(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Product Name</label>
                  <input value={editProductName} onChange={e => setEditProductName(e.target.value)} required className="premium-input font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">HSN Code</label>
                    <input value={editHsnCode} onChange={e => setEditHsnCode(e.target.value)} className="premium-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                    <input type="number" step="0.01" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} required className="premium-input font-black text-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cost Price (₹)</label>
                    <input type="number" step="0.01" value={editCostPrice} onChange={e => setEditCostPrice(e.target.value)} required className="premium-input font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tax Rate (%)</label>
                    <input type="number" step="0.5" value={editTaxRate} onChange={e => setEditTaxRate(e.target.value)} required className="premium-input font-bold" />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Total Value</p>
                    <p className="text-2xl font-black text-rose-600">₹{(parseFloat(editQuantity || "0") * parseFloat(editCostPrice || "0") * (1 + (parseFloat(editTaxRate || "0")/100))).toFixed(2)}</p>
                  </div>
                  <TrendingDown className="text-slate-200" size={32} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingPurchase(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-tighter">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-tighter flex items-center justify-center gap-2">
                  <Save size={20} /> Update Entry
                </button>
              </div>
            </form>
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
