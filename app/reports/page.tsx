"use client";

import { useEffect, useState, useMemo } from "react";
import { getInvoices, getPurchases, getExpenses } from "@/utils/localStorageService";
import { Invoice, Purchase, Expense } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/utils/exportService";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PIE_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];

type QuickRange = "3M" | "6M" | "12M" | "thisYear" | "custom";

function buildMonthKeys(fromYear: number, fromMonth: number, toYear: number, toMonth: number): string[] {
  const keys: string[] = [];
  let y = fromYear, m = fromMonth;
  while (y < toYear || (y === toYear && m <= toMonth)) {
    keys.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return keys;
}

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exporting, setExporting] = useState(false);

  // Period selector state
  const now = new Date();
  const [quickRange, setQuickRange] = useState<QuickRange>("6M");
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  useEffect(() => {
    setInvoices(getInvoices());
    setPurchases(getPurchases());
    setExpenses(getExpenses());
  }, []);

  // Resolve actual from/to based on quickRange
  const { resolvedFrom, resolvedTo } = useMemo(() => {
    const t = new Date();
    if (quickRange === "3M") {
      const f = new Date(t.getFullYear(), t.getMonth() - 2, 1);
      return { resolvedFrom: { y: f.getFullYear(), m: f.getMonth() }, resolvedTo: { y: t.getFullYear(), m: t.getMonth() } };
    }
    if (quickRange === "6M") {
      const f = new Date(t.getFullYear(), t.getMonth() - 5, 1);
      return { resolvedFrom: { y: f.getFullYear(), m: f.getMonth() }, resolvedTo: { y: t.getFullYear(), m: t.getMonth() } };
    }
    if (quickRange === "12M") {
      const f = new Date(t.getFullYear(), t.getMonth() - 11, 1);
      return { resolvedFrom: { y: f.getFullYear(), m: f.getMonth() }, resolvedTo: { y: t.getFullYear(), m: t.getMonth() } };
    }
    if (quickRange === "thisYear") {
      return { resolvedFrom: { y: t.getFullYear(), m: 0 }, resolvedTo: { y: t.getFullYear(), m: t.getMonth() } };
    }
    return { resolvedFrom: { y: fromYear, m: fromMonth }, resolvedTo: { y: toYear, m: toMonth } };
  }, [quickRange, fromYear, fromMonth, toYear, toMonth]);

  // Build month keys for chart
  const monthKeys = useMemo(() =>
    buildMonthKeys(resolvedFrom.y, resolvedFrom.m, resolvedTo.y, resolvedTo.m),
    [resolvedFrom, resolvedTo]
  );

  // Filter data to selected range
  const filteredInvoices = useMemo(() => invoices.filter(inv => monthKeys.some(k => inv.date.startsWith(k))), [invoices, monthKeys]);
  const filteredPurchases = useMemo(() => purchases.filter(p => monthKeys.some(k => p.date.startsWith(k))), [purchases, monthKeys]);
  const filteredExpenses = useMemo(() => expenses.filter(e => monthKeys.some(k => e.date.startsWith(k))), [expenses, monthKeys]);

  const totalSales = filteredInvoices.reduce((s, x) => s + x.total, 0);
  const totalCost = filteredPurchases.reduce((s, x) => s + x.total, 0);
  const totalExpenses = filteredExpenses.reduce((s, x) => s + x.amount, 0);
  const grossProfit = totalSales - totalCost;
  const netProfit = grossProfit - totalExpenses;

  // Monthly chart data
  const monthlyData = useMemo(() => monthKeys.map(key => {
    const [y, m] = key.split("-");
    const monthSales = filteredInvoices.filter(inv => inv.date.startsWith(key)).reduce((sum, inv) => sum + inv.total, 0);
    const monthCost = filteredPurchases.filter(p => p.date.startsWith(key)).reduce((sum, p) => sum + p.total, 0);
    const monthExp = filteredExpenses.filter(e => e.date.startsWith(key)).reduce((sum, e) => sum + e.amount, 0);
    return {
      name: `${MONTH_NAMES[parseInt(m) - 1]} ${y}`,
      shortName: `${MONTH_NAMES[parseInt(m) - 1]}'${y.slice(2)}`,
      Sales: Math.round(monthSales),
      Cost: Math.round(monthCost),
      Expenses: Math.round(monthExp),
      Profit: Math.round(monthSales - monthCost - monthExp),
    };
  }), [monthKeys, filteredInvoices, filteredPurchases, filteredExpenses]);

  // Top products
  const productRevenue = filteredInvoices.reduce((acc, inv) => {
    inv.items.forEach(item => {
      const name = item.description;
      acc[name] = (acc[name] || 0) + item.total;
    });
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, value }));

  // Expense pie
  const expenseByCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const rangeLabel = quickRange !== "custom" ? "" : 
    `${MONTH_NAMES[fromMonth]} ${fromYear} → ${MONTH_NAMES[toMonth]} ${toYear}`;

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Analytics</h1>
          <p className="text-slate-500 font-medium">Business performance overview</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setExporting(true);
              try {
                await exportToExcel([{
                  name: "Monthly Breakdown",
                  columns: [
                    { header: "Month", key: "name", width: 16 },
                    { header: "Sales (₹)", key: "Sales", width: 16 },
                    { header: "Cost (₹)", key: "Cost", width: 16 },
                    { header: "Expenses (₹)", key: "Expenses", width: 16 },
                    { header: "Net Profit (₹)", key: "Profit", width: 16 },
                  ],
                  rows: monthlyData,
                }], `Analytics-Report-${new Date().toISOString().split('T')[0]}`);
              } finally { setExporting(false); }
            }}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={async () => {
              setExporting(true);
              try {
                await exportToPDF(
                  "Business Analytics Report",
                  `Period: ${monthKeys[0]} → ${monthKeys[monthKeys.length - 1]}`,
                  [{
                    heading: "Monthly Breakdown",
                    columns: ["Month", "Sales", "Cost", "Expenses", "Net Profit"],
                    rows: monthlyData.map(r => [r.name, r.Sales, r.Cost, r.Expenses, r.Profit]),
                  }],
                  `Analytics-Report-${new Date().toISOString().split('T')[0]}`
                );
              } finally { setExporting(false); }
            }}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </header>

      {/* ─── Period Selector ───────────────────────────────── */}
      <div className="premium-card p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <Calendar size={16} /> Period:
          </div>
          {/* Quick range pills */}
          {(["3M","6M","12M","thisYear","custom"] as QuickRange[]).map(r => (
            <button
              key={r}
              onClick={() => setQuickRange(r)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                quickRange === r
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === "thisYear" ? "This Year" : r === "custom" ? "Custom" : r}
            </button>
          ))}

          {quickRange !== "custom" && (
            <span className="text-xs text-slate-400 font-medium ml-1">
              {monthKeys.length} month{monthKeys.length !== 1 ? "s" : ""} shown
            </span>
          )}
        </div>

        {/* Custom Range Pickers */}
        {quickRange === "custom" && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">From Month</label>
              <select value={fromMonth} onChange={e => setFromMonth(parseInt(e.target.value))} className="premium-input appearance-none text-sm">
                {FULL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">From Year</label>
              <select value={fromYear} onChange={e => setFromYear(parseInt(e.target.value))} className="premium-input appearance-none text-sm">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">To Month</label>
              <select value={toMonth} onChange={e => setToMonth(parseInt(e.target.value))} className="premium-input appearance-none text-sm">
                {FULL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">To Year</label>
              <select value={toYear} onChange={e => setToYear(parseInt(e.target.value))} className="premium-input appearance-none text-sm">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {rangeLabel && <p className="col-span-2 md:col-span-4 text-xs text-indigo-600 font-semibold">{monthKeys.length} months: {rangeLabel}</p>}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: totalSales, icon: TrendingUp, bg: "bg-indigo-50", text: "text-indigo-600" },
          { label: "Gross Profit", value: grossProfit, icon: DollarSign, bg: "bg-emerald-50", text: grossProfit >= 0 ? "text-emerald-600" : "text-rose-600" },
          { label: "Total Expenses", value: totalExpenses, icon: TrendingDown, bg: "bg-rose-50", text: "text-rose-600" },
          { label: "Net Profit", value: netProfit, icon: BarChart3, bg: "bg-blue-50", text: netProfit >= 0 ? "text-blue-600" : "text-rose-600" },
        ].map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="premium-card p-5 relative overflow-hidden">
            <div className={`${bg} p-2.5 rounded-xl ${text} w-fit mb-3`}><Icon size={20} /></div>
            <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${text}`}>₹{Math.abs(value).toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            {value < 0 && <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Loss</p>}
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="premium-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Monthly Sales, Cost & Net Profit</h2>
          <span className="text-xs text-slate-400 font-medium">{monthKeys.length} months</span>
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">No data in this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={3} barCategoryGap={monthKeys.length > 8 ? "15%" : "25%"}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} interval={monthKeys.length > 10 ? 1 : 0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip
                formatter={(v: number, name: string) => [`₹${v.toLocaleString()}`, name]}
                labelFormatter={l => {
                  const d = monthlyData.find(x => x.shortName === l);
                  return d?.name || l;
                }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px -4px rgba(0,0,0,0.08)" }}
              />
              <Bar dataKey="Sales" fill="#6366f1" radius={[5, 5, 0, 0]} />
              <Bar dataKey="Cost" fill="#f59e0b" radius={[5, 5, 0, 0]} />
              <Bar dataKey="Profit" fill="#10b981" radius={[5, 5, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly Detail Table */}
      {monthlyData.length > 0 && filteredInvoices.length > 0 && (
        <div className="premium-card p-6 mb-6 overflow-x-auto">
          <h2 className="text-base font-bold text-slate-800 mb-4">Month-by-Month Breakdown</h2>
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-2.5 text-xs font-bold tracking-wider text-slate-400 uppercase pr-4">Month</th>
                <th className="text-right py-2.5 text-xs font-bold tracking-wider text-indigo-400 uppercase">Sales</th>
                <th className="text-right py-2.5 text-xs font-bold tracking-wider text-amber-400 uppercase">Cost</th>
                <th className="text-right py-2.5 text-xs font-bold tracking-wider text-rose-400 uppercase">Expenses</th>
                <th className="text-right py-2.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">Net Profit</th>
                <th className="text-right py-2.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthlyData.map((row) => {
                const margin = row.Sales > 0 ? ((row.Profit / row.Sales) * 100).toFixed(1) : "—";
                return (
                  <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-semibold text-slate-700 pr-4">{row.name}</td>
                    <td className="py-3 text-right font-semibold text-indigo-600">₹{row.Sales.toLocaleString()}</td>
                    <td className="py-3 text-right text-amber-600 font-medium">₹{row.Cost.toLocaleString()}</td>
                    <td className="py-3 text-right text-rose-600 font-medium">₹{row.Expenses.toLocaleString()}</td>
                    <td className={`py-3 text-right font-extrabold ${row.Profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.Profit < 0 ? "-" : ""}₹{Math.abs(row.Profit).toLocaleString()}
                    </td>
                    <td className={`py-3 text-right text-xs font-bold ${parseFloat(margin as string) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {margin !== "—" ? `${margin}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
              <tr>
                <td className="py-3 font-extrabold text-slate-800">Total</td>
                <td className="py-3 text-right font-extrabold text-indigo-700">₹{totalSales.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="py-3 text-right font-extrabold text-amber-700">₹{totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="py-3 text-right font-extrabold text-rose-700">₹{totalExpenses.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className={`py-3 text-right font-extrabold ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {netProfit < 0 ? "-" : ""}₹{Math.abs(netProfit).toLocaleString(undefined, {maximumFractionDigits:0})}
                </td>
                <td className="py-3 text-right text-xs font-bold text-slate-400">
                  {totalSales > 0 ? `${((netProfit / totalSales) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products Pie */}
        <div className="premium-card p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">No data in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topProducts} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {topProducts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="premium-card p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5">Expense Breakdown</h2>
          {expensePieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">No expenses in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                  {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Profit Trend Line */}
      <div className="premium-card p-6">
        <h2 className="text-base font-bold text-slate-800 mb-5">Profit Trend</h2>
        {filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data in this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} interval={monthKeys.length > 10 ? 1 : 0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip
                formatter={(v: number, name: string) => [`₹${v.toLocaleString()}`, name]}
                labelFormatter={l => { const d = monthlyData.find(x => x.shortName === l); return d?.name || l; }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
              />
              <Line type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} activeDot={{ r: 7 }} />
              <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
