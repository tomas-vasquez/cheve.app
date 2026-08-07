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
  status text not null default 'Pendiente',
  created_at timestamptz not null default now()
);

alter table orders
  add column if not exists status text not null default 'Pendiente';

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
  name text,
  avatar text,
  address text,
  reference text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add column if not exists name text;

alter table profiles
  add column if not exists avatar text;

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

alter table profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;

alter table orders
  add column if not exists customer_email text;

alter table orders
  add column if not exists customer_name text;

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  background text not null default 'linear-gradient(135deg, #c9a227 0%, #7a5c10 100%)',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table banners enable row level security;

drop policy if exists "banners_select_authenticated" on banners;
create policy "banners_select_authenticated" on banners
  for select to authenticated using (true);

drop policy if exists "banners_admin_all" on banners;
create policy "banners_admin_all" on banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_insert" on products;
create policy "products_admin_insert" on products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "products_admin_update" on products;
create policy "products_admin_update" on products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_delete" on products;
create policy "products_admin_delete" on products
  for delete to authenticated using (public.is_admin());

drop policy if exists "condiments_admin_insert" on condiments;
create policy "condiments_admin_insert" on condiments
  for insert to authenticated with check (public.is_admin());

drop policy if exists "condiments_admin_update" on condiments;
create policy "condiments_admin_update" on condiments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "condiments_admin_delete" on condiments;
create policy "condiments_admin_delete" on condiments
  for delete to authenticated using (public.is_admin());

drop policy if exists "orders_admin_select" on orders;
create policy "orders_admin_select" on orders
  for select to authenticated using (public.is_admin());

drop policy if exists "orders_admin_update" on orders;
create policy "orders_admin_update" on orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_admin_select" on profiles;
create policy "profiles_admin_select" on profiles
  for select to authenticated using (public.is_admin());

create or replace function public.auto_promote_admin()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = new.user_id;
  if user_email = 'tomasdetloging@gmail.com' then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists auto_promote_admin on profiles;
create trigger auto_promote_admin
  before insert on profiles
  for each row execute function public.auto_promote_admin();

alter table profiles
  add column if not exists is_delivery boolean not null default false;

alter table profiles
  add column if not exists email text;

create or replace function public.is_delivery()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_delivery = true
  );
$$;

create or replace function public.profiles_email_sync()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = new.user_id;
  if user_email is not null then
    new.email := user_email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_email_sync on profiles;
create trigger profiles_email_sync
  before insert on profiles
  for each row execute function public.profiles_email_sync();

alter table orders
  add column if not exists delivery_lat double precision;

alter table orders
  add column if not exists delivery_lng double precision;

alter table orders
  add column if not exists delivery_reference text;

alter table orders
  add column if not exists payment_method text;

drop policy if exists "orders_delivery_select" on orders;
create policy "orders_delivery_select" on orders
  for select to authenticated using (public.is_delivery());

drop policy if exists "orders_delivery_update" on orders;
create policy "orders_delivery_update" on orders
  for update to authenticated using (public.is_delivery()) with check (public.is_delivery());

create or replace function public.set_delivery(p_email text, p_flag boolean)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.is_admin() then
    return false;
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    return false;
  end if;
  insert into profiles (user_id, email, is_delivery)
  values (uid, p_email, p_flag)
  on conflict (user_id)
  do update set is_delivery = excluded.is_delivery, email = excluded.email, updated_at = now();
  return true;
end;
$$;

grant execute on function public.set_delivery(text, boolean) to authenticated;

-- Bucket público para imágenes de productos
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products_storage_read" on storage.objects
  for select using (bucket_id = 'products');

create policy "products_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and public.is_admin());

create policy "products_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

create policy "products_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_admin());

alter table orders
  add column if not exists delivery_user_id uuid references auth.users(id) on delete set null;

create or replace function public.orders_check_status_update()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  is_admin_user boolean := public.is_admin();
  is_delivery_user boolean := public.is_delivery();
  assigned_to_me boolean := new.delivery_user_id is not null and new.delivery_user_id = auth.uid();
begin
  if new.status = old.status then
    if is_delivery_user and new.delivery_user_id = auth.uid()
       and old.delivery_user_id is null and old.status = 'En preparación'
       and new.items is not distinct from old.items
       and new.total is not distinct from old.total
       and new.user_id = old.user_id
       and new.customer_name is not distinct from old.customer_name
       and new.customer_email is not distinct from old.customer_email then
      return new;
    end if;
    if new is not distinct from old then
      return new;
    end if;
    raise exception 'Cambio no permitido';
  end if;

  if is_admin_user then
    if new.status = 'En preparación' and old.status = 'Pendiente' then
      new.delivery_user_id := null;
      return new;
    end if;
    if new.status = 'Cancelado' and old.status in ('Pendiente', 'En preparación', 'En camino') then
      new.delivery_user_id := null;
      return new;
    end if;
    if new.status = 'En preparación' and old.status = 'En camino' then
      new.delivery_user_id := null;
      return new;
    end if;
    raise exception 'Transición no permitida para el administrador';
  end if;

  if is_delivery_user and assigned_to_me then
    if new.status = 'En camino' and old.status = 'En preparación' then
      return new;
    end if;
    if new.status = 'Entregado' and old.status = 'En camino' then
      return new;
    end if;
    raise exception 'Transición no permitida para el repartidor';
  end if;

  raise exception 'No tienes permiso para cambiar este pedido';
end;
$$;

create trigger orders_check_status_update
  before update on orders
  for each row execute function public.orders_check_status_update();

create or replace function public.claim_order(p_id uuid)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_delivery() then
    return false;
  end if;
  update orders
  set delivery_user_id = auth.uid()
  where id = p_id
    and status = 'En preparación'
    and delivery_user_id is null;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

grant execute on function public.claim_order(uuid) to authenticated;

create policy "orders_delivery_update" on orders
  for update to authenticated
  using (public.is_delivery() and delivery_user_id = auth.uid())
  with check (public.is_delivery() and delivery_user_id = auth.uid());

alter table orders replica identity full;

alter publication supabase_realtime add table orders;
