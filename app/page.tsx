"use client";

import { useEffect, useState } from "react";
import { getPurchases, getCustomers, getProducts, getInvoices } from "@/utils/localStorageService";
import { Product } from "@/lib/types";
import { TrendingUp, AlertCircle, Users, Wallet, BarChart3, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const loadDashboardData = () => {
      const invoices = getInvoices();
      const purchases = getPurchases();
      const customers = getCustomers();
      const products = getProducts();

      const today = new Date().toISOString().split("T")[0];

      // Calculate total sales (from all invoices)
      const salesTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);
      setTotalSales(salesTotal);

      // Calculate today's sales (from today's invoices)
      const todaysInvoices = invoices.filter((inv) => inv.date.startsWith(today));
      const salesToday = todaysInvoices.reduce((sum, inv) => sum + inv.total, 0);
      setTodaySales(salesToday);

      // Calculate total profit
      let profit = 0;
      invoices.forEach((inv) => {
        inv.items.forEach((item) => {
          // Find matching product by name (case-insensitive) to get cost
          const product = products.find(p => p.name.toLowerCase() === item.description.toLowerCase());
          let avgCost = 0;
          
          if (product) {
            const productPurchases = purchases.filter((p) => p.productId === product.id);
            avgCost = productPurchases.length > 0 
              ? productPurchases.reduce((sum, p) => sum + p.costPrice, 0) / productPurchases.length 
              : 0;
          }
          
          profit += item.total - (avgCost * item.quantity);
        });
      });
      setTotalProfit(profit);

      // Pending payments
      const pending = customers.reduce((sum, c) => sum + c.balance, 0);
      setPendingPayments(pending);

      // Low stock
      const lowStock = products.filter((p) => p.stock < 10);
      setLowStockProducts(lowStock);
    };

    loadDashboardData();
  }, []);

  const totalPages = Math.ceil(lowStockProducts.length / itemsPerPage);
  const paginatedProducts = lowStockProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-5 pt-10 pb-28 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Overview</h1>
        <p className="text-slate-500 font-medium">Welcome back to your business.</p>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-10">
        <div className="premium-card p-5 flex flex-col items-start justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors duration-500" />
          <div className="bg-emerald-100/50 p-2.5 rounded-xl mb-4 relative z-10 text-emerald-600">
            <Clock size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Today's Sales</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{todaySales.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          </div>
        </div>

        <div className="premium-card p-5 flex flex-col items-start justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors duration-500" />
          <div className="bg-blue-100/50 p-2.5 rounded-xl mb-4 relative z-10 text-blue-600">
            <BarChart3 size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Sales</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{totalSales.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          </div>
        </div>
        
        <div className="premium-card p-5 flex flex-col items-start justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors duration-500" />
          <div className="bg-indigo-100/50 p-2.5 rounded-xl mb-4 relative z-10 text-indigo-600">
            <Wallet size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{totalProfit.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          </div>
        </div>

        <Link href="/ledger" className="premium-card p-5 flex flex-col items-start justify-between relative overflow-hidden group hover:ring-2 hover:ring-amber-500/30 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors duration-500" />
          <div className="bg-amber-100/50 p-2.5 rounded-xl mb-4 relative z-10 text-amber-600">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Money to Collect</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{pendingPayments.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
          </div>
        </Link>

        <div className="premium-card p-5 flex flex-col items-start justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-colors duration-500" />
          <div className="bg-rose-100/50 p-2.5 rounded-xl mb-4 relative z-10 text-rose-600">
            <AlertCircle size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Low Stock</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{lowStockProducts.length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Action Items</h2>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="premium-card overflow-hidden">
          <div className="bg-rose-50/50 border-b border-rose-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-rose-600" size={20} />
              <h3 className="font-semibold text-rose-900">Items Needing Restock</h3>
            </div>
            {totalPages > 1 && (
              <span className="text-xs font-bold text-rose-700/60 bg-rose-100/50 px-2 py-1 rounded-md">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100/80">
            {paginatedProducts.map((p) => (
              <li key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <span className="font-semibold text-slate-800">{p.name}</span>
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg">
                  {p.stock} remaining
                </span>
              </li>
            ))}
          </ul>
          
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50/30 border-t border-slate-100 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                        : "text-slate-500 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="premium-card bg-emerald-50/30 border-emerald-100/50 p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-4 shadow-sm">
            <TrendingUp size={32} />
          </div>
          <h3 className="text-emerald-900 font-bold text-lg mb-1">All Clear!</h3>
          <p className="text-emerald-700/80 font-medium text-sm">Your inventory is fully stocked.</p>
        </div>
      )}
    </div>
  );
}
