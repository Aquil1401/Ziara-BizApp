
import os

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fetch header (imports, states, etc)
# It used to be text.split('let content;')[0]
# But my previous mess might have multiple 'let content;' or something?
# Let's find the FIRST one.
header = text.split('let content;')[0] + 'let content;\n'

# 2. Re-create strings p, l, c carefully
# I'll re-extract from the c_pure_rebuilt.txt for c, etc.
# But wait, I have the actual logic in my mind.

# PREVIEW (p)
p_raw = r"""<div className="max-w-4xl mx-auto p-4 md:p-10 mb-20 bg-white">
          <div className="border-[1.5px] border-slate-900 p-0 shadow-[20px_20px_0px_rgba(15,23,42,0.05)]">
            <header className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 space-y-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <Building size={28} />
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">{businessInfo.name}</h1>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{businessInfo.address}
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>GSTIN: <span className="text-indigo-600 font-black">{businessInfo.gstin}</span>
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Ph: {businessInfo.phone} | {businessInfo.email}
                  </p>
                </div>
              </div>
              <div className="p-8 flex flex-col justify-center items-end text-right bg-white">
                <div className="bg-slate-900 text-white px-6 py-2 mb-4">
                  <h2 className="text-xl font-black uppercase tracking-[0.2em]">Tax Invoice</h2>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{invoiceNumber}</p>
                  <div className="h-4"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dated</p>
                  <p className="text-sm font-black text-slate-900 leading-none">{date}</p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Buyer (Bill to)</p>
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-900 uppercase leading-none">{customerName || "—"}</p>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed max-w-[280px]">{customerAddress || "—"}</p>
                  {customerPhone && <p className="text-[11px] font-bold text-slate-800 mt-2">Ph: {customerPhone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 bg-slate-50/30">
                <div className="p-6 border-r-[1.5px] border-slate-900 border-b-[1.5px]">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">E-Way Bill No.</p>
                  <p className="text-[10px] font-black text-slate-900">{eWayBillNo || "—"}</p>
                </div>
                <div className="p-6 border-b-[1.5px] border-slate-900">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Order No.</p>
                  <p className="text-[10px] font-black text-slate-900">{orderNo || "—"}</p>
                </div>
                <div className="p-6 border-r-[1.5px] border-slate-900">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Dispatched Through</p>
                  <p className="text-[10px] font-black text-slate-900">{dispatchedThrough || "—"}</p>
                </div>
                <div className="p-6">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Destination</p>
                  <p className="text-[10px] font-black text-slate-900">{destination || "—"}</p>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5px] border-slate-900 bg-slate-900 text-white">
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-12 border-r border-slate-700">#</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-left border-r border-slate-700">Description of Goods</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-24 border-r border-slate-700">HSN/SAC</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-center w-20 border-r border-slate-700">Qty</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-right w-28 border-r border-slate-700">Rate</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200 min-h-[40px]">
                    <td className="p-3 text-[11px] font-bold text-slate-900 text-center border-r-[1.5px] border-slate-900">{idx + 1}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 border-r-[1.5px] border-slate-900">{item.description}</td>
                    <td className="p-3 text-[11px] font-bold text-slate-600 text-center border-r-[1.5px] border-slate-900">{item.hsnCode || "—"}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 text-center border-r-[1.5px] border-slate-900">{item.quantity}</td>
                    <td className="p-3 text-[11px] font-bold text-slate-900 text-right border-r-[1.5px] border-slate-900">{item.rate.toFixed(2)}</td>
                    <td className="p-3 text-[11px] font-black text-slate-900 text-right">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-slate-100 min-h-[35px]">
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3 border-r-[1.5px] border-slate-900"></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-[1.5px] border-slate-900 bg-slate-50/50">
                <tr className="font-black">
                  <td colSpan={3} className="p-4 text-xs uppercase border-r-[1.5px] border-slate-900">Total</td>
                  <td className="p-4 text-xs text-center border-r-[1.5px] border-slate-900">{items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td className="p-4 border-r-[1.5px] border-slate-900"></td>
                  <td className="p-4 text-right text-base font-black bg-slate-900 text-white">₹{grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="grid grid-cols-2 border-b-[1.5px] border-slate-900">
              <div className="p-8 border-r-[1.5px] border-slate-900 space-y-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Bank Details</p>
                  <p className="text-[11px] font-black text-slate-900">Bank Name: {businessInfo.bankDetails.name}</p>
                  <p className="text-[11px] font-black text-slate-900">A/c No: {businessInfo.bankDetails.accountNo}</p>
                  <p className="text-[11px] font-black text-slate-900">IFSC Code: {businessInfo.bankDetails.ifsc}</p>
                  <p className="text-[11px] font-black text-slate-900">Branch: {businessInfo.bankDetails.branch}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxable Value (Base)</p>
                  <p className="text-sm font-black text-slate-900">₹{totalTaxable.toFixed(2)}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">GST Amount</p>
                  <p className="text-sm font-black text-indigo-600">₹{totalTaxAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex-1 p-8 text-center border-b border-slate-200">
                  <div className="h-16"></div>
                  <div className="border-t border-slate-900 pt-2 inline-block px-8">
                    <p className="text-[10px] font-black text-slate-900 uppercase">Receiver's Signature</p>
                  </div>
                </div>
                <div className="p-8 text-center bg-slate-50/50">
                  <p className="text-[9px] font-black text-slate-900 uppercase mb-6">For {businessInfo.name}</p>
                  <div className="h-12 w-32 border-b border-dashed border-slate-300 mx-auto mb-2"></div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Authorised Signatory</p>
                </div>
              </div>
            </div>

            <div className="p-4 text-center bg-slate-900 text-white">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em]">Subject to local jurisdiction. This is a computer generated invoice.</p>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between no-print">
            <button 
              onClick={() => setPreviewMode(false)}
              className="px-8 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl hover:bg-slate-50 transition-all flex items-center gap-3 shadow-[8px_8px_0px_rgba(15,23,42,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <ArrowLeft size={20} /> Edit Details
            </button>
            <div className="flex gap-4">
               <button 
                onClick={() => downloadInvoicePDF({
                   id: '',
                   invoiceNumber,
                   date,
                   customerName,
                   customerAddress,
                   items,
                   total: grandTotal,
                   status: 'draft'
                })}
                className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-[8px_8px_0px_rgba(5,150,105,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>"""

