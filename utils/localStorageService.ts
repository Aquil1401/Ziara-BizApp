import { Product, Customer, Sale, Purchase, BillScan, Invoice, Expense, LedgerEntry, BusinessInfo } from "../lib/types";

const STORAGE_KEYS = {
  PRODUCTS: "products",
  CUSTOMERS: "customers",
  SALES: "sales",
  PURCHASES: "purchases",
  BILL_SCANS: "bill_scans",
  EXPENSES: "expenses",
  INVOICES: "invoices",
  LEDGER_ENTRIES: "ledger_entries",
  BUSINESS_INFO: "business_info",
};

export const saveData = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

export const loadData = <T>(key: string): T[] => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export const updateData = <T extends { id: string }>(key: string, updatedItem: T) => {
  const items = loadData<T>(key);
  const index = items.findIndex((item) => item.id === updatedItem.id);
  if (index !== -1) {
    items[index] = updatedItem;
    saveData(key, items);
  } else {
    items.push(updatedItem);
    saveData(key, items);
  }
};

export const deleteData = (key: string, id: string) => {
  const items = loadData<{ id: string }>(key);
  const filtered = items.filter((item) => item.id !== id);
  saveData(key, filtered);
};

// Product
export const getProducts = () => loadData<Product>(STORAGE_KEYS.PRODUCTS);
export const saveProduct = (product: Product) => updateData(STORAGE_KEYS.PRODUCTS, product);
export const deleteProduct = (id: string) => deleteData(STORAGE_KEYS.PRODUCTS, id);

// Customer
export const getCustomers = () => loadData<Customer>(STORAGE_KEYS.CUSTOMERS);
export const saveCustomer = (customer: Customer) => updateData(STORAGE_KEYS.CUSTOMERS, customer);
export const deleteCustomer = (id: string) => deleteData(STORAGE_KEYS.CUSTOMERS, id);

// Sales
export const getSales = () => loadData<Sale>(STORAGE_KEYS.SALES);
export const saveSale = (sale: Sale) => updateData(STORAGE_KEYS.SALES, sale);

// Purchases
export const getPurchases = () => loadData<Purchase>(STORAGE_KEYS.PURCHASES);
export const savePurchase = (purchase: Purchase) => updateData(STORAGE_KEYS.PURCHASES, purchase);

export const deletePurchase = (id: string) => {
  const purchases = getPurchases();
  const purchase = purchases.find(p => p.id === id);
  if (purchase) {
    const products = getProducts();
    const pIdx = products.findIndex(p => p.id === purchase.productId || p.name.toLowerCase() === purchase.productName.toLowerCase());
    if (pIdx !== -1) {
      products[pIdx].stock = Math.max(0, (products[pIdx].stock || 0) - purchase.quantity);
      saveData(STORAGE_KEYS.PRODUCTS, products);
    }
  }
  deleteData(STORAGE_KEYS.PURCHASES, id);
};

export const updatePurchase = (updated: Purchase) => {
  const purchases = getPurchases();
  const old = purchases.find(p => p.id === updated.id);
  if (old) {
    const products = getProducts();
    
    // If product changed
    if (old.productName.toLowerCase() !== updated.productName.toLowerCase()) {
      // Revert old product stock
      const oldPIdx = products.findIndex(p => p.id === old.productId || p.name.toLowerCase() === old.productName.toLowerCase());
      if (oldPIdx !== -1) {
        products[oldPIdx].stock = Math.max(0, (products[oldPIdx].stock || 0) - old.quantity);
      }
      
      // Add to new product stock
      const newPIdx = products.findIndex(p => p.id === updated.productId || p.name.toLowerCase() === updated.productName.toLowerCase());
      if (newPIdx !== -1) {
        products[newPIdx].stock = (products[newPIdx].stock || 0) + updated.quantity;
      } else {
        // Create new product if doesn't exist
        products.push({
          id: updated.productId || crypto.randomUUID(),
          name: updated.productName,
          stock: updated.quantity,
          costPrice: updated.costPrice,
          unit: "Piece"
        });
      }
    } else {
      // Same product, adjust quantity difference
      const pIdx = products.findIndex(p => p.id === updated.productId || p.name.toLowerCase() === updated.productName.toLowerCase());
      if (pIdx !== -1) {
        const diff = updated.quantity - old.quantity;
        products[pIdx].stock = (products[pIdx].stock || 0) + diff;
        products[pIdx].costPrice = updated.costPrice;
      }
    }
    saveData(STORAGE_KEYS.PRODUCTS, products);
  }
  updateData(STORAGE_KEYS.PURCHASES, updated);
};

// Bill Scans
export const getBillScans = () => loadData<BillScan>(STORAGE_KEYS.BILL_SCANS);
export const saveBillScan = (scan: BillScan) => updateData(STORAGE_KEYS.BILL_SCANS, scan);

