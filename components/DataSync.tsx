"use client";

import { useEffect, useRef } from 'react';
import { initialSyncFromSupabase } from '@/utils/syncService';
import { saveData, loadData, getBusinessInfo, STORAGE_KEYS } from '@/utils/localStorageService';
import { useAuth } from '@/components/AuthProvider';

export default function DataSync() {
  const synced = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return; // Only sync when authenticated
    if (synced.current) return;
    synced.current = true;

    const syncAll = async () => {
      // Products
      await initialSyncFromSupabase('products', () => loadData(STORAGE_KEYS.PRODUCTS), (data) => saveData(STORAGE_KEYS.PRODUCTS, data));
      // Customers
      await initialSyncFromSupabase('customers', () => loadData(STORAGE_KEYS.CUSTOMERS), (data) => saveData(STORAGE_KEYS.CUSTOMERS, data));
      // Purchases
      await initialSyncFromSupabase('purchases', () => loadData(STORAGE_KEYS.PURCHASES), (data) => saveData(STORAGE_KEYS.PURCHASES, data));
      // Bill Scans
      await initialSyncFromSupabase('bill_scans', () => loadData(STORAGE_KEYS.BILL_SCANS), (data) => saveData(STORAGE_KEYS.BILL_SCANS, data));
      // Expenses
      await initialSyncFromSupabase('expenses', () => loadData(STORAGE_KEYS.EXPENSES), (data) => saveData(STORAGE_KEYS.EXPENSES, data));
      // Invoices
      await initialSyncFromSupabase('invoices', () => loadData(STORAGE_KEYS.INVOICES), (data) => saveData(STORAGE_KEYS.INVOICES, data));
      // Ledger Entries
      await initialSyncFromSupabase('ledger_entries', () => loadData(STORAGE_KEYS.LEDGER_ENTRIES), (data) => saveData(STORAGE_KEYS.LEDGER_ENTRIES, data));
      // Business Info
      await initialSyncFromSupabase('business_info', () => getBusinessInfo(), (data) => saveData(STORAGE_KEYS.BUSINESS_INFO, data));
    };

    syncAll();
  }, [user]);

  return null;
}

