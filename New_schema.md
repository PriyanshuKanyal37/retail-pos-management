# Retail POS Management - Database Schema

## Overview
This document outlines the complete database schema for the Retail POS Management system, including all tables, constraints, indexes, and Row Level Security (RLS) policies.

---

## Tables

### 1. Users Table
Stores user account information with role-based access control.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `name`: Text
- `email`: Text
- `password_hash`: Text
- `role`: Text (Enum: 'super_admin', 'manager', 'cashier')
- `is_global`: Boolean (default: false)
- `store_id`: UUID (Foreign Key → stores.id, nullable)
- `status`: Text (default: 'active')
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `users_pkey` (id)
- Unique: `users_email_tenant_id_key` (email, tenant_id)
- Foreign Key: `users_store_id_fkey` → stores(id) ON DELETE CASCADE
- Foreign Key: `users_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- Check: `users_role_check` (role = any of allowed roles)

---

### 2. Tenants Table
Multi-tenant organization data.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `name`: Text
- `domain`: Text (Unique, nullable)
- `status`: Text (default: 'active')
- `created_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `tenants_pkey` (id)
- Unique: `tenants_domain_key` (domain)

---

### 3. Stores Table
Store location information linked to tenants.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `name`: Text
- `address`: Text (nullable)
- `phone`: Text (nullable)
- `email`: Text (nullable)
- `status`: Text (default: 'active')
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `stores_pkey` (id)
- Foreign Key: `stores_tenant_id_fkey` → tenants(id) ON DELETE CASCADE

---

### 4. Settings Table
Store-level configuration and preferences.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `store_id`: UUID (Foreign Key → stores.id, nullable)
- `store_name`, `store_address`, `store_phone`, `store_email`: Text
- `tax_rate`: Numeric(5,2) (default: 0)
- `currency_symbol`: Text (default: '₹')
- `currency_code`: Text (default: 'INR')
- `upi_id`: Text (nullable)
- `store_logo_url`: Text (nullable)
- `low_stock_threshold`: Integer (default: 5)
- `theme`: Text (default: 'light', enum: 'light', 'dark')
- `invoice_prefix`: Text (default: 'INV')
- `invoice_padding`: Integer (default: 4)
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `settings_pkey` (id)
- Foreign Key: `settings_store_id_fkey` → stores(id) ON DELETE CASCADE
- Foreign Key: `settings_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- Check: `settings_theme_check` (theme in 'light', 'dark')

---

### 5. Products Table
Product catalog with inventory tracking.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `store_id`: UUID (Foreign Key → stores.id)
- `name`: Text
- `sku`: Text
- `barcode`: Text (nullable)
- `category`: Text (nullable)
- `price`: Numeric(10,2)
- `stock`: Integer (default: 0)
- `low_stock_threshold`: Integer (default: 5)
- `img_url`: Text (nullable)
- `status`: Text (default: 'active', enum: 'active', 'inactive')
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `products_pkey` (id)
- Unique: `products_sku_store_id_key` (sku, store_id)
- Unique: `products_barcode_store_id_key` (barcode, store_id)
- Foreign Key: `products_store_id_fkey` → stores(id) ON DELETE CASCADE
- Foreign Key: `products_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- Check: `products_status_check` (status in 'active', 'inactive')

**Indexes:**
- `idx_products_sku_store` (sku, store_id)
- `idx_products_barcode_store` (barcode, store_id)
- `idx_products_name_trgm` (name with GIN trigram)

---

### 6. Sales Table
Sales transactions with payment information.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `store_id`: UUID (Foreign Key → stores.id)
- `invoice_no`: Text
- `invoice_pdf_url`: Text (nullable)
- `customer_id`: UUID (Foreign Key → customers.id, nullable)
- `cashier_id`: UUID (Foreign Key → users.id, nullable)
- `payment_method`: Text (enum: 'cash', 'card', 'upi')
- `payment_status`: Text (default: 'pending')
- `subtotal`, `discount`, `tax`: Numeric(10,2)
- `total`: Numeric(10,2)
- `paid_amount`, `change_amount`: Numeric(10,2) (nullable)
- `status`: Text (default: 'completed', enum: 'completed', 'held')
- `created_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `sales_pkey` (id)
- Unique: `sales_invoice_no_tenant_id_key` (invoice_no, tenant_id)
- Foreign Keys and Checks as defined

---

### 7. Sale Items Table
Individual line items for each sale.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `sale_id`: UUID (Foreign Key → sales.id)
- `product_id`: UUID (Foreign Key → products.id, nullable)
- `quantity`: Integer
- `unit_price`, `total`: Numeric(10,2)
- `created_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `sale_items_pkey` (id)
- Foreign Keys for cascade deletion
- Check: `sale_items_quantity_check` (quantity > 0)

---

### 8. Payments Table
Payment transaction records.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `sale_id`: UUID (Foreign Key → sales.id)
- `amount`: Numeric(10,2)
- `provider`: Text (nullable)
- `transaction_id`: Text (nullable)
- `status`: Text (default: 'pending')
- `provider_response`: JSONB (nullable)
- `created_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `payments_pkey` (id)
- Foreign Keys with CASCADE deletion

---

### 9. Customers Table
Customer information.

**Column Details:**
- `id`: UUID (Primary Key, auto-generated)
- `tenant_id`: UUID (Foreign Key → tenants.id)
- `store_id`: UUID (Foreign Key → stores.id)
- `name`: Text
- `phone`: Text
- `created_at`: Timestamp with timezone

**Constraints:**
- Primary Key: `customers_pkey` (id)
- Foreign Keys with CASCADE deletion

---

## Row Level Security (RLS) Policies

All tables (except tenants) have RLS enabled with tenant isolation using JWT tokens.

**Policy Pattern for Most Tables:**
- `SELECT`: Users can only see data for their tenant
- `INSERT`: Users can insert data for their tenant
- `UPDATE`: Users can only update their tenant's data
- `DELETE`: Users can only delete their tenant's data

**Tenants-Specific Policies:**
- `SELECT`: Only accessible for the user's own tenant
- `INSERT`: All users can create tenants
- `UPDATE`: Only for the user's own tenant

---

## Security Features

1. **Multi-tenancy**: Strict data isolation using `tenant_id`
2. **RLS Enforcement**: All data access validated against JWT claims
3. **Foreign Key Constraints**: CASCADE deletes for data integrity
4. **Unique Constraints**: Prevent duplicates and enforce business rules
5. **Check Constraints**: Validate data at database level