# LIST (l)
l_raw = r"""<div className="p-5 pt-8 pb-28 min-h-screen">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Invoices</h1>
            <p className="text-slate-500 font-medium">{savedInvoices.length} invoice{savedInvoices.length !== 1 ? "s" : ""} created</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsBusinessModalOpen(true)} 
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] shadow-sm"
              title="Business Settings"
            >
              <Settings size={18} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={() => { resetForm(); setView("create"); }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98] flex-1 md:flex-none">
              <Plus size={18} /> New Invoice
            </button>
          </div>
        </header>

        {/* Save success toast */}
        {saveToast && (
          <div className="premium-card mb-6 p-4 border-l-4 border-emerald-500 bg-emerald-50/60 flex items-start gap-3">
            <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-emerald-800 text-sm">
                Invoice {saveToast.invoiceNumber} saved successfully ✓
              </p>
              {saveToast.updatedItems.length > 0 ? (
                <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                  📦 Inventory automatically updated for: <strong>{saveToast.updatedItems.join(", ")}</strong>. Please check the <strong>Inventory</strong> section to verify the updated stock quantities.
                </p>
              ) : (
                <p className="text-emerald-600 text-xs mt-1">
                  Note: No matching products found in inventory — stock was not changed. Update manually in the <strong>Inventory</strong> section if needed.
                </p>
              )}
            </div>
            <button onClick={() => setSaveToast(null)} className="text-emerald-400 hover:text-emerald-700 transition-colors shrink-0 outline-none">
              <X size={16} />
            </button>
          </div>
        )}

        {savedInvoices.length === 0 ? (
          <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 text-slate-400 p-5 rounded-full mb-4">
              <FileText size={40} />
            </div>
            <h3 className="text-slate-700 font-bold text-lg mb-1">No invoices yet</h3>
            <p className="text-slate-400 text-sm font-medium">Create your first invoice using the "New Invoice" button above.</p>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Invoice #</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Customer</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Date</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Items</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Total</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold tracking-wider text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...savedInvoices].reverse().map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-indigo-600 text-sm">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{inv.customerName || "—"}</p>
                        {inv.customerAddress && <p className="text-xs text-slate-400 mt-0.5">{inv.customerAddress}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{inv.date}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {inv.items.length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as any)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none text-center min-w-[70px] ${
                            inv.status === "paid" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                            inv.status === "sent" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                            "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-extrabold text-slate-900">₹{inv.total.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            title="View Items"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => downloadInvoicePDF(inv)}
                            title="Download Invoice (PDF)"
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDialogState({
                                isOpen: true,
                                title: "Delete Invoice",
                                message: `Are you sure you want to permanently delete invoice ${inv.invoiceNumber}? This action cannot be undone.`,
                                type: "danger",
                                onConfirm: () => {
                                  deleteInvoice(inv.id);
                                  setDialogState({
                                    isOpen: true,
                                    title: "Deleted!",
                                    message: "The invoice has been removed successfully.",
                                    type: "success",
                                    showCancel: false,
                                    confirmLabel: "OK",
                                    onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
                                  });
                                }
                              });
                            }}
                            title="Delete Invoice"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={16} />
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
      </div>"""

