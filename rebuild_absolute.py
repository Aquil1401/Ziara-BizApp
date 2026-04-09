
import os

file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Markers for content assignment
p_start_m = 'content = (<>'
l_start_m = 'content = (<div className="p-5 pt-8 pb-28 min-h-screen">'
c_start_m = 'content = (<div className="p-5 pt-8 pb-28 min-h-screen">' # Same as list, need to be careful

def get_balanced(text, start_idx):
    count = 0
    for i in range(start_idx, len(text)):
        if text[i] == '(': count += 1
        elif text[i] == ')':
            count -= 1
            if count == 0: return i
    return -1

# Find first block (Preview)
idx1 = text.find(p_start_m)
end1 = get_balanced(text, idx1 + 10)
p_jsx = text[idx1+11:end1].strip()

# Find second block (List)
idx2 = text.find(l_start_m, end1)
end2 = get_balanced(text, idx2 + 10)
l_jsx = text[idx2+11:end2].strip()

# Find third block (Creator)
idx3 = text.find(l_start_m, end2)
end3 = get_balanced(text, idx3 + 10)
if idx3 == -1:
    # Maybe it's different?
    idx3 = text.find('content = (', end2)
    end3 = get_balanced(text, idx3 + 10)

c_jsx = text[idx3+11:end3].strip()

# Check for BALANCE
def check_balance(jsx, name):
    opens = jsx.count("<div") + jsx.count("<header") + jsx.count("<table") + jsx.count("<tbody") + jsx.count("<tr") + jsx.count("<td") + jsx.count("<th") + jsx.count("<h") + jsx.count("<p") + jsx.count("<span") + jsx.count("<button") + jsx.count("<style") + jsx.count("<select") + jsx.count("<option")
    closes = jsx.count("</")
    print(f"{name}: {opens} opens, {closes} closes. Diff: {opens-closes}")
    return opens-closes

check_balance(p_jsx, "PREVIEW")
check_balance(l_jsx, "LIST")
check_balance(c_jsx, "CREATOR")

# Force balance if diff > 0
def force_balance(jsx, diff):
    if diff <= 0: return jsx
    # This is a hack, but we assume they are nested divs
    return jsx + ("\n</div>" * diff)

p_jsx = force_balance(p_jsx, check_balance(p_jsx, "P"))
l_jsx = force_balance(l_jsx, check_balance(l_jsx, "L"))
c_jsx = force_balance(c_jsx, check_balance(c_jsx, "C"))

# Rebuild file
header = text.split('let content;')[0] + 'let content;\n'
modals = r"""
      {isBusinessModalOpen && (
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
        )}
"""

final_return = f"""
  if (previewMode && viewingInvoice) {{
    content = ({p_jsx});
  }} else if (view === "list") {{
    content = ({l_jsx});
  }} else {{
    content = ({c_jsx});
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
print("REBUILD COMPLETE.")
