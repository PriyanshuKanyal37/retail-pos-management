create table public.users (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null,
  is_global boolean null default false,
  store_id uuid null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_email_tenant_id_key unique (email, tenant_id),
  constraint users_store_id_fkey foreign KEY (store_id) references stores (id) on delete CASCADE,
  constraint users_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint users_role_check check (
    (
      role = any (
        array[
          'super_admin'::text,
          'manager'::text,
          'cashier'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.tenants (
  id uuid not null default gen_random_uuid (),
  name text not null,
  domain text null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  constraint tenants_pkey primary key (id),
  constraint tenants_domain_key unique (domain)
) TABLESPACE pg_default;


create table public.stores (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  name text not null,
  address text null,
  phone text null,
  email text null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint stores_pkey primary key (id),
  constraint stores_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.settings (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  store_id uuid null,
  store_name text null,
  store_address text null,
  store_phone text null,
  store_email text null,
  tax_rate numeric(5, 2) null default 0,
  currency_symbol text null default '₹'::text,
  currency_code text null default 'INR'::text,
  upi_id text null,
  store_logo_url text null,
  low_stock_threshold integer null default 5,
  theme text null default 'light'::text,
  invoice_prefix text null default 'INV'::text,
  invoice_padding integer null default 4,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint settings_pkey primary key (id),
  constraint settings_store_id_fkey foreign KEY (store_id) references stores (id) on delete CASCADE,
  constraint settings_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint settings_theme_check check (
    (theme = any (array['light'::text, 'dark'::text]))
  )
) TABLESPACE pg_default;

create table public.sales (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  store_id uuid not null,
  invoice_no text not null,
  invoice_pdf_url text null,
  customer_id uuid null,
  cashier_id uuid null,
  payment_method text not null,
  payment_status text null default 'pending'::text,
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) null default 0,
  tax numeric(10, 2) null default 0,
  total numeric(10, 2) not null,
  paid_amount numeric(10, 2) null,
  change_amount numeric(10, 2) null,
  status text null default 'completed'::text,
  created_at timestamp with time zone null default now(),
  constraint sales_pkey primary key (id),
  constraint sales_invoice_no_tenant_id_key unique (invoice_no, tenant_id),
  constraint sales_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint sales_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete set null,
  constraint sales_store_id_fkey foreign KEY (store_id) references stores (id) on delete CASCADE,
  constraint sales_cashier_id_fkey foreign KEY (cashier_id) references users (id) on delete set null,
  constraint sales_payment_method_check check (
    (
      payment_method = any (array['cash'::text, 'card'::text, 'upi'::text])
    )
  ),
  constraint sales_status_check check (
    (
      status = any (array['completed'::text, 'held'::text])
    )
  )
) TABLESPACE pg_default;


create table public.sale_items (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  sale_id uuid not null,
  product_id uuid null,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) null,
  created_at timestamp with time zone null default now(),
  constraint sale_items_pkey primary key (id),
  constraint sale_items_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint sale_items_sale_id_fkey foreign KEY (sale_id) references sales (id) on delete CASCADE,
  constraint sale_items_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint sale_items_quantity_check check ((quantity > 0))
) TABLESPACE pg_default;


create table public.products (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  store_id uuid not null,
  name text not null,
  sku text not null,
  barcode text null,
  category text null,
  price numeric(10, 2) not null,
  stock integer null default 0,
  low_stock_threshold integer null default 5,
  img_url text null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint products_pkey primary key (id),
  constraint products_barcode_store_id_key unique (barcode, store_id),
  constraint products_sku_store_id_key unique (sku, store_id),
  constraint products_store_id_fkey foreign KEY (store_id) references stores (id) on delete CASCADE,
  constraint products_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint products_status_check check (
    (
      status = any (array['active'::text, 'inactive'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_products_sku_store on public.products using btree (sku, store_id) TABLESPACE pg_default;

create index IF not exists idx_products_barcode_store on public.products using btree (barcode, store_id) TABLESPACE pg_default;

create index IF not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops) TABLESPACE pg_default;


create table public.payments (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  sale_id uuid not null,
  amount numeric(10, 2) not null,
  provider text null,
  transaction_id text null,
  status text null default 'pending'::text,
  provider_response jsonb null,
  created_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_sale_id_fkey foreign KEY (sale_id) references sales (id) on delete CASCADE,
  constraint payments_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.customers (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  store_id uuid not null,
  name text not null,
  phone text not null,
  created_at timestamp with time zone null default now(),
  constraint customers_pkey primary key (id),
  constraint customers_store_id_fkey foreign KEY (store_id) references stores (id) on delete CASCADE,
  constraint customers_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE
) TABLESPACE pg_default;


RLS 

[
  {
    "schemaname": "public",
    "tablename": "customers",
    "policyname": "customers_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "customers",
    "policyname": "customers_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "customers",
    "policyname": "customers_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "customers",
    "policyname": "customers_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "payments_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "payments_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "payments_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "payments_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "products_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "products_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "products_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "products_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sale_items",
    "policyname": "sale_items_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sale_items",
    "policyname": "sale_items_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "sale_items",
    "policyname": "sale_items_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sale_items",
    "policyname": "sale_items_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sales",
    "policyname": "sales_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sales",
    "policyname": "sales_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "sales",
    "policyname": "sales_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "sales",
    "policyname": "sales_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "settings",
    "policyname": "settings_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "settings",
    "policyname": "settings_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "settings",
    "policyname": "settings_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "settings",
    "policyname": "settings_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "stores_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "stores_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "stores_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "stores_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenants",
    "policyname": "tenants_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tenants",
    "policyname": "tenants_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenants",
    "policyname": "tenants_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "users_delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "users_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expression": null,
    "with_check": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "users_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "users_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expression": "(tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid)",
    "with_check": null
  }
]