# CREATOR (c)
with open(r"g:\TechQ-Labs\Webapp\Business-Management-App\c_pure_rebuilt.txt", 'r', encoding='utf-8') as f:
    c_raw = f.read().strip()

# MODALS
modals = r"""{isBusinessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                  <Building size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none">Business Settings</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Update your company details for tax invoices</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBusinessModalOpen(false)}
                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-slate-600 transition-all outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Business Name</label>
                  <input 
                    type="text" 
                    value={businessInfo.name} 
                    onChange={e => setBusinessInfo({...businessInfo, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-slate-800"
                    placeholder="My Business Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">GSTIN Number</label>
                  <input 
                    type="text" 
                    value={businessInfo.gstin} 
                    onChange={e => setBusinessInfo({...businessInfo, gstin: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-slate-800"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={businessInfo.phone} 
                    onChange={e => setBusinessInfo({...businessInfo, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={businessInfo.email} 
                    onChange={e => setBusinessInfo({...businessInfo, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-slate-800"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Business Address</label>
                  <textarea 
                    rows={2}
                    value={businessInfo.address} 
                    onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold text-slate-800 resize-none"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Default Bank Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    placeholder="Bank Name" 
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 text-sm font-semibold"
                    value={businessInfo.bankDetails.name}
                    onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, name: e.target.value}})}
                  />
                  <input 
                    placeholder="Account Number" 
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 text-sm font-semibold"
                    value={businessInfo.bankDetails.accountNo}
                    onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, accountNo: e.target.value}})}
                  />
                  <input 
                    placeholder="IFSC Code" 
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 text-sm font-semibold"
                    value={businessInfo.bankDetails.ifsc}
                    onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, ifsc: e.target.value}})}
                  />
                  <input 
                    placeholder="Branch" 
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 text-sm font-semibold"
                    value={businessInfo.bankDetails.branch}
                    onChange={e => setBusinessInfo({...businessInfo, bankDetails: {...businessInfo.bankDetails, branch: e.target.value}})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsBusinessModalOpen(false)}
                className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  saveBusinessInfo(businessInfo);
                  setIsBusinessModalOpen(false);
                  setDialogState({
                    isOpen: true,
                    title: "Settings Saved",
                    message: "Business details have been updated successfully.",
                    type: "success",
                    onConfirm: () => {}
                  });
                }}
                className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        showCancel={dialogState.showCancel}
        confirmLabel={dialogState.confirmLabel}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* View Items Modal */}
      {view === 'list' && viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(15,23,42,0.5)", backdropFilter:"blur(4px)"}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{viewingInvoice.invoiceNumber}</p>
                  <h2 className="text-lg font-extrabold text-slate-900">{viewingInvoice.customerName || "—"}</h2>
                  {viewingInvoice.customerAddress && <p className="text-xs text-slate-400">{viewingInvoice.customerAddress}</p>}
                </div>
                <button onClick={() => setViewingInvoice(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">#</th>
                      <th className="text-left pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Item</th>
                      <th className="text-center pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Qty</th>
                      <th className="text-right pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Rate</th>
                      <th className="text-right pb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-3 text-slate-400 text-xs font-bold">{idx + 1}</td>
                        <td className="py-3 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="py-3 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                        <td className="py-3 text-right font-semibold text-slate-900">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">{viewingInvoice.items.length} item{viewingInvoice.items.length !== 1 ? "s" : ""}</span>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-extrabold text-indigo-600">₹{viewingInvoice.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}"""

# 3. Final Rebuild
final_return = f"""
  if (previewMode && viewingInvoice) {{
    content = (<>{p_raw}</>);
  }} else if (view === "list") {{
    content = ({l_raw});
  }} else {{
    content = ({c_raw});
  }}

  return (
    <>
      {{content}}
      {modals}
    </>
  );
}}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(header + final_return)
print("Surgical Repair of InvoicePage.tsx Complete.")
