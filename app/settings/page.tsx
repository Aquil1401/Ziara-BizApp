"use client";

import { useState, useEffect } from "react";
import { exportAllData, importAllData, getBusinessInfo, saveBusinessInfo } from "@/utils/localStorageService";
import { Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle2, Building, X, Save, QrCode, ImagePlus } from "lucide-react";
import { BusinessInfo } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(getBusinessInfo());
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBusinessInfo(getBusinessInfo());
    setMounted(true);
  }, []);

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

  const handleExport = () => {
    const data = exportAllData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bizapp-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        importAllData(data);
        setImportStatus("success");
        setTimeout(() => setImportStatus("idle"), 4000);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearAll = () => {
    setDialogState({
      isOpen: true,
      title: "Clear All Data",
      message: "⚠️ This will permanently delete ALL your data. This cannot be undone. Are you absolutely sure?",
      type: "danger",
      onConfirm: () => {
        setDialogState({
          isOpen: true,
          title: "FINAL WARNING",
          message: "Last warning! All sales, purchases, customers, invoices, products and expenses will be erased forever.",
          type: "danger",
          onConfirm: () => {
            localStorage.clear();
            setDialogState({
              isOpen: true,
              title: "Data Cleared",
              message: "All data cleared. Please refresh the page.",
              type: "success",
              onConfirm: () => {
                setDialogState(prev => ({ ...prev, isOpen: false }));
                window.location.reload();
              }
            });
          }
        });
      }
    });
  };
  const handleSaveBusiness = () => {
    setIsSaving(true);
    saveBusinessInfo(businessInfo);
    setTimeout(() => {
      setIsSaving(false);
      setDialogState({
        isOpen: true,
        title: "Success",
        message: "Business details saved successfully!",
        type: "success",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
    }, 500);
  };
 
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (recommend < 1MB for localStorage)
    if (file.size > 1024 * 1024) {
      setDialogState({
        isOpen: true,
        title: "File Too Large",
        message: "Please upload an image smaller than 1MB to ensure smooth app performance and storage.",
        type: "warning",
        onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setBusinessInfo({
        ...businessInfo, 
        bankDetails: {
          ...businessInfo.bankDetails, 
          upiQrCode: base64
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Clear input
  };

  if (!mounted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 font-medium">Manage your app data and preferences</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          {/* Business Details */}
          <div className="premium-card p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-blue-600" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><Building size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Business Details</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Branding & Tax Info</p>
                </div>
              </div>
              <button 
                onClick={handleSaveBusiness}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                Save
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                <input 
                  type="text" 
                  value={businessInfo.name} 
                  onChange={e => setBusinessInfo({...businessInfo, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700"
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN Number</label>
                <input 
                  type="text" 
                  value={businessInfo.gstin} 
                  onChange={e => setBusinessInfo({...businessInfo, gstin: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 font-mono"
                  placeholder="15-digit GSTIN"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="text" 
                  value={businessInfo.phone} 
                  onChange={e => setBusinessInfo({...businessInfo, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700"
                  placeholder="+91 0000000000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={businessInfo.email} 
                  onChange={e => setBusinessInfo({...businessInfo, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700"
                  placeholder="contact@business.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                <textarea 
                  rows={2}
                  value={businessInfo.address} 
                  onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 resize-none leading-relaxed"
                  placeholder="123 Business Street, City, State, 123456"
                />
              </div>

              <div className="md:col-span-2 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Bank Details (For Invoicing)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                    <input 
                      value={businessInfo.bankDetails.name}
                      onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, name: e.target.value}})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none"
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                    <input 
                      value={businessInfo.bankDetails.accountNo}
                      onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, accountNo: e.target.value}})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none"
                      placeholder="000000000000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                    <input 
                      value={businessInfo.bankDetails.ifsc}
                      onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, ifsc: e.target.value.toUpperCase()}})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none font-mono"
                      placeholder="HDFC0000000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                    <input 
                      value={businessInfo.bankDetails.branch}
                      onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, branch: e.target.value}})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none"
                      placeholder="Main Branch"
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-slate-100 mt-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">UPI ID (Optional)</label>
                    <input 
                      value={businessInfo.bankDetails.upiId}
                      onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, upiId: e.target.value}})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none"
                      placeholder="e.g. yourname@okaxis"
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">UPI QR Code (Optional)</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl hover:bg-white transition-colors">
                      {businessInfo.bankDetails.upiQrCode ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={businessInfo.bankDetails.upiQrCode} 
                            alt="UPI QR Code" 
                            className="w-24 h-24 object-contain rounded-lg border border-white shadow-sm bg-white"
                          />
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setBusinessInfo({
                                ...businessInfo, 
                                bankDetails: { ...businessInfo.bankDetails, upiQrCode: "" }
                              });
                            }}
                            className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove QR Code"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 shrink-0">
                          <QrCode size={32} strokeWidth={1.5} />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Upload a payment QR code to display on your generated invoices. <br className="hidden sm:block" />Recommended formats: PNG, JPG (Max 1MB).</p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95 group">
                          <ImagePlus size={14} className="group-hover:text-indigo-600 transition-colors" /> 
                          {businessInfo.bankDetails.upiQrCode ? "Change QR Image" : "Upload QR Code"}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleQrUpload} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
        {/* Backup & Restore */}
        <div className="premium-card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Database size={20} /></div>
            <h2 className="text-lg font-bold text-slate-800">Backup & Restore</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Export all your data (sales, purchases, customers, invoices, expenses) as a JSON file. 
            Store it in Google Drive or your phone to restore anytime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200"
            >
              <Download size={18} /> Export Backup
            </button>

            <label className="inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-200 cursor-pointer">
              <Upload size={18} /> Import Backup
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>

          {importStatus === "success" && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-semibold flex items-center gap-2">
              <Shield size={16} /> Data restored successfully! Please refresh the app.
            </div>
          )}
          {importStatus === "error" && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={16} /> Invalid backup file. Please use a file exported from this app.
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="premium-card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-100 text-slate-600 p-2 rounded-xl"><Shield size={20} /></div>
            <h2 className="text-lg font-bold text-slate-800">App Info</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500 font-medium">App Name</span><span className="font-semibold text-slate-800">BizApp</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-medium">Version</span><span className="font-semibold text-slate-800">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-medium">Storage Type</span><span className="font-semibold text-slate-800">Supabase Cloud Database</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-medium">Mode</span><span className="font-semibold text-indigo-600">Cloud-Synced PWA</span></div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="premium-card p-6 border-2 border-rose-100/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-100 text-rose-600 p-2 rounded-xl"><AlertTriangle size={20} /></div>
            <h2 className="text-lg font-bold text-rose-700">Danger Zone</h2>
          </div>
          <p className="text-slate-500 text-sm mb-5">Permanently delete all data from this device. This action is irreversible.</p>
          <button onClick={handleClearAll} className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all">
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
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
