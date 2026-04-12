export interface Product {
  id: string;
  name: string;
  stock: number;
  // Unit management
  unit?: string;           // Selling unit e.g. "Piece", "Packet"
  buyingUnit?: string;     // Buying unit e.g. "Carton", "Box"
  conversionFactor?: number; // How many selling units per buying unit
  // Low stock
  minStock?: number;       // Reorder threshold
  // Expiry & Batch
  batchNumber?: string;
  expiryDate?: string;     // YYYY-MM-DD
  // Custom fields for multi-business (e.g. Size, Color, Brand)
  customFields?: Record<string, string>;
  // Purchase info
  costPrice?: number;
  sellingPrice?: number;
  hsnCode?: string;
  gstRate?: number;
  image?: string; // Base64 encoded image
  category?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
  totalSales: number;
  paymentsReceived: number;
  balance: number;
  status?: 'active' | 'inactive' | 'left' | 'unavailable';
  createdAt?: string;
}


export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  taxRate?: number;
  taxAmount?: number;
  hsnCode?: string;
  total: number;
}

export interface BillScan {
  id: string;
  date: string;
  imageUrl: string;
  extractedText: string;
  parsedData: any;
}

export interface Expense {
  id: string;
  date: string; // This will be the "record date" for individual and "billing date" for monthly
  category: "Rent" | "Electricity" | "Transport" | "Salaries" | "Maintenance" | "Marketing" | "Other";
  description: string;
  amount: number;
  type?: "individual" | "monthly";
  startDate?: string;
  endDate?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate?: number;
  taxAmount?: number;
  hsnCode?: string;
  total: number;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit'; // debit = credit given (increases balance), credit = payment received (decreases balance)
  description: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  isInterState: boolean;
  placeOfSupply?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  // Professional Tax Invoice Fields
  eWayBillNo?: string;
  deliveryNote?: string;
  orderNo?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  bankDetails?: {
    name: string;
    accountName: string;
    accountNo: string;
    branch: string;
    ifsc: string;
    upiId?: string;
    upiQrCode?: string;
  };
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  bankDetails: {
    name: string;
    accountName: string;
    accountNo: string;
    branch: string;
    ifsc: string;
    upiId?: string;
    upiQrCode?: string;
  };
}
