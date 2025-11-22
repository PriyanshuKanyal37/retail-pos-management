-- FA POS Migration to Supabase RLS
-- This script creates the new schema with Row Level Security policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Create core tables with enhanced structure

-- Tenants table
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NULL,
  status text NULL DEFAULT 'active',
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_domain_key UNIQUE (domain)
) TABLESPACE pg_default;

-- Stores table
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  address text NULL,
  phone text NULL,
  email text NULL,
  status text NULL DEFAULT 'active',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Users table with enhanced constraints
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  is_global boolean NULL DEFAULT false,
  store_id uuid NULL,
  status text NULL DEFAULT 'active',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_tenant_id_key UNIQUE (email, tenant_id),
  CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT users_role_check CHECK (
    role IN ('super_admin', 'manager', 'cashier')
  )
) TABLESPACE pg_default;

-- Customers table with required store_id
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  store_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Settings table with enhanced fields
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  store_id uuid NULL,
  store_name text NULL,
  store_address text NULL,
  store_phone text NULL,
  store_email text NULL,
  tax_rate numeric(5, 2) NULL DEFAULT 0,
  currency_symbol text NULL DEFAULT '₹',
  currency_code text NULL DEFAULT 'INR',
  upi_id text NULL,
  store_logo_url text NULL,
  low_stock_threshold integer NULL DEFAULT 5,
  theme text NULL DEFAULT 'light',
  invoice_prefix text NULL DEFAULT 'INV',
  invoice_padding integer NULL DEFAULT 4,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL,
  CONSTRAINT settings_pkey PRIMARY KEY (id),
  CONSTRAINT settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT settings_theme_check CHECK (
    theme IN ('light', 'dark')
  )
) TABLESPACE pg_default;

-- Products table with enhanced constraints and indexes
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  store_id uuid NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  barcode text NULL,
  category text NULL,
  price numeric(10, 2) NOT NULL,
  stock integer NULL DEFAULT 0,
  low_stock_threshold integer NULL DEFAULT 5,
  img_url text NULL,
  status text NULL DEFAULT 'active',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_barcode_store_id_key UNIQUE (barcode, store_id),
  CONSTRAINT products_sku_store_id_key UNIQUE (sku, store_id),
  CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT products_status_check CHECK (
    status IN ('active', 'inactive')
  ),
  CONSTRAINT products_quantity_check CHECK (stock >= 0)
) TABLESPACE pg_default;

-- Sales table with required store_id and enhanced structure
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  store_id uuid NOT NULL,
  invoice_no text NOT NULL,
  invoice_pdf_url text NULL,
  customer_id uuid NULL,
  cashier_id uuid NULL,
  payment_method text NOT NULL,
  payment_status text NULL DEFAULT 'pending',
  subtotal numeric(10, 2) NOT NULL,
  discount numeric(10, 2) NULL DEFAULT 0,
  tax numeric(10, 2) NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL,
  paid_amount numeric(10, 2) NULL,
  change_amount numeric(10, 2) NULL,
  status text NULL DEFAULT 'completed',
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_invoice_no_tenant_id_key UNIQUE (invoice_no, tenant_id),
  CONSTRAINT sales_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE set null,
  CONSTRAINT sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
  CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES users (id) ON DELETE set null,
  CONSTRAINT sales_payment_method_check CHECK (
    payment_method IN ('cash', 'card', 'upi')
  ),
  CONSTRAINT sales_payment_status_check CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'refunded')
  ),
  CONSTRAINT sales_status_check CHECK (
    status IN ('completed', 'held')
  )
) TABLESPACE pg_default;

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  product_id uuid NULL,
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(10, 2) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE set null,
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
  CONSTRAINT sale_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT sale_items_quantity_check CHECK (quantity > 0)
) TABLESPACE pg_default;

-- New payments table for tracking payment transactions
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  provider text NULL,
  transaction_id text NULL,
  status text NULL DEFAULT 'pending',
  provider_response jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
  CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT payments_status_check CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  )
) TABLESPACE pg_default;

-- Create performance indexes
CREATE INDEX idx_products_sku_store ON public.products USING btree (sku, store_id) TABLESPACE pg_default;
CREATE INDEX idx_products_barcode_store ON public.products USING btree (barcode, store_id) TABLESPACE pg_default;
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops) TABLESPACE pg_default;
CREATE INDEX idx_sales_tenant_store ON public.sales USING btree (tenant_id, store_id) TABLESPACE pg_default;
CREATE INDEX idx_customers_tenant_store ON public.customers USING btree (tenant_id, store_id) TABLESPACE pg_default;

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for tenant isolation

-- Tenants table policies
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Stores table policies
CREATE POLICY "stores_select" ON public.stores FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "stores_insert" ON public.stores FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "stores_update" ON public.stores FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "stores_delete" ON public.stores FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Users table policies
CREATE POLICY "users_select" ON public.users FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Customers table policies
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Settings table policies
CREATE POLICY "settings_select" ON public.settings FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "settings_insert" ON public.settings FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "settings_delete" ON public.settings FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Products table policies
CREATE POLICY "products_select" ON public.products FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Sales table policies
CREATE POLICY "sales_select" ON public.sales FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sales_insert" ON public.sales FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sales_update" ON public.sales FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sales_delete" ON public.sales FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Sale items table policies
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Payments table policies
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (tenant_id = ((auth.jwt() ->> 'tenant_id')::uuid));

-- Create a function to set user context for RLS
CREATE OR REPLACE FUNCTION public.set_jwt_context()
RETURNS void AS $$
BEGIN
  -- This function will be called after JWT verification
  -- The JWT claims are available via auth.jwt()
  -- RLS policies can access the claims via auth.jwt() ->> 'claim_name'
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to the service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;