// Invoices
export const getInvoices = () => loadData<Invoice>(STORAGE_KEYS.INVOICES);
export const saveInvoice = (invoice: Invoice) => updateData(STORAGE_KEYS.INVOICES, invoice);
export const deleteInvoice = (id: string) => deleteData(STORAGE_KEYS.INVOICES, id);
// Ledger Entries
export const getLedgerEntries = () => loadData<LedgerEntry>(STORAGE_KEYS.LEDGER_ENTRIES);
export const saveLedgerEntry = (entry: LedgerEntry) => {
  updateData(STORAGE_KEYS.LEDGER_ENTRIES, entry);
  recalculateCustomerStats(entry.customerId);
};
export const deleteLedgerEntry = (id: string, customerId: string) => {
  deleteData(STORAGE_KEYS.LEDGER_ENTRIES, id);
  recalculateCustomerStats(customerId);
};

/**
 * Deducts stock from inventory for each item in an invoice.
 * Matches products by name (case-insensitive).
 * Returns the names of products whose stock was updated.
 */
export const deductInventoryForInvoice = (invoice: Invoice): string[] => {
  const products = getProducts();
  const updatedNames: string[] = [];

  invoice.items.forEach((item) => {
    const idx = products.findIndex(
      (p) => p.name.toLowerCase() === item.description.toLowerCase()
    );
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        stock: Math.max(0, products[idx].stock - item.quantity),
      };
      updatedNames.push(products[idx].name);
    }
  });

  if (updatedNames.length > 0) {
    saveData(STORAGE_KEYS.PRODUCTS, products);
  }

  return updatedNames;
};

/**
 * Recalculates customer totalSales, paymentsReceived, and balance based on all invoices and ledger entries.
 */
export const recalculateCustomerStats = (customerId: string) => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customerId);
  if (index === -1) return;

  const invoices = getInvoices().filter(inv => inv.customerId === customerId);
  const ledgerEntries = getLedgerEntries().filter(entry => entry.customerId === customerId);

  let totalSales = 0;
  let paymentsReceived = 0;

  // From Invoices
  invoices.forEach(inv => {
    totalSales += inv.total;
    if (inv.status === 'paid') {
      paymentsReceived += inv.total;
    }
  });

  // From Ledger Entries
  ledgerEntries.forEach(entry => {
    if (entry.type === 'debit') {
      totalSales += entry.amount; // Debit = Credit Given/Manual Sale
    } else {
      paymentsReceived += entry.amount; // Credit = Payment Received
    }
  });

  customers[index] = {
    ...customers[index],
    totalSales,
    paymentsReceived,
    balance: totalSales - paymentsReceived
  };

  saveData(STORAGE_KEYS.CUSTOMERS, customers);
};

/**
 * Updates customer totalStats based on a new invoice.
 */
export const updateCustomerStatsFromInvoice = (invoice: Invoice) => {
  if (invoice.customerId) {
    recalculateCustomerStats(invoice.customerId);
  } else if (invoice.customerName) {
    const customers = getCustomers();
    const customer = customers.find(c => c.name.toLowerCase() === invoice.customerName.toLowerCase());
    if (customer) {
      recalculateCustomerStats(customer.id);
    }
  }
};

// Expenses
export const getExpenses = () => loadData<Expense>(STORAGE_KEYS.EXPENSES);
export const saveExpense = (expense: Expense) => updateData(STORAGE_KEYS.EXPENSES, expense);
export const deleteExpense = (id: string) => deleteData(STORAGE_KEYS.EXPENSES, id);

// ── Backup / Restore ──────────────────────────────────────────────────────────
export const exportAllData = () => {
  if (typeof window === "undefined") return null;
  const data: Record<string, any> = {};
  Object.entries(STORAGE_KEYS).forEach(([, key]) => {
    data[key] = loadData(key);
  });
  return data;
};

export const importAllData = (data: Record<string, any>) => {
  if (typeof window === "undefined") return;
  Object.entries(STORAGE_KEYS).forEach(([, key]) => {
    if (data[key] !== undefined) {
      saveData(key, data[key]);
    }
  });
};
/**
 * Increments stock in inventory for each item in a purchase.
 * Matches products by name (case-insensitive).
 * If product doesn't exist, it creates it.
 */
export const incrementInventoryForPurchase = (purchase: Purchase) => {
  const products = getProducts();
  const idx = products.findIndex(
    (p) => p.name.toLowerCase() === purchase.productName.toLowerCase()
  );

  if (idx !== -1) {
    products[idx] = {
      ...products[idx],
      stock: (products[idx].stock || 0) + purchase.quantity,
      costPrice: purchase.costPrice // Update cost price to latest
    };
  } else {
    products.push({
      id: purchase.productId || crypto.randomUUID(),
      name: purchase.productName,
      stock: purchase.quantity,
      costPrice: purchase.costPrice,
      sellingPrice: 0,
      unit: "Piece" // Default unit
    });
  }

  saveData(STORAGE_KEYS.PRODUCTS, products);
};

// Business Info
const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  bankDetails: {
    name: "",
    accountName: "",
    accountNo: "",
    branch: "",
    ifsc: "",
    upiId: "",
    upiQrCode: ""
  }
};

export const getBusinessInfo = (): BusinessInfo => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEYS.BUSINESS_INFO);
    return data ? JSON.parse(data) : DEFAULT_BUSINESS_INFO;
  }
  return DEFAULT_BUSINESS_INFO;
};

export const saveBusinessInfo = (info: BusinessInfo) => {
  saveData(STORAGE_KEYS.BUSINESS_INFO, info);
};
