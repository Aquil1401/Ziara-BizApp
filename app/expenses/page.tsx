"use client";

import { useState, useEffect } from "react";
import { getExpenses, saveExpense, deleteExpense } from "@/utils/localStorageService";
import { Expense } from "@/lib/types";
import { Plus, Trash2, Wallet, X, Check, TrendingDown, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const CATEGORIES: Expense["category"][] = ["Rent", "Electricity", "Transport", "Salaries", "Maintenance", "Marketing", "Other"];

const CATEGORY_COLORS: Record<Expense["category"], string> = {
  Rent: "bg-rose-100 text-rose-700",
  Electricity: "bg-amber-100 text-amber-700",
  Transport: "bg-sky-100 text-sky-700",
  Salaries: "bg-indigo-100 text-indigo-700",
  Maintenance: "bg-orange-100 text-orange-700",
  Marketing: "bg-purple-100 text-purple-700",
  Other: "bg-slate-100 text-slate-600",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [listPage, setListPage] = useState(1);
  const expensesPerPage = 8;

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<Expense["category"]>("Rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<"individual" | "monthly">("individual");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

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

  const load = () => setExpenses(getExpenses());
  useEffect(() => { load(); }, []);

  // Reset page on filter change
  useEffect(() => {
    setListPage(1);
  }, [filterMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    saveExpense({
      id: crypto.randomUUID(),
      date,
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      type: expenseType,
      startDate: expenseType === "monthly" ? startDate : undefined,
      endDate: expenseType === "monthly" ? endDate : undefined,
    });
    load();
    setDescription(""); setAmount(""); setShowForm(false);
    setExpenseType("individual");
  };

  const handleDelete = (id: string, desc: string) => {
    setDialogState({
      isOpen: true,
      title: "Delete Expense",
      message: `Are you sure you want to delete "${desc}"?`,
      type: "danger",
      onConfirm: () => {
        deleteExpense(id);
        load();
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filter
  const filtered = filterMonth === "all"
    ? expenses
    : expenses.filter(e => e.date.startsWith(filterMonth));

  const sortedExpenses = [...filtered].reverse();
  const totalListPages = Math.ceil(sortedExpenses.length / expensesPerPage);
  const paginatedExpenses = sortedExpenses.slice(
    (listPage - 1) * expensesPerPage,
    listPage * expensesPerPage
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  // Available months
  const months = Array.from(new Set(expenses.map(e => e.date.slice(0, 7)))).sort().reverse();

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Expenses</h1>
          <p className="text-slate-500 font-medium">Track operational costs to calculate actual net profit</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md shadow-rose-500/20 transition-all duration-200 active:scale-[0.98] w-full md:w-auto shrink-0"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </header>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
              <h2 className="text-xl font-bold text-slate-800">New Expense</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Expense Type</label>
              <div className="flex p-1 bg-slate-100/80 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setExpenseType("individual")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    expenseType === "individual"
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Clock size={16} />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseType("monthly")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    expenseType === "monthly"
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Calendar size={16} />
                  Monthly
                </button>
              </div>
            </div>

            {expenseType === "individual" ? (
              <div className="animate-in fade-in duration-300">
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="premium-input" />
              </div>
            ) : (
              <>
                <div className="animate-in fade-in duration-300">
                  <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">From Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="premium-input" />
                </div>
                <div className="animate-in fade-in duration-300">
                  <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">To Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="premium-input" />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as Expense["category"])} className="premium-input appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g. Monthly shop rent" className="premium-input" />
            </div>
            
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Amount (₹)</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="premium-input font-bold text-rose-700" />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all"><X size={15} className="inline mr-1.5" />Cancel</button>
              <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-semibold rounded-xl shadow-md transition-all"><Check size={15} className="inline mr-1.5" />Save Expense</button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Total Card */}
          <div className="premium-card p-5 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl" />
            <div className="bg-rose-100/60 p-2.5 rounded-xl text-rose-600 w-fit mb-3"><TrendingDown size={22} /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-extrabold text-rose-600">₹{total.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{filtered.length} entries</p>
          </div>

          {/* Month Filter */}
          <div className="premium-card p-4">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Filter by Month</p>
            <button onClick={() => setFilterMonth("all")} className={`w-full text-left text-sm px-3 py-2 rounded-lg mb-1 font-semibold transition-colors ${filterMonth === "all" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>All Time</button>
            {months.map(m => {
              const [yr, mo] = m.split("-");
              return (
                <button key={m} onClick={() => setFilterMonth(m)} className={`w-full text-left text-sm px-3 py-2 rounded-lg mb-1 font-semibold transition-colors ${filterMonth === m ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
                  {MONTH_NAMES[parseInt(mo) - 1]} {yr}
                </button>
              );
            })}
          </div>

          {/* Category Breakdown */}
          <div className="premium-card p-4">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">By Category</p>
            <div className="space-y-2">
              {CATEGORIES.filter(c => byCategory[c] > 0).map(cat => (
                <div key={cat} className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}>{cat}</span>
                  <span className="text-sm font-bold text-slate-700">₹{byCategory[cat].toLocaleString()}</span>
                </div>
              ))}
              {Object.values(byCategory).every(v => v === 0) && (
                <p className="text-xs text-slate-400 font-medium">No expenses recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-slate-100 text-slate-400 p-5 rounded-full mb-4"><Wallet size={40} /></div>
              <h3 className="text-slate-700 font-bold text-lg mb-1">No expenses recorded</h3>
              <p className="text-slate-400 text-sm font-medium">Click "Add Expense" to start tracking costs.</p>
            </div>
          ) : (
            <div className="premium-card overflow-hidden">
              <div className="divide-y divide-slate-100/80">
                {paginatedExpenses.map(exp => (
                  <div key={exp.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                    <div className={`text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0 ${CATEGORY_COLORS[exp.category]}`}>
                      {exp.category}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 truncate">{exp.description}</p>
                        {exp.type === "monthly" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                            <Calendar size={10} />
                            Monthly
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {exp.type === "monthly" && exp.startDate && exp.endDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-300" />
                            {new Date(exp.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {new Date(exp.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-300" />
                            {exp.date}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="font-extrabold text-rose-600 text-lg shrink-0">₹{exp.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                    <button onClick={() => handleDelete(exp.id, exp.description)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {totalListPages > 1 && (
                <div className="p-3 bg-slate-50/30 border-t border-slate-100 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setListPage(prev => Math.max(1, prev - 1))}
                    disabled={listPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalListPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setListPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          listPage === page
                            ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                            : "text-slate-500 hover:bg-white hover:shadow-sm"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setListPage(prev => Math.min(totalListPages, prev + 1))}
                    disabled={listPage === totalListPages}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
