"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import DataSync from "@/components/DataSync";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useAuth } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const isLoginPage = pathname === "/login";

  // Hydration safety mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // While auth is being checked or hydration is occurring
  if ((loading || !mounted) && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse" />
          <div className="w-5 h-5 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Login page — render children only, no nav
  if (isLoginPage) {
    return (
      <>
        {children}
        <PWAInstallPrompt />
      </>
    );
  }

  // Authenticated app shell
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-64 w-full h-screen overflow-hidden">
          <main className="h-full overflow-y-auto pb-20 md:pb-8 bg-slate-50 w-full lg:rounded-bl-[40px] shadow-sm">
            <div className="w-full px-4 md:px-8 xl:px-12 mx-auto pt-4 md:pt-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
      <DataSync />
      <PWAInstallPrompt />
    </>
  );
}
