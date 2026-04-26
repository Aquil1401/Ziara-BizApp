-- Supabase Schema for Business Management App

-- 1. Products Table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stock float8 DEFAULT 0,
  unit text,
  buying_unit text,
  conversion_factor float8 DEFAULT 1,
  min_stock float8 DEFAULT 0,
  batch_number text,
  expiry_date text,
  custom_fields jsonb,
  cost_price float8,
  selling_price float8,
  hsn_code text,
  gst_rate float8 DEFAULT 0,
  image text,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Customers Table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  company text,
  total_sales float8 DEFAULT 0,
  payments_received float8 DEFAULT 0,
  balance float8 DEFAULT 0,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Purchases Table
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  supplier text,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text,
  quantity float8 NOT NULL,
  cost_price float8 NOT NULL,
  tax_rate float8,
  tax_amount float8,
  hsn_code text,
  total float8 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 5. Bill Scans Table
CREATE TABLE bill_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  image_url text,
  extracted_text text,
  parsed_data jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 6. Expenses Table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  category text NOT NULL,
  description text,
  amount float8 NOT NULL,
  type text,
  start_date text,
  end_date text,
  updated_at timestamptz DEFAULT now()
);

-- 7. Invoices Table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  date text NOT NULL,
  due_date text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_address text,
  items jsonb NOT NULL,
  subtotal float8 NOT NULL,
  tax_rate float8 NOT NULL,
  tax_amount float8 NOT NULL,
  total float8 NOT NULL,
  is_inter_state boolean DEFAULT false,
  place_of_supply text,
  notes text,
  status text,
  created_at timestamptz DEFAULT now(),
  e_way_bill_no text,
  delivery_note text,
  order_no text,
  dispatch_doc_no text,
  dispatched_through text,
  destination text,
  terms_of_delivery text,
  bank_details jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 8. Ledger Entries Table
CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  date text NOT NULL,
  amount float8 NOT NULL,
  type text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- 9. Business Info Table
CREATE TABLE business_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  address text,
  phone text,
  email text,
  gstin text,
  bank_details jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Supabase Storage Setup
-- Please create a storage bucket named "product_images" and make it public in the Supabase Dashboard
-- Please create a storage bucket named "bill_scans" and make it public in the Supabase Dashboard

-- Set up Row Level Security (RLS) — Only authenticated users can access data
-- Run this in Supabase SQL Editor to update from the old open policies

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON products;
CREATE POLICY "Authenticated users only" ON products FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON customers;
CREATE POLICY "Authenticated users only" ON customers FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON purchases;
CREATE POLICY "Authenticated users only" ON purchases FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE bill_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON bill_scans;
CREATE POLICY "Authenticated users only" ON bill_scans FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON expenses;
CREATE POLICY "Authenticated users only" ON expenses FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON invoices;
CREATE POLICY "Authenticated users only" ON invoices FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON ledger_entries;
CREATE POLICY "Authenticated users only" ON ledger_entries FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON business_info;
CREATE POLICY "Authenticated users only" ON business_info FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
-- To fix the "new row violates row-level security policy" error during image uploads,
-- you must run these policies in the Supabase SQL editor to allow inserts into the storage buckets.

-- For product_images bucket
CREATE POLICY "Allow authenticated uploads to product_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product_images');

CREATE POLICY "Allow authenticated updates to product_images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product_images');

CREATE POLICY "Allow public read from product_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

CREATE POLICY "Allow authenticated deletes from product_images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product_images');

-- For bill_scans bucket
CREATE POLICY "Allow authenticated uploads to bill_scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill_scans');

CREATE POLICY "Allow authenticated updates to bill_scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bill_scans');

CREATE POLICY "Allow public read from bill_scans"
ON storage.objects FOR SELECT
USING (bucket_id = 'bill_scans');

CREATE POLICY "Allow authenticated deletes from bill_scans"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill_scans');

