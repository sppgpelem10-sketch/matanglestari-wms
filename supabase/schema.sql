-- ============================================
-- Matang Lestari WMS — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- ============ EXTENSIONS ============

create extension if not exists "uuid-ossp";

-- ============ TABLE: profiles ============
-- Data karyawan + role. Terhubung ke auth.users (Supabase Auth).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,
  full_name text not null,
  email text,
  phone text,
  role text not null check (role in ('worker', 'wms', 'admin')) default 'worker',
  position text,
  division text,
  device_id text,
  daily_rate bigint default 230000,
  joined_at date default now(),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_employee_id on public.profiles(employee_id);

-- ============ TABLE: attendance ============

create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid references public.profiles(id) on delete cascade not null,
  worker_name text not null,
  type text not null check (type in ('clock-in', 'clock-out')) not null,
  timestamp timestamptz default now() not null,
  location_lat numeric,
  location_lng numeric,
  location_address text,
  location_distance integer,
  location_within_radius boolean default true,
  location_is_mock boolean default false,
  device_id text,
  is_late boolean default false,
  is_early_out boolean default false,
  is_simulated boolean default false,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_attendance_worker on public.attendance(worker_id);
create index if not exists idx_attendance_timestamp on public.attendance(timestamp desc);

-- ============ TABLE: ot_approvals ============

create table if not exists public.ot_approvals (
  id uuid primary key default uuid_generate_v4(),
  attendance_day date not null,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  worker_name text not null,
  ot_minutes integer not null,
  estimated_cost integer not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  gps_address text,
  last_task text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(worker_id, attendance_day)
);

create index if not exists idx_ot_status on public.ot_approvals(status);

-- ============ TABLE: payroll_approvals ============

