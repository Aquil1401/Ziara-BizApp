"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, ShoppingCart, Package, Archive, BookOpen, BarChart3, Users, FileText, Wallet, Settings, Receipt } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Scan", href: "/scan", icon: ScanLine },
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "Purchases", href: "/purchases", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Archive },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Ledger", href: "/ledger", icon: BookOpen },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "Invoices", href: "/invoice", icon: FileText },
    { name: "GST", href: "/gst", icon: Receipt },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 glass-nav pb-safe z-50">
      <div className="flex h-[72px] max-w-lg mx-auto px-2 overflow-x-auto no-scrollbar items-center">
        <div className="flex min-w-max gap-1 px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex flex-col items-center justify-center w-[72px] h-[60px] flex-shrink-0 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? "bg-indigo-50/80 text-indigo-600 scale-100" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 scale-95"
                }`}
              >
                <Icon size={22} className={`mb-1 transition-all duration-300 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                <span className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
