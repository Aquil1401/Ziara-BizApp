"use client";

import { useState, useEffect, useRef } from "react";
import { getProducts, saveProduct, deleteProduct } from "@/utils/localStorageService";
import { Product } from "@/lib/types";
import { Plus, Search, Trash2, Edit2, X, Check, Package, AlertCircle, Clock, Plus as PlusIcon, FileSpreadsheet, Loader2, Image as ImageIcon, Upload, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import ConfirmDialog from "@/components/ConfirmDialog";
import InputDialog from "@/components/InputDialog";

const UNITS = ["Piece", "Packet", "Kg", "Gram", "Litre", "ML", "Box", "Carton", "Dozen", "Bundle", "Meter", "Pair"];
const BUYING_UNITS = ["Piece", "Packet", "Box", "Carton", "Dozen", "Bundle", "Kg", "Litre"];

function isNearExpiry(dateStr?: string): boolean {
  if (!dateStr) return false;
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [inputDialogState, setInputDialogState] = useState<{
    isOpen: boolean;
    title: string;
    label: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: "",
    label: "",
    defaultValue: "",
    onConfirm: () => {}
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Basic fields
  const [name, setName] = useState("");
  const [stock, setStock] = useState("0");
  const [unit, setUnit] = useState("Piece");
  const [category, setCategory] = useState("General");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [minStock, setMinStock] = useState("10");

  // Advanced fields
  const [buyingUnit, setBuyingUnit] = useState("Carton");
  const [conversionFactor, setConversionFactor] = useState("1");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState("0");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  const load = () => {
    const prods = getProducts();
    // Migrated products might not have createdAt, assign one if missing (using a safe past date)
    const migrated = prods.map(p => ({
      ...p,
      createdAt: p.createdAt || new Date(0).toISOString()
    }));
    setProducts(migrated);
    
    // Extract unique categories from products
    const uniqueCats = Array.from(new Set(migrated.map(p => p.category).filter(Boolean) as string[]));
    // If no categories yet, default to an empty list or "General" if user hasn't added any
    setCategories(uniqueCats.length > 0 ? uniqueCats : ["General"]);
  };
  
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(""); setStock("0"); setUnit("Piece"); setCategory("General"); setSellingPrice(""); setCostPrice("");
    setBatchNumber(""); setExpiryDate(""); setImage(null); setHsnCode(""); setGstRate("0"); setCustomFields([]); setEditingId(null);
    setShowForm(false); setShowAdvanced(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for localStorage
        setDialogState({
          isOpen: true,
          title: "File Too Large",
          message: "Image is too large. Please select a file smaller than 1MB.",
          type: "warning",
          onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (p: Product) => {
    setName(p.name); setStock(p.stock.toString()); setUnit(p.unit || "Piece");
    setCategory(p.category || "General");
    setSellingPrice(p.sellingPrice?.toString() || ""); setCostPrice(p.costPrice?.toString() || "");
    setMinStock(p.minStock?.toString() || "10"); setBuyingUnit(p.buyingUnit || "Carton");
    setConversionFactor(p.conversionFactor?.toString() || "1"); setBatchNumber(p.batchNumber || "");
    setExpiryDate(p.expiryDate || ""); setImage(p.image || null);
    setHsnCode(p.hsnCode || ""); setGstRate(p.gstRate?.toString() || "0");
    const cf = p.customFields ? Object.entries(p.customFields).map(([key, value]) => ({ key, value })) : [];
    setCustomFields(cf);
    setEditingId(p.id); setShowForm(true); setShowAdvanced(cf.length > 0 || !!p.expiryDate || !!p.batchNumber || !!p.hsnCode || !!p.gstRate);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDialogState({
      isOpen: true,
      title: "Delete Products",
      message: `Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`,
      type: "danger",
      onConfirm: () => {
        selectedIds.forEach(id => deleteProduct(id));
        setSelectedIds([]);
        load();
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    setDialogState({
      isOpen: true,
      title: "Delete Product",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      type: "danger",
      onConfirm: () => {
        deleteProduct(id);
        load();
        setDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedResults.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const existing = editingId ? products.find(p => p.id === editingId) : null;
    const cfObj = customFields.reduce((acc, { key, value }) => { if (key.trim()) acc[key.trim()] = value; return acc; }, {} as Record<string, string>);
    const product: Product = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      stock: parseFloat(stock) || 0,
      unit, buyingUnit, conversionFactor: parseFloat(conversionFactor) || 1,
      minStock: parseFloat(minStock) || 0,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
      batchNumber: batchNumber || undefined,
      expiryDate: expiryDate || undefined,
      image: image || undefined,
      hsnCode: hsnCode || undefined,
      gstRate: parseFloat(gstRate) || 0,
      category,
      createdAt: editingId ? (existing?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      customFields: Object.keys(cfObj).length > 0 ? cfObj : undefined,
    };
    saveProduct(product);
    load();
    resetForm();
  };


  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const currentProducts = getProducts();
        const newProducts = data.map((row: any) => ({
          id: crypto.randomUUID(),
          name: row["Product Name"] || row.Name || row.name || row.Product || row.product || "Unknown Product",
          stock: parseFloat(row.Stock || row.stock || row.Qty || row.qty || "0"),
          unit: row.Unit || row.unit || "Piece",
          category: row.Category || row.category || "General",
          costPrice: parseFloat(row["Cost Price"] || row.costPrice || row.Cost || row.cost || "0"),
          sellingPrice: parseFloat(row["Selling Price"] || row.sellingPrice || row.B2C_Price || row.Price || row.price || "0"),
          minStock: parseFloat(row["Min Stock"] || row.minStock || "10"),
          createdAt: new Date().toISOString(),
        }));

        const merged = [...currentProducts, ...newProducts];
        localStorage.setItem("products", JSON.stringify(merged));
        load();
        setDialogState({
          isOpen: true,
          title: "Import Successful",
          message: `Successfully imported ${newProducts.length} products.`,
          type: "success",
          onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
        });
      } catch (err) {
        console.error(err);
        setDialogState({
          isOpen: true,
          title: "Import Failed",
          message: "Failed to import Excel file. Please ensure it follows a standard format (Name, Stock, Unit, Cost Price, Selling Price).",
          type: "danger",
          onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false }))
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const addCustomField = () => setCustomFields(prev => [...prev, { key: "", value: "" }]);
  const updateCustomField = (i: number, field: "key" | "value", val: string) => {
    setCustomFields(prev => prev.map((cf, idx) => idx === i ? { ...cf, [field]: val } : cf));
  };
  const removeCustomField = (i: number) => setCustomFields(prev => prev.filter((_, idx) => idx !== i));

  const handleAddCategory = () => {
    setInputDialogState({
      isOpen: true,
      title: "New Category",
      label: "Enter new category name:",
      defaultValue: "",
      onConfirm: (val: string) => {
        const trimmed = val.trim();
        if (trimmed) {
          if (!categories.includes(trimmed)) {
            setCategories(prev => [...prev, trimmed]);
          }
          setCategory(trimmed);
        }
        setInputDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filter & Sort
  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => filterCategory === "All" || p.category === filterCategory)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedResults = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const lowStockCount = products.filter(p => p.stock < (p.minStock ?? 10)).length;
  const nearExpiryCount = products.filter(p => isNearExpiry(p.expiryDate)).length;

  return (
    <div className="p-5 pt-8 pb-28 min-h-screen">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Inventory</h1>
          <p className="text-slate-500 font-medium">{products.length} products · {lowStockCount > 0 && <span className="text-amber-600">{lowStockCount} low stock</span>}{nearExpiryCount > 0 && <span className="text-rose-600"> · {nearExpiryCount} near expiry</span>}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .csv" className="hidden" />
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-semibold rounded-xl hover:bg-rose-100 transition-all duration-200 shadow-sm flex-1 md:flex-none animate-in fade-in slide-in-from-right-4"
            >
              <Trash2 size={18} />
              Delete ({selectedIds.length})
            </button>
          )}
          <button 
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()} 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-all duration-200 flex-1 md:flex-none"
          >
            {isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
            {isImporting ? "Importing..." : "Import Excel"}
          </button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 flex-1 md:flex-none uppercase tracking-wide text-xs">
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Cancel" : "Add Product"}
          </button>
        </div>
      </header>

      {/* Alerts bar */}
      {(lowStockCount > 0 || nearExpiryCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold px-4 py-2 rounded-xl">
              <AlertCircle size={15} /> {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below reorder level
            </div>
          )}
          {nearExpiryCount > 0 && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold px-4 py-2 rounded-xl">
              <Clock size={15} /> {nearExpiryCount} item{nearExpiryCount > 1 ? "s" : ""} expiring within 30 days
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={resetForm} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
              <h2 className="text-xl font-bold text-slate-800">{editingId ? "Edit Product" : "New Product"}</h2>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Product Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Product name" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Current Stock</label>
                <input type="number" step="0.01" value={stock} onChange={e => setStock(e.target.value)} className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Selling Unit</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="premium-input appearance-none">
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Category</label>
                <div className="flex gap-2">
                  <select value={category} onChange={e => setCategory(e.target.value)} className="premium-input appearance-none flex-1">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={handleAddCategory} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Cost Price (₹)</label>
                <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Selling Price (₹)</label>
                <input type="number" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Min Stock (Reorder Level)</label>
                <input type="number" step="1" value={minStock} onChange={e => setMinStock(e.target.value)} className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">HSN/SAC Code</label>
                <input value={hsnCode} onChange={e => setHsnCode(e.target.value)} placeholder="HSN Code" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">GST Rate (%)</label>
                <select value={gstRate} onChange={e => setGstRate(e.target.value)} className="premium-input appearance-none">
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Product Image</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {image ? <img src={image} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={20} />}
                  </div>
                  <label className="flex-1">
                    <div className="premium-input flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-slate-400 text-sm truncate">{image ? "Change Image" : "Upload Image"}</span>
                      <Upload size={16} className="text-indigo-500" />
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </div>
                  </label>
                  {image && <button type="button" onClick={() => setImage(null)} className="text-rose-500 hover:text-rose-600 p-1"><X size={18} /></button>}
                </div>
              </div>
            </div>

            {/* Advanced toggle */}
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-4 transition-colors">
              <PlusIcon size={15} className={`transition-transform ${showAdvanced ? "rotate-45" : ""}`} />
              {showAdvanced ? "Hide" : "Show"} Advanced (Multi-Unit, Expiry, Custom Fields)
            </button>

            {showAdvanced && (
              <div className="border border-slate-100 rounded-2xl p-5 mb-4 space-y-5">
                {/* Multi-Unit */}
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Multi-Unit Management</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Buying Unit</label>
                      <select value={buyingUnit} onChange={e => setBuyingUnit(e.target.value)} className="premium-input appearance-none text-sm">
                        {BUYING_UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Selling Unit</label>
                      <div className="premium-input text-sm text-slate-500 bg-slate-50/80">{unit}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Conversion (1 {buyingUnit} = ? {unit}s)</label>
                      <input type="number" step="1" min="1" value={conversionFactor} onChange={e => setConversionFactor(e.target.value)} className="premium-input text-sm" />
                    </div>
                  </div>
                  {parseFloat(conversionFactor) > 1 && (
                    <p className="text-xs text-emerald-600 font-medium mt-2 bg-emerald-50 px-3 py-2 rounded-lg">
                      1 {buyingUnit} → {conversionFactor} {unit}s
                    </p>
                  )}
                </div>

                {/* Expiry & Batch */}
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Expiry & Batch</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Batch Number</label>
                      <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. BATCH-2025-01" className="premium-input text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Expiry Date</label>
                      <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="premium-input text-sm" />
                    </div>
                  </div>
                </div>

                {/* Custom Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Custom Fields</p>
                    <button type="button" onClick={addCustomField} className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1">
                      <PlusIcon size={13} /> Add Field
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Add business-specific attributes like Size, Color, Brand, etc.</p>
                  {customFields.map((cf, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                      <input value={cf.key} onChange={e => updateCustomField(i, "key", e.target.value)} placeholder="Field name (e.g. Size)" className="col-span-2 premium-input text-sm py-2" />
                      <input value={cf.value} onChange={e => updateCustomField(i, "value", e.target.value)} placeholder="Value (e.g. XL)" className="col-span-2 premium-input text-sm py-2" />
                      <button type="button" onClick={() => removeCustomField(i)} className="flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:justify-end pt-4 border-t border-slate-100">
              <button type="button" onClick={resetForm} className="md:w-auto px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"><X size={15} className="inline mr-1.5" />Cancel</button>
              <button type="submit" className="md:w-auto px-10 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-md transition-all"><Check size={15} className="inline mr-1.5" />{editingId ? "Save Changes" : "Add Product"}</button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search products..." className="premium-input pl-12" />
        </div>
        <div className="w-full md:w-64">
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="premium-input appearance-none font-semibold text-slate-700">
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Product List */}
      {filtered.length === 0 ? (
        <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-100 text-slate-400 p-5 rounded-full mb-4"><Package size={40} /></div>
          <h3 className="text-slate-700 font-bold text-lg mb-1">{search ? "No products found" : "No products yet"}</h3>
          <p className="text-slate-400 text-sm">Click "Add Product" to get started.</p>
        </div>
      ) : (
        <>
          <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={paginatedResults.length > 0 && selectedIds.length === paginatedResults.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-16 text-center">Img</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Product details</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Category</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Stock</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cost Price</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Selling Price</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedResults.map(p => {
                  const expired = isExpired(p.expiryDate);
                  const nearExpiry = isNearExpiry(p.expiryDate);
                  const lowStock = p.stock < (p.minStock ?? 10);
                  const isSelected = selectedIds.includes(p.id);
                  
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors group ${isSelected ? "bg-indigo-50/30" : ""}`}>
                      <td className="px-5 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div 
                          className={`w-12 h-12 mx-auto rounded-xl border flex items-center justify-center overflow-hidden bg-white shadow-sm transition-transform group-hover:scale-110 ${p.image ? "cursor-pointer hover:ring-2 hover:ring-indigo-400" : ""} ${expired ? "border-rose-200" : nearExpiry ? "border-amber-200" : "border-slate-100"}`}
                          onClick={() => p.image && setViewImage(p.image)}
                          title={p.image ? "Click to view image" : ""}
                        >
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} className="text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <div className="flex gap-1">
                              {expired && <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase">Expired</span>}
                              {!expired && nearExpiry && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Exp Soon</span>}
                              {lowStock && <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase">Low Stock</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px]">
                            <span className="text-slate-400 font-medium">Unit: {p.unit}</span>
                            {p.hsnCode && <span className="text-slate-500 font-mono bg-slate-100 px-1 rounded text-[10px]">HSN: {p.hsnCode}</span>}
                            {p.gstRate !== undefined && <span className="text-indigo-600 bg-indigo-50 px-1 rounded text-[10px] font-bold">{p.gstRate}% GST</span>}
                            {p.batchNumber && <span className="text-slate-500 font-mono bg-slate-100 px-1 rounded">Batch: {p.batchNumber}</span>}
                            {p.expiryDate && <span className={`font-medium ${expired ? "text-rose-500" : nearExpiry ? "text-amber-600" : "text-slate-500"}`}>Exp: {p.expiryDate}</span>}
                            {p.customFields && Object.entries(p.customFields).map(([k, v]) => (
                               <span key={k} className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-semibold">{k}: {v}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">
                          {p.category || "General"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-black ${lowStock ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-600 text-sm">
                        {p.costPrice ? `₹${p.costPrice.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-indigo-600">
                        {p.sellingPrice ? `₹${p.sellingPrice.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(p)} title="Edit" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} title="Delete" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 font-medium">
              Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="text-slate-900 font-bold">{filtered.length}</span> products
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === page ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"}`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}

      <ConfirmDialog 
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Image Preview Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setViewImage(null)} />
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setViewImage(null)} 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={28} />
            </button>
            <img src={viewImage} alt="Product preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}

      <InputDialog
        isOpen={inputDialogState.isOpen}
        title={inputDialogState.title}
        label={inputDialogState.label}
        defaultValue={inputDialogState.defaultValue}
        onConfirm={inputDialogState.onConfirm}
        onCancel={() => setInputDialogState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
