"use client";

import { useState, useEffect } from "react";
import { getCustomers, saveCustomer, saveLedgerEntry } from "@/utils/localStorageService";
import { Customer, LedgerEntry } from "@/lib/types";
import { BookOpen, DollarSign, MessageCircle, Phone, Search, TrendingUp, TrendingDown, CheckCircle2, Edit2, X, User, AlertCircle, Clock, UserMinus, CheckCircle, PlusCircle, MinusCircle, Info } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Ledger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('credit');
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "clear">("all");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editStatus, setEditStatus] = useState<Customer['status']>('active');

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

  useEffect(() => { setCustomers(getCustomers()); }, []);

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || "");
    setEditBalance(c.balance.toString());
    setEditStatus(c.status || 'active');
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const updated: Customer = {
      ...editingCustomer,
      name: editName,
      phone: editPhone || undefined,
      balance: parseFloat(editBalance) || 0,
      status: editStatus
    };

    saveCustomer(updated);
    setCustomers(getCustomers());
    setEditingCustomer(null);
    
    setDialogState({
      isOpen: true,
      title: "Account Updated",
      message: `Ledger details for ${updated.name} have been updated successfully.`,
      type: "success",
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;
    const customer = customers.find(c => c.id === selectedCustomer);
    if (customer) {
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        customerId: customer.id,
        customerName: customer.name,
        date: new Date().toISOString(),
        amount: amount,
        type: entryType,
        description: description || (entryType === 'credit' ? "Payment Received" : "Credit Given")
      };

      saveLedgerEntry(entry);
      setCustomers(getCustomers());
      setPaymentAmount(""); 
      setSelectedCustomer("");
      setDescription("");
      
      setDialogState({
        isOpen: true,
        title: entryType === 'credit' ? "Payment Applied" : "Credit Added",
        message: entryType === 'credit' 
          ? `₹${amount.toFixed(2)} has been credited to ${customer.name}'s account.`
          : `₹${amount.toFixed(2)} Udhaar has been added to ${customer.name}'s account.`,
        type: "success",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const sendWhatsApp = (c: Customer) => {
    if (!c.phone) {
      setDialogState({
        isOpen: true,
        title: "No Phone Number",
        message: `No phone number saved for ${c.name}. Please edit their profile to add one.`,
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return; 
    }
    const msg = encodeURIComponent(
      `Hello ${c.name}, this is a payment reminder from our store. Your outstanding balance is ₹${c.balance.toFixed(2)}. Please pay at your earliest convenience. Thank you!`
    );
    const phone = c.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const totalReceivable = customers.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  const totalPayable = customers.reduce((s, c) => s + Math.abs(Math.min(c.balance, 0)), 0);

  const filtered = customers
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => filter === "due" ? c.balance > 0 : filter === "clear" ? c.balance <= 0 : true);

  const getStatusBadge = (s?: Customer['status']) => {
    switch (s) {
      case 'active': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={10} /> Active</span>;
      case 'inactive': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-100"><Clock size={10} /> Inactive</span>;
      case 'left': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100"><UserMinus size={10} /> Left</span>;
      case 'unavailable': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100"><AlertCircle size={10} /> Oops</span>;
      default: return null;
    }
  };

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Udhaar Ledger</h1>
        <p className="text-slate-500 font-medium">Track credit receivables and payables</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full blur-xl" />
          <div className="bg-emerald-100/60 p-2.5 rounded-xl text-emerald-600 w-fit mb-3"><TrendingUp size={20} /></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Total Receivable</p>
          <p className="text-2xl font-extrabold text-emerald-600">₹{totalReceivable.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
        </div>
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full blur-xl" />
          <div className="bg-rose-100/60 p-2.5 rounded-xl text-rose-600 w-fit mb-3"><TrendingDown size={20} /></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Total Payable</p>
          <p className="text-2xl font-extrabold text-rose-600">₹{totalPayable.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
        </div>
      </div>

      {/* Manual Ledger Entry */}
      <div className="premium-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-cyan-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <PlusCircle size={20} className="text-indigo-500" /> Add Manual Ledger Entry
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button 
              type="button"
              onClick={() => setEntryType('credit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${entryType === 'credit' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Payment Received (-)
            </button>
            <button 
              type="button"
              onClick={() => setEntryType('debit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${entryType === 'debit' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Credit Given (+)
            </button>
          </div>
        </div>
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Select Customer</label>
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="premium-input appearance-none" required>
                <option value="" disabled>Choose an account...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — Balance: ₹{c.balance.toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Amount (₹)</label>
              <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required placeholder="0.00" className={`premium-input font-bold text-lg ${entryType === 'credit' ? "text-emerald-700" : "text-rose-700"}`} />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Note / Description (Optional)</label>
              <div className="relative">
                <Info size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Cash discount, Opening balance" className="premium-input pl-10" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!selectedCustomer || !paymentAmount} className={`inline-flex items-center justify-center gap-2 py-3 px-8 text-white font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] ${entryType === 'credit' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"} disabled:bg-slate-300 disabled:shadow-none`}>
              {entryType === 'credit' ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
              {entryType === 'credit' ? "Apply Payment" : "Add Credit (Udhaar)"}
            </button>
          </div>
        </form>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="premium-input pl-11" />
        </div>
        <div className="flex gap-2">
          {(["all", "due", "clear"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${filter === f ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Customer List Table */}
      {filtered.length === 0 ? (
        <div className="premium-card p-12 text-center border-dashed border-2 bg-slate-50/50">
          <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-slate-700 font-bold text-lg">No Accounts Found</h3>
          <p className="text-slate-400 font-medium">No customers match your search or filter criteria.</p>
        </div>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Customer Detail</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Invoice Total</th>
                  <th className="px-4 py-4 text-right">Received</th>
                  <th className="px-4 py-4 text-right">Current Balance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                            <Phone size={10} /> {c.phone || "No Phone"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-4 py-5 text-right font-bold text-slate-500 text-sm">
                      ₹{(c.totalSales || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-5 text-right font-bold text-slate-500 text-sm">
                      ₹{(c.paymentsReceived || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-5 text-right">
                      <span className={`text-lg font-black tracking-tighter ${c.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{Math.abs(c.balance).toLocaleString()}
                      </span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 -mt-1">
                        {c.balance > 0 ? "Outstanding" : "Settled"}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.balance > 0 && c.phone && (
                          <button 
                            onClick={() => sendWhatsApp(c)}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-[#25D366] hover:text-white rounded-xl transition-all shadow-sm"
                            title="WhatsApp Reminder"
                          >
                            <MessageCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(c)}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Edit Ledger"
                        >
                          <Edit2 size={18} />
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

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingCustomer(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">Edit Customer Ledger</h3>
                  <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-0.5">Adjust balances and status</p>
                </div>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} required className="premium-input font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="premium-input font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="premium-input font-bold appearance-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="left">Left</option>
                  </select>
                </div>
                <div className="col-span-2 p-5 bg-rose-50 rounded-2xl border border-rose-100">
                  <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-2">Current Ledger Balance (₹)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={editBalance} 
                      onChange={e => setEditBalance(e.target.value)} 
                      required 
                      className="premium-input font-black text-2xl text-rose-600 bg-white" 
                    />
                    <div className="text-rose-300"><TrendingUp size={32} /></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-rose-400 uppercase tracking-wider italic">* Adjusting this will directly override the customer's balance.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingCustomer(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-tighter">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-tighter flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Update Account
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
