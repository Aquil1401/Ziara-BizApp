
import re

def balance_jsx(text):
    # This is a slightly better auditor
    # Find all <Tag ...> and </Tag>
    # Ignore self-closing <Tag ... />
    
    # Remove strings and comments to avoid false positives
    text_clean = re.sub(r'\{`.*?`\}', '', text, flags=re.DOTALL) # Template literals
    text_clean = re.sub(r'\{/\*.*?\*/\}', '', text_clean, flags=re.DOTALL) # JSX comments
    
    tags = re.findall(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)', text_clean)
    
    stack = []
    # Known self-closing tags in this project
    self_closing = {'input', 'img', 'br', 'hr', 'Settings', 'Plus', 'CheckCircle', 'X', 'FileText', 'Eye', 'Download', 'Trash2', 'ArrowLeft', 'Printer', 'Building', 'Box', 'ConfirmDialog', 'Sidebar'}
    
    for closer, tag in tags:
        if tag in self_closing: continue
        if closer == '/':
            if stack and stack[-1] == tag:
                stack.pop()
            else:
                print(f"Warning: Unexpected closer </{tag}>")
        else:
            # Check if it was self-closing in the original text (ends with />)
            # This regex is approximate but good for our JSX
            if re.search(f'<{tag}[^>]*?/>', text):
                continue
            stack.append(tag)
    
    print(f"Unclosed tags: {stack}")
    return stack

def get_balanced(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    stack = balance_jsx(content)
    for tag in reversed(stack):
        if tag == '': # Fragment
            content += "\n</>"
        else:
            content += f"\n</{tag}>"
    return content

p = get_balanced("p_pure.txt")
l = get_balanced("l_pure.txt")
c = get_balanced("c_pure.txt")

# Header of the file (everything before the triple return)
file_path = r"g:\TechQ-Labs\Webapp\Business-Management-App\app\invoice\page.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    orig = f.read()

header = orig.split('let content;')[0] + 'let content;\n'

# Modals (Unified)
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

final_script = f"""
  if (previewMode && viewingInvoice) {{
    content = ({p});
  }} else if (view === "list") {{
    content = ({l});
  }} else {{
    content = ({c});
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
    f.write(header + final_script)
print("REBUILD SUCCESSFUL.")
