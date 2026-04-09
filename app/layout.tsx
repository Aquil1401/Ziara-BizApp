import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: "Business Manager PWA",
  description: "Personal Business Management for SMEs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BizApp",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900 md:bg-slate-100`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 md:ml-64 w-full h-screen overflow-hidden">
            <main className="h-full overflow-y-auto pb-20 md:pb-8 bg-slate-50 w-full lg:rounded-bl-[40px] shadow-sm">
              <div className="w-full px-4 md:px-8 xl:px-12 mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
