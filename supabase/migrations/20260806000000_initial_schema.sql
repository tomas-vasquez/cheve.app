create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  category text,
  abv numeric(4,1),
  stock integer default 0,
  created_at timestamp default now()
);

alter table products enable row level security;

drop policy if exists "products_select_authenticated" on products;
create policy "products_select_authenticated" on products
  for select to authenticated using (true);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]',
  total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

drop policy if exists "orders_insert_own" on orders;
create policy "orders_insert_own" on orders
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "orders_select_own" on orders;
create policy "orders_select_own" on orders
  for select to authenticated using (auth.uid() = user_id);

create table if not exists condiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table condiments enable row level security;

drop policy if exists "condiments_select_authenticated" on condiments;
create policy "condiments_select_authenticated" on condiments
  for select to authenticated using (true);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  condiment_ids jsonb not null default '[]',
  cantidad numeric not null default 1,
  created_at timestamptz not null default now()
);

alter table recipes
  add column if not exists cantidad numeric not null default 1;

alter table recipes
  drop column if exists coca_qty;

alter table recipes
  drop column if exists libras;

alter table recipes
  drop column if exists cuartilla;

alter table recipes enable row level security;

drop policy if exists "recipes_insert_own" on recipes;
create policy "recipes_insert_own" on recipes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "recipes_select_own" on recipes;
create policy "recipes_select_own" on recipes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on recipes;
create policy "recipes_delete_own" on recipes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on recipes;
create policy "recipes_update_own" on recipes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  address text,
  reference text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add column if not exists lat double precision;

alter table profiles
  add column if not exists lng double precision;

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
