"use client";

import { useState, useEffect } from "react";
import { getProducts, getCustomers, saveSale, saveCustomer, saveProduct, getSales } from "@/utils/localStorageService";
import { Product, Customer, Sale } from "@/lib/types";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Sales() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);

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
    setSalesHistory(getSales().reverse());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !productName || !quantity || !rate) return;

    const qty = parseFloat(quantity);
    const r = parseFloat(rate);
    const total = qty * r;

    // Handle Product
    const products = getProducts();
    let product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product) {
      product = { id: Date.now().toString() + "_p", name: productName, stock: -qty };
    } else {
      product.stock -= qty;
    }
    saveProduct(product);

    // Handle Customer
    const customers = getCustomers();
    let customer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    if (!customer) {
      customer = { id: Date.now().toString() + "_c", name: customerName, totalSales: total, paymentsReceived: 0, balance: total };
    } else {
      customer.totalSales += total;
      customer.balance += total;
    }
    saveCustomer(customer);

    // Handle Sale
    const sale: Sale = {
      id: Date.now().toString(),
      date,
      customerId: customer.id,
      customerName: customer.name,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      rate: r,
      total
    };
    saveSale(sale);

    // Reset Form
    setProductName("");
    setQuantity("");
    setRate("");
    
    // Refresh History
    setSalesHistory(getSales().reverse());
    
    setDialogState({
      isOpen: true,
      title: "Sale Recorded",
      message: `Sale to ${customerName} for ${productName} has been saved.`,
      type: "success",
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const totalPreview = (parseFloat(quantity || "0") * parseFloat(rate || "0")).toFixed(2);

  return (
    <div className="p-5 pt-10 pb-28 min-h-screen">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">New Sale</h1>
          <p className="text-slate-500 font-medium">Record an outgoing transaction.</p>
        </div>
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
          <ShoppingCart size={24} strokeWidth={2.5}/>
        </div>
      </header>

      <div className="premium-card p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Transaction Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Customer Details</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required placeholder="Customer Full Name" className="premium-input" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Product Information</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Product Name or SKU" className="premium-input" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Quantity</label>
                <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required placeholder="0" className="premium-input font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Rate (₹)</label>
                <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} required placeholder="0.00" className="premium-input font-medium" />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-2 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full flex justify-between items-center md:justify-start md:gap-6">
              <span className="text-slate-500 font-semibold tracking-wide uppercase text-sm">Total Sale Value</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">₹{totalPreview}</span>
            </div>
            <button type="submit" className="premium-button-primary md:w-auto md:px-12 md:py-4">
              Confirm Sale
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Activity</h2>
      </div>

      {salesHistory.length > 0 ? (
        <div className="premium-card overflow-hidden">
          <ul className="divide-y divide-slate-100/80">
            {salesHistory.slice(0, 5).map(sale => (
              <li key={sale.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-800">{sale.customerName}</span>
                  <span className="font-bold text-emerald-600">₹{sale.total.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                  <span className="text-slate-600">{sale.productName} <span className="text-slate-400">× {sale.quantity}</span></span>
                  <span>{new Date(sale.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="premium-card p-6 text-center border-dashed border-2">
          <p className="text-slate-400 font-medium">No recent sales found.</p>
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