create table if not exists public.payroll_approvals (
  id uuid primary key default uuid_generate_v4(),
  month_key text not null unique,
  month_label text not null,
  total_employees integer default 0,
  total_payroll bigint default 0,
  total_ot_pay bigint default 0,
  status text not null check (status in ('pending', 'approved')) default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- ============ TABLE: inventory ============

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  name text not null,
  stock integer not null default 0,
  unit text not null default 'dus',
  min_stock integer default 50,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============ TABLE: suppliers ============

create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============ TABLE: purchase_orders ============

create table if not exists public.purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  supplier_id uuid references public.suppliers(id),
  supplier_name text not null,
  date date not null default current_date,
  expected_date date,
  status text not null check (status in ('Draft', 'Dikirim', 'Diterima', 'Selesai', 'Cancelled')) default 'Draft',
  total bigint default 0,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ TABLE: po_lines ============

create table if not exists public.po_lines (
  id uuid primary key default uuid_generate_v4(),
  po_id uuid references public.purchase_orders(id) on delete cascade not null,
  sku text not null,
  name text not null,
  qty integer not null,
  unit text default 'dus',
  price bigint not null,
  subtotal bigint not null,
  created_at timestamptz default now()
);

-- ============ TABLE: sales_orders ============

create table if not exists public.sales_orders (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  customer_name text not null,
  customer_address text,
  customer_contact text,
  customer_phone text,
  date date not null default current_date,
  status text not null check (status in ('Draft', 'Diproses', 'Dikirim', 'Selesai', 'Cancelled')) default 'Draft',
  total bigint default 0,
  courier text,
  courier_contact text,
  vehicle text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ TABLE: so_lines ============

create table if not exists public.so_lines (
  id uuid primary key default uuid_generate_v4(),
  so_id uuid references public.sales_orders(id) on delete cascade not null,
  sku text not null,
  name text not null,
  qty integer not null,
  unit text default 'dus',
  price bigint not null,
  subtotal bigint not null,
  created_at timestamptz default now()
);

-- ============ TABLE: inbound ============

create table if not exists public.inbound (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  date date not null default current_date,
  time text,
  supplier_id uuid references public.suppliers(id),
  supplier_name text not null,
  po_id uuid references public.purchase_orders(id),
  staff_id uuid references public.profiles(id),
  staff_name text,
  items integer default 0,
  total_qty integer default 0,
  photos text[] default '{}',
  notes text,
  status text not null check (status in ('Pending', 'Verified')) default 'Pending',
  verified_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_inbound_status on public.inbound(status);

-- ============ TABLE: inbound_lines ============

create table if not exists public.inbound_lines (
  id uuid primary key default uuid_generate_v4(),
  inbound_id uuid references public.inbound(id) on delete cascade not null,
  sku text not null,
  name text not null,
  qty integer not null,
  unit text default 'dus',
  created_at timestamptz default now()
);

-- ============ TABLE: outbound ============

create table if not exists public.outbound (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  date date not null default current_date,
  time text,
  customer text not null,
  so_id uuid references public.sales_orders(id),
  driver text,
  staff_id uuid references public.profiles(id),
  staff_name text,
  items integer default 0,
  total_qty integer default 0,
  photos text[] default '{}',
  notes text,
  status text not null check (status in ('Pending', 'Shipped')) default 'Pending',
  shipped_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_outbound_status on public.outbound(status);

-- ============ TABLE: outbound_lines ============

create table if not exists public.outbound_lines (
  id uuid primary key default uuid_generate_v4(),
  outbound_id uuid references public.outbound(id) on delete cascade not null,
  sku text not null,
  name text not null,
  qty integer not null,
  unit text default 'dus',
  created_at timestamptz default now()
);

-- ============ TABLE: tasks ============

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  so_id uuid references public.sales_orders(id),
  customer text not null,
  address text,
  phone text,
  items integer default 0,
  status text not null check (status in ('Pending', 'In Progress', 'Completed', 'Cancelled')) default 'Pending',
  assigned_to uuid references public.profiles(id),
  assigned_to_name text,
  started_at timestamptz,
  completed_at timestamptz,
  pod_signature text,
  pod_photo text,
  pod_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ TABLE: activity_log ============

create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  text text not null,
  actor_id uuid references public.profiles(id),
  actor_name text,
  meta jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_created on public.activity_log(created_at desc);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_ot_updated on public.ot_approvals;
create trigger trg_ot_updated
  before update on public.ot_approvals
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_po_updated on public.purchase_orders;
create trigger trg_po_updated
  before update on public.purchase_orders
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_so_updated on public.sales_orders;
create trigger trg_so_updated
  before update on public.sales_orders
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- ============================================
-- TRIGGER: auto-create profile setelah signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, employee_id, full_name, email, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'employee_id', 'EMP-' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', 'User Baru'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'worker'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.ot_approvals enable row level security;
alter table public.payroll_approvals enable row level security;
alter table public.inventory enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_lines enable row level security;
alter table public.sales_orders enable row level security;
alter table public.so_lines enable row level security;
alter table public.inbound enable row level security;
alter table public.inbound_lines enable row level security;
alter table public.outbound enable row level security;
alter table public.outbound_lines enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;

-- Helper: cek role user
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ---------- PROFILES ----------
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() in ('admin', 'wms')
  );

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
  );

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---------- ATTENDANCE ----------
create policy "attendance_insert_own"
  on public.attendance for insert
  to authenticated
  with check (worker_id = auth.uid());

create policy "attendance_select_own_or_admin"
  on public.attendance for select
  to authenticated
  using (
    worker_id = auth.uid()
    or public.current_user_role() in ('admin', 'wms')
  );

create policy "attendance_admin_all"
  on public.attendance for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

-- ---------- OT APPROVALS ----------
create policy "ot_select_own_or_admin"
  on public.ot_approvals for select
  to authenticated
  using (
    worker_id = auth.uid()
    or public.current_user_role() in ('admin', 'wms')
  );

create policy "ot_admin_all"
  on public.ot_approvals for all
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---------- PAYROLL ----------
create policy "payroll_admin_all"
  on public.payroll_approvals for all
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---------- INVENTORY, SUPPLIERS, PO, SO, INBOUND, OUTBOUND, TASKS ----------
create policy "inventory_wms_admin"
  on public.inventory for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "suppliers_wms_admin"
  on public.suppliers for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "po_wms_admin"
  on public.purchase_orders for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "po_lines_wms_admin"
  on public.po_lines for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "so_wms_admin"
  on public.sales_orders for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "so_lines_wms_admin"
  on public.so_lines for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "inbound_wms_admin"
  on public.inbound for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "inbound_lines_wms_admin"
  on public.inbound_lines for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "outbound_wms_admin"
  on public.outbound for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "outbound_lines_wms_admin"
  on public.outbound_lines for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

create policy "tasks_select_own_or_admin"
  on public.tasks for select
  to authenticated
  using (
    assigned_to = auth.uid()
    or public.current_user_role() in ('admin', 'wms')
  );

create policy "tasks_update_own"
  on public.tasks for update
  to authenticated
  using (assigned_to = auth.uid());

create policy "tasks_wms_admin_all"
  on public.tasks for all
  to authenticated
  using (public.current_user_role() in ('admin', 'wms'));

-- ---------- ACTIVITY LOG ----------
create policy "activity_select_all"
  on public.activity_log for select
  to authenticated
  using (true);

create policy "activity_insert_auth"
  on public.activity_log for insert
  to authenticated
  with check (true);

-- ============================================
-- SEED DATA
-- ============================================

insert into public.inventory (sku, name, stock, unit) values
  ('SKU-AM-001', 'Minyak Goreng Sania 2L', 248, 'dus'),
  ('SKU-BR-014', 'Beras Pandan Wangi 5kg', 89, 'karung'),
  ('SKU-GL-007', 'Gula Pasir Gulaku 1kg', 512, 'dus'),
  ('SKU-TP-023', 'Tepung Segitiga Biru 1kg', 34, 'dus'),
  ('SKU-MI-045', 'Mie Instan Indomie Goreng', 1240, 'dus'),
  ('SKU-KP-102', 'Kecap Manis Bango 520ml', 23, 'dus')
on conflict (sku) do nothing;

insert into public.suppliers (code, name, contact_name, phone, address) values
  ('SUP-001', 'PT Sinar Mas Distribution', 'Andi Kurniawan', '021-5551234', 'Kawasan Industri Pulogadung, Jakarta Timur'),
  ('SUP-002', 'CV Pangan Sejahtera', 'Siti Nurhaliza', '021-5559876', 'Jl. Industri Raya Blok C, Cikarang'),
  ('SUP-003', 'PT Unilever Indonesia Tbk', 'Budi Prasetyo', '021-5552468', 'BSD Boulevard, Tangerang Selatan'),
  ('SUP-004', 'PT Indofood CBP Sukses', 'Rina Marlina', '021-5553579', 'Sudirman Plaza, Jakarta Selatan'),
  ('SUP-005', 'UD Sumber Rezeki', 'Hendra Wijaya', '021-5554321', 'Jl. Raya Bogor Km 26, Jakarta Timur')
on conflict (code) do nothing;

-- ============================================
-- SELESAI
-- ============================================