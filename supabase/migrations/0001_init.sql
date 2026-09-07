-- Initial schema for the Sumaregi-EC-based gym affiliate system.
-- Replaces the pm-chat-bot / coupon-code model with:
--   - order data sourced from Sumaregi EC (Repeat) via the orders/search API
--   - store attribution via a 1:1 advertising_group_code (Sumaregi "ad code")
--   - no member PII stored (only an opaque member_key)

create table corporations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invoice_registration_number text,
  bank_name text,
  bank_branch_name text,
  bank_account_type text,
  bank_account_number text,
  bank_account_holder text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references corporations(id) on delete restrict,
  name text not null,
  -- Sumaregi-issued ad code (order.advertising_group_code), one per store.
  advertising_group_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_corporation_id_idx on stores(corporation_id);

-- Maps Sumaregi product_code to the point value used for the reward tier calculation.
-- Kept as data (not hardcoded) since new product codes/variants can be added on the EC side.
create table products (
  product_code text primary key,
  name text not null,
  points_per_unit numeric not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order line ledger: one row per order_detail line pulled from Sumaregi orders/search.
-- Recorded at order time, then shipment_status is updated as the order's status changes.
-- No customer PII is stored here -- member_key is an opaque identifier only
-- (order.customer_id or a derived value; see HANDOVER.md 5.3 for the pending decision).
create table order_lines (
  id uuid primary key default gen_random_uuid(),
  smaregi_order_id text not null,
  ec_order_id text,
  order_detail_no integer,
  store_id uuid references stores(id) on delete restrict,
  -- Raw ad code as returned by the API, kept even when it doesn't match a known store
  -- (e.g. direct traffic, unmapped code) so unmatched orders can be triaged.
  advertising_group_code text,
  member_key text,
  product_code text references products(product_code),
  product_name text not null,
  quantity numeric not null,
  points numeric not null,
  order_date timestamptz not null,
  -- not_shipped / shipped / canceled / excluded (mirrors the current gym-system model)
  shipment_flag text not null default 'not_shipped',
  raw_order_status text,
  raw_order_status2 text,
  is_manual boolean not null default false,
  is_reversal boolean not null default false,
  statement_id uuid,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (smaregi_order_id, order_detail_no)
);

create index order_lines_store_id_idx on order_lines(store_id);
create index order_lines_order_date_idx on order_lines(order_date);
create index order_lines_shipment_flag_idx on order_lines(shipment_flag);
create index order_lines_advertising_group_code_idx on order_lines(advertising_group_code);

-- Tracks polling progress against the Sumaregi orders/search API (update_date_from cursor).
create table order_sync_state (
  id boolean primary key default true check (id),
  last_synced_update_date timestamptz,
  last_run_at timestamptz,
  last_error text
);

insert into order_sync_state (id) values (true);

create table monthly_statements (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references corporations(id) on delete restrict,
  target_month date not null,
  status text not null default 'draft',
  confirmed_at timestamptz,
  agreed_at timestamptz,
  total_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corporation_id, target_month)
);

create table monthly_statement_stores (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references monthly_statements(id) on delete cascade,
  store_id uuid not null references stores(id) on delete restrict,
  total_points numeric not null,
  unit_price numeric not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index monthly_statement_stores_statement_id_idx on monthly_statement_stores(statement_id);

alter table order_lines
  add constraint order_lines_statement_id_fkey
  foreign key (statement_id) references monthly_statements(id) on delete set null;
