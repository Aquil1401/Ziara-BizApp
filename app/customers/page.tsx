"use client";

import { useState, useEffect, useMemo } from "react";
import { getCustomers, saveCustomer, deleteCustomer, getInvoices, getLedgerEntries, recalculateCustomerStats } from "@/utils/localStorageService";
import { Customer, Invoice, LedgerEntry } from "@/lib/types";
import { 
  UserPlus, Phone, Mail, MapPin, Building2, Trash2, Edit2, X, Check, 
  Users, Search, Eye, FileText, ChevronRight, AlertCircle, Clock, CheckCircle2, UserMinus
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Customer['status']>('active');

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

  const load = () => {
    setCustomers(getCustomers());
    setInvoices(getInvoices());
    setLedgerEntries(getLedgerEntries());
  };

  const fixStats = () => {
    const allCustomers = getCustomers();
    allCustomers.forEach(c => {
      recalculateCustomerStats(c.id);
    });
    
    load();
    setDialogState({
      isOpen: true,
      title: "Recalculation Complete",
      message: "Customer statistics have been recalculated. Doubled entries have been corrected.",
      type: "success",
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(""); setPhone(""); setEmail(""); setAddress(""); setCompany(""); setStatus('active');
    setEditingId(null); setShowForm(false);
  };

  const handleEdit = (c: Customer) => {
    setName(c.name); setPhone(c.phone || ""); setEmail(c.email || "");
    setAddress(c.address || ""); setCompany(c.company || "");
    setStatus(c.status || 'active');
    setEditingId(c.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const existing = editingId ? customers.find(c => c.id === editingId) : null;
    const customer: Customer = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      company: company.trim() || undefined,
      status: status || 'active',
      totalSales: existing?.totalSales || 0,
      paymentsReceived: existing?.paymentsReceived || 0,
      balance: existing?.balance || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    saveCustomer(customer);
    load();
    resetForm();
  };

  const handleDelete = (id: string, name: string) => {
    setDialogState({
      isOpen: true,
      title: "Delete Customer",
      message: `Are you sure you want to delete "${name}"? Their sales history will remain but they will be removed from the list.`,
      type: "danger",
      onConfirm: () => {
        deleteCustomer(id);
        load();
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const updateStatus = (customer: Customer, newStatus: Customer['status']) => {
    const updated = { ...customer, status: newStatus };
    saveCustomer(updated);
    load();
  };

  const filtered = useMemo(() => customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const customerTransactions = useMemo(() => {
    if (!viewingCustomer) return [];
    
    const invs = invoices
      .filter(inv => inv.customerId === viewingCustomer.id || inv.customerName === viewingCustomer.name)
      .map(inv => ({ ...inv, transactionType: 'invoice' as const }));

    const entries = ledgerEntries
      .filter(entry => entry.customerId === viewingCustomer.id)
      .map(entry => ({ ...entry, transactionType: 'manual' as const }));

    return [...invs, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingCustomer, invoices, ledgerEntries]);

  const getStatusBadge = (s?: Customer['status']) => {
    switch (s) {
      case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} /> Active</span>;
      case 'inactive': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100"><Clock size={12} /> Inactive</span>;
      case 'left': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100"><UserMinus size={12} /> Left</span>;
      case 'unavailable': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"><AlertCircle size={12} /> Unavailable</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} /> Active</span>;
    }
  };

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Customers</h1>
          <p className="text-slate-500 font-medium">{customers.length} customer{customers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={fixStats}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all text-sm shrink-0"
            title="Fix calculation errors by re-scanning all invoices"
          >
            <AlertCircle size={16} /> Recalculate Stats
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98] w-full md:w-auto shrink-0"
          >
            {showForm ? <X size={18} /> : <UserPlus size={18} />}
            {showForm ? "Cancel" : "Add Customer"}
          </button>
        </div>
      </header>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="premium-card p-6 md:p-8 mb-8 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <h2 className="text-lg font-bold text-slate-800 mb-6">{editingId ? "Edit Customer Details" : "Register New Customer"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Full Name *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                required placeholder="Customer full name"
                className="premium-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as Customer['status'])}
                className="premium-input appearance-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="unavailable">Unavailable</option>
                <option value="left">Left / Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Phone Number</label>
              <input
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210" type="tel"
                className="premium-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Email Address</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="customer@email.com" type="email"
                className="premium-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Company / Business</label>
              <input
                value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Company or business name"
                className="premium-input"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Address</label>
              <input
                value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Street, City, State"
                className="premium-input"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:justify-end">
              <button type="button" onClick={resetForm} className="md:w-auto md:px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                <X size={16} /> Cancel
              </button>
              <button type="submit" className="md:w-auto md:px-10 premium-button-primary py-3">
                <Check size={16} /> {editingId ? "Update Information" : "Save Customer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Actions */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or company..."
          className="premium-input pl-12 h-12 shadow-sm border-slate-200"
        />
      </div>

      {/* Customer Table */}
      {filtered.length === 0 ? (
        <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-100 text-slate-400 p-5 rounded-full mb-4">
            <Users size={40} />
          </div>
          <h3 className="text-slate-700 font-bold text-lg mb-1">{search ? "No matches found" : "No customers yet"}</h3>
          <p className="text-slate-400 text-sm font-medium">{search ? "Try adjusting your search criteria." : "Start by adding your first customer."}</p>
        </div>
      ) : (
        <div className="premium-card overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Total Sales</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Balance</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold shrink-0 border border-indigo-100">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          {c.company && <div className="text-xs text-slate-500 font-medium">{c.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-medium">{c.phone || "—"}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[150px]">{c.email || ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      ₹{(c.totalSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(c.balance || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{(c.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setViewingCustomer(c)}
                          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(c)}
                          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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

      {/* Details Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">{viewingCustomer.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {getStatusBadge(viewingCustomer.status)}
                    <span className="text-slate-400 text-sm font-medium">Customer ID: {viewingCustomer.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setViewingCustomer(null)}
                className="p-2.5 hover:bg-slate-100 text-slate-400 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Sales</p>
                  <p className="text-2xl font-black text-indigo-700">₹{(viewingCustomer.totalSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Total Received</p>
                  <p className="text-2xl font-black text-emerald-700">₹{(viewingCustomer.paymentsReceived || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className={`p-5 rounded-2xl border ${viewingCustomer.balance > 0 ? "bg-rose-50/50 border-rose-100/50" : "bg-blue-50/50 border-blue-100/50"}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">{viewingCustomer.balance > 0 ? "Outstanding Balance" : "Credit Balance"}</p>
                  <p className={`text-2xl font-black ${viewingCustomer.balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    ₹{Math.abs(viewingCustomer.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-400" /> Business Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Building2 size={16} /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">Company</p>
                        <p className="text-slate-700 font-semibold">{viewingCustomer.company || "Not specified"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><MapPin size={16} /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">Address</p>
                        <p className="text-slate-700 font-semibold">{viewingCustomer.address || "No address saved"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Phone size={16} className="text-indigo-400" /> Contact Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Phone size={16} /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">Phone</p>
                        <p className="text-slate-700 font-semibold">{viewingCustomer.phone || "No phone number"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Mail size={16} /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">Email</p>
                        <p className="text-slate-700 font-semibold truncate">{viewingCustomer.email || "No email address"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions / Ledger */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-400" /> Recent Invoices & Transactions
                </h3>
                {customerTransactions.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-slate-400 font-medium">No transaction history found for this customer.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Date</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Invoice #</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {customerTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-600 font-medium">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-800">
                              {tx.transactionType === 'invoice' ? `#${tx.invoiceNumber}` : tx.description}
                            </td>
                            <td className="px-4 py-3">
                              {tx.transactionType === 'invoice' ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  tx.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                }`}>
                                  {tx.status}
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  tx.type === 'credit' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                }`}>
                                  {tx.type === 'credit' ? "Credit (In)" : "Debit (Out)"}
                                </span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-sm font-black text-right ${
                              tx.transactionType === 'manual' 
                                ? (tx.type === 'credit' ? "text-emerald-600" : "text-rose-600")
                                : "text-slate-900"
                            }`}>
                              {tx.transactionType === 'manual' && tx.type === 'credit' ? "-" : ""}
                              ₹{(tx.total || tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <footer className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80">
              <button 
                onClick={() => { setViewingCustomer(null); handleEdit(viewingCustomer); }}
                className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-2 text-sm shadow-sm"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
              <button 
                onClick={() => setViewingCustomer(null)}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 text-sm"
              >
                Done
              </button>
            </footer>
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
