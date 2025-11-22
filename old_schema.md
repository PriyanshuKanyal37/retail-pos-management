# 📊 Database Schema Documentation

## Table of Contents
- [Core Tables](#core-tables)
  - [Users](#users)
  - [Tenants](#tenants)
  - [Stores](#stores)
- [Configuration](#configuration)
  - [Settings](#settings)
- [Sales & Transactions](#sales--transactions)
  - [Sales](#sales)
  - [Sale Items](#sale-items)
- [Inventory & Customers](#inventory--customers)
  - [Products](#products)
  - [Customers](#customers)

---

## Core Tables

### 👥 Users

```sql
create table public.users (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  email character varying(150) not null,
  password_hash text not null,
  role character varying(50) not null,
  status character varying(20) not null default 'active'::character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  tenant_id uuid not null,
  store_id uuid null,
  assigned_manager_id uuid null,
  constraint users_pkey primary key (id),
  constraint users_email_tenant_unique unique (email, tenant_id),
  constraint users_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint users_tenant_id_fkey foreign KEY (tenant_id) references tenants (id),
  constraint users_assigned_manager_id_fkey foreign KEY (assigned_manager_id) references users (id),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'super_admin'::character varying,
            'manager'::character varying,
            'cashier'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint users_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;
create index IF not exists idx_users_tenant_id on public.users using btree (tenant_id) TABLESPACE pg_default;
create index IF not exists idx_users_email_tenant on public.users using btree (email, tenant_id) TABLESPACE pg_default;
```

**Triggers:**
```sql
create trigger trg_users_updated BEFORE
update on users for EACH row
execute FUNCTION update_timestamp ();
```

---

### 🏢 Tenants

```sql
create table public.tenants (
  id uuid not null default gen_random_uuid (),
  name character varying(150) not null,
  domain character varying(150) null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint tenants_pkey primary key (id),
  constraint tenants_domain_key unique (domain)
) TABLESPACE pg_default;
```

---

### 🏪 Stores

```sql
create table public.stores (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  address text null,
  phone character varying(50) null,
  email character varying(255) null,
  tenant_id uuid not null,
  manager_id uuid null,
  status character varying(50) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  country character varying(100) null,
  constraint stores_pkey primary key (id),
  constraint stores_manager_id_fkey foreign KEY (manager_id) references users (id),
  constraint stores_tenant_id_fkey foreign KEY (tenant_id) references tenants (id)
) TABLESPACE pg_default;
```

---

## Configuration

### ⚙️ Settings

```sql
create table public.settings (
  id uuid not null default gen_random_uuid (),
  store_name character varying(150) not null,
  store_address text null,
  store_phone character varying(20) null,
  store_email character varying(100) null,
  tax_rate numeric(5, 2) null default 0,
  currency_symbol character varying(5) null default '₹'::character varying,
  currency_code character varying(10) null default 'INR'::character varying,
  upi_id character varying(100) null,
  store_logo_url text null,
  low_stock_threshold integer null default 5,
  theme character varying(20) null default 'light'::character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  tenant_id uuid not null,
  store_id uuid null,
  constraint settings_pkey primary key (id),
  constraint settings_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint settings_tenant_id_fkey foreign KEY (tenant_id) references tenants (id),
  constraint settings_low_stock_threshold_check check ((low_stock_threshold >= 0)),
  constraint settings_tax_rate_check check ((tax_rate >= (0)::numeric)),
  constraint settings_theme_check check (
    (
      (theme)::text = any (
        (
          array[
            'light'::character varying,
            'dark'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create unique INDEX IF not exists idx_settings_singleton on public.settings using btree ((true)) TABLESPACE pg_default;
create index IF not exists idx_settings_tenant_id on public.settings using btree (tenant_id) TABLESPACE pg_default;
```

**Triggers:**
```sql
create trigger trg_settings_updated BEFORE
update on settings for EACH row
execute FUNCTION update_timestamp ();
```

---

## Sales & Transactions

### 💰 Sales

```sql
create table public.sales (
  id uuid not null default gen_random_uuid (),
  invoice_no character varying(30) not null,
  customer_id uuid null,
  cashier_id uuid null,
  payment_method character varying(20) not null,
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) null default 0,
  tax numeric(10, 2) null default 0,
  total numeric(10, 2) not null,
  paid_amount numeric(10, 2) not null,
  change_amount numeric(10, 2) null,
  upi_status character varying(20) null default 'n/a'::character varying,
  invoice_pdf_url text null,
  status character varying(20) null default 'completed'::character varying,
  created_at timestamp with time zone not null default now(),
  discount_type character varying(20) null default 'flat'::character varying,
  discount_value_input numeric(10, 2) null default 0,
  tenant_id uuid not null,
  updated_at timestamp with time zone null default now(),
  store_id uuid null,
  constraint sales_pkey primary key (id),
  constraint fk_sales_customer foreign KEY (customer_id) references customers (id) on delete set null,
  constraint sales_tenant_id_fkey foreign KEY (tenant_id) references tenants (id),
  constraint fk_sales_cashier foreign KEY (cashier_id) references users (id) on delete set null,
  constraint sales_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint sales_discount_value_input_check check ((discount_value_input >= (0)::numeric)),
  constraint sales_paid_amount_check check ((paid_amount >= (0)::numeric)),
  constraint sales_status_check check (
    (
      (status)::text = any (
        (
          array[
            'completed'::character varying,
            'held'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint sales_subtotal_check check ((subtotal >= (0)::numeric)),
  constraint sales_tax_check check ((tax >= (0)::numeric)),
  constraint sales_total_check check ((total >= (0)::numeric)),
  constraint chk_payment_method check (
    (
      (payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'card'::character varying,
            'upi'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint sales_upi_status_check check (
    (
      (upi_status)::text = any (
        (
          array[
            'n/a'::character varying,
            'pending'::character varying,
            'confirmed'::character varying,
            'failed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_sale_status check (
    (
      (status)::text = any (
        (
          array[
            'completed'::character varying,
            'held'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_upi_status check (
    (
      (upi_status)::text = any (
        (
          array[
            'n/a'::character varying,
            'pending'::character varying,
            'confirmed'::character varying,
            'failed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint sales_discount_check check ((discount >= (0)::numeric)),
  constraint sales_discount_type_check check (
    (
      (discount_type)::text = any (
        (
          array[
            'flat'::character varying,
            'percentage'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create index IF not exists idx_sales_invoice_no on public.sales using btree (invoice_no) TABLESPACE pg_default;
create index IF not exists idx_sales_customer_id on public.sales using btree (customer_id) TABLESPACE pg_default;
create index IF not exists idx_sales_cashier_id on public.sales using btree (cashier_id) TABLESPACE pg_default;
create index IF not exists idx_sales_created_at on public.sales using btree (created_at) TABLESPACE pg_default;
create index IF not exists idx_sales_tenant_id on public.sales using btree (tenant_id) TABLESPACE pg_default;
create index IF not exists idx_sales_invoice_tenant on public.sales using btree (invoice_no, tenant_id) TABLESPACE pg_default;
```

**Triggers:**
```sql
create trigger trg_sales_updated BEFORE
update on sales for EACH row
execute FUNCTION update_timestamp ();
```

---

### 🛍️ Sale Items

```sql
create table public.sale_items (
  id uuid not null default gen_random_uuid (),
  sale_id uuid not null,
  product_id uuid null,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) null,
  created_at timestamp with time zone not null default now(),
  tenant_id uuid not null,
  store_id uuid null,
  constraint sale_items_pkey primary key (id),
  constraint sale_items_tenant_id_fkey foreign KEY (tenant_id) references tenants (id),
  constraint fk_sale_items_sale foreign KEY (sale_id) references sales (id) on delete CASCADE,
  constraint fk_sale_items_product foreign KEY (product_id) references products (id) on delete set null,
  constraint sale_items_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint sale_items_quantity_check check ((quantity > 0)),
  constraint sale_items_unit_price_check check ((unit_price >= (0)::numeric))
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create index IF not exists idx_sale_items_sale_id on public.sale_items using btree (sale_id) TABLESPACE pg_default;
create index IF not exists idx_sale_items_product_id on public.sale_items using btree (product_id) TABLESPACE pg_default;
create index IF not exists idx_sale_items_tenant_id on public.sale_items using btree (tenant_id) TABLESPACE pg_default;
```

---

## Inventory & Customers

### 📦 Products

```sql
create table public.products (
  id uuid not null default gen_random_uuid (),
  name character varying(150) not null,
  sku character varying(50) not null,
  barcode character varying(100) null,
  category character varying(100) null,
  price numeric(10, 2) not null,
  stock integer not null default 0,
  img_url text null,
  status character varying(20) not null default 'active'::character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  tenant_id uuid not null,
  store_id uuid null,
  constraint products_pkey primary key (id),
  constraint products_sku_tenant_unique unique (sku, tenant_id),
  constraint products_barcode_tenant_unique unique (barcode, tenant_id),
  constraint products_tenant_id_fkey foreign KEY (tenant_id) references tenants (id),
  constraint products_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint products_stock_check check ((stock >= 0)),
  constraint products_price_check check ((price >= (0)::numeric)),
  constraint products_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create index IF not exists idx_products_name on public.products using btree (name) TABLESPACE pg_default;
create index IF not exists idx_products_barcode on public.products using btree (barcode) TABLESPACE pg_default;
create index IF not exists idx_products_category on public.products using btree (category) TABLESPACE pg_default;
create index IF not exists idx_products_status_category on public.products using btree (status, category) TABLESPACE pg_default;
create unique INDEX IF not exists idx_unique_sku_lower on public.products using btree (lower((sku)::text)) TABLESPACE pg_default;
create unique INDEX IF not exists idx_unique_barcode on public.products using btree (barcode) TABLESPACE pg_default;
create index IF not exists idx_products_status on public.products using btree (status) TABLESPACE pg_default;
create index IF not exists idx_products_tenant_id on public.products using btree (tenant_id) TABLESPACE pg_default;
create index IF not exists idx_products_sku_tenant on public.products using btree (sku, tenant_id) TABLESPACE pg_default;
create index IF not exists idx_products_barcode_tenant on public.products using btree (barcode, tenant_id) TABLESPACE pg_default;
```

**Triggers:**
```sql
create trigger trg_products_updated BEFORE
update on products for EACH row
execute FUNCTION update_timestamp ();
```

---

### 👨‍👩‍👧‍👦 Customers

```sql
create table public.customers (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  phone character varying(20) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  tenant_id uuid not null,
  store_id uuid null,
  constraint customers_pkey primary key (id),
  constraint customers_store_id_fkey foreign KEY (store_id) references stores (id),
  constraint customers_tenant_id_fkey foreign KEY (tenant_id) references tenants (id)
) TABLESPACE pg_default;
```

**Indexes:**
```sql
create index IF not exists idx_customers_phone on public.customers using btree (phone) TABLESPACE pg_default;
create index IF not exists idx_customers_search on public.customers using btree (phone, lower((name)::text)) TABLESPACE pg_default;
create index IF not exists idx_customers_name on public.customers using btree (lower((name)::text)) TABLESPACE pg_default;
create index IF not exists idx_customers_tenant_id on public.customers using btree (tenant_id) TABLESPACE pg_default;
```

**Triggers:**
```sql
create trigger trg_customers_updated BEFORE
update on customers for EACH row
execute FUNCTION update_timestamp ();
```

---

*Generated Database Schema Documentation - PostgreSQL*