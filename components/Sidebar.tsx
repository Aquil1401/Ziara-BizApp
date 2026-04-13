"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Package, Archive, BookOpen, BarChart3, Briefcase, Users, FileText, Wallet, Settings, Receipt, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const links = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Scan Bill", href: "/scan", icon: ScanLine },
    { name: "Invoices", href: "/invoice", icon: FileText },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Analytics", href: "/reports", icon: BarChart3 },
    { name: "Inventory", href: "/inventory", icon: Archive },
    { name: "Purchases", href: "/purchases", icon: Package },
    { name: "Ledger", href: "/ledger", icon: BookOpen },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "GST Report", href: "/gst", icon: Receipt },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const initials = user?.email?.charAt(0)?.toUpperCase() || "U";
  const emailDisplay = user?.email || "Offline User";

  return (
    <div className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white border-r border-slate-200/50 shadow-sm z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100/80">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Briefcase size={22} strokeWidth={2.5} />
        </div>
        <div className="font-extrabold text-xl tracking-tight text-slate-800">
          Biz<span className="text-indigo-600">App</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-4 text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Main Menu</p>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-indigo-50/80 text-indigo-700 font-bold shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold"
              }`}
            >
              <Icon size={20} className={isActive ? "stroke-[2.5px]" : "stroke-[2px]"} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>

      {/* User info + Logout */}
      <div className="p-4 border-t border-slate-100/80 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{emailDisplay}</p>
            <p className="text-[10px] text-slate-400 font-medium">Logged in</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 font-semibold text-sm"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
