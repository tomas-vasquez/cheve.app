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

-- Los pedidos solo se crean vía la RPC public.place_order (valida cobertura y
-- descuento de stock); no hay política de inserción directa.

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

-- Recetas definidas por el admin (ej. miratecho, quitahembra). Cada receta es
-- una combinación de ingredientes (condiment_ids). El precio se calcula en la
-- app: base + suma del precio de sus ingredientes.
create table if not exists preset_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  condiment_ids jsonb not null default '[]',
  cantidad numeric not null default 1,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table preset_recipes enable row level security;

drop policy if exists "preset_recipes_select_authenticated" on preset_recipes;
create policy "preset_recipes_select_authenticated" on preset_recipes
  for select to authenticated using (true);

drop policy if exists "preset_recipes_admin_insert" on preset_recipes;
create policy "preset_recipes_admin_insert" on preset_recipes
  for insert to authenticated with check (public.is_admin());

drop policy if exists "preset_recipes_admin_update" on preset_recipes;
create policy "preset_recipes_admin_update" on preset_recipes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "preset_recipes_admin_delete" on preset_recipes;
create policy "preset_recipes_admin_delete" on preset_recipes
  for delete to authenticated using (public.is_admin());

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

-- Solo el encargado (admin@cheve.app) puede agregar o editar productos.
create or replace function public.is_product_manager()
returns boolean language sql stable security definer
set search_path = public
as $$
  select auth.uid() = '721ecd1b-204c-48cc-83f5-aa7ad2265d2c';
$$;

-- ============================================================================
-- Multi-sucursal (fundación: va antes de las políticas que la referencian)
-- ============================================================================

-- Sucursales: se crean directamente en la base de datos.
-- Cada sucursal tiene nombre, dirección, coordenadas, radio de entrega (km) y activo.
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  delivery_radius_km numeric(6,2) not null default 5,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table branches enable row level security;

drop policy if exists "branches_select_authenticated" on branches;
create policy "branches_select_authenticated" on branches
  for select to authenticated using (true);

drop policy if exists "branches_update_admin_own" on branches;
create policy "branches_update_admin_own" on branches
  for update to authenticated
  using (public.is_admin() and id = public.my_branch_id())
  with check (public.is_admin() and id = public.my_branch_id());

-- Enlace de pedidos y perfiles a una sucursal.
alter table orders add column if not exists branch_id uuid references branches(id);
alter table profiles add column if not exists branch_id uuid references branches(id);

-- Helper: sucursal del usuario autenticado.
create or replace function public.my_branch_id()
returns uuid language sql stable security definer
set search_path = public
as $$
  select branch_id from public.profiles where user_id = auth.uid();
$$;

-- Distancia haversine en km.
create or replace function public.haversine_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns double precision language sql immutable
as $$
  select 6371.0 * 2 * asin(
    sqrt(
      power(sin(radians(p_lat2 - p_lat1) / 2), 2) +
      cos(radians(p_lat1)) * cos(radians(p_lat2)) *
      power(sin(radians(p_lng2 - p_lng1) / 2), 2)
    )
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
  for insert to authenticated with check (public.is_product_manager());

drop policy if exists "products_admin_update" on products;
create policy "products_admin_update" on products
  for update to authenticated using (public.is_product_manager()) with check (public.is_product_manager());

drop policy if exists "products_admin_delete" on products;
create policy "products_admin_delete" on products
  for delete to authenticated using (public.is_product_manager());

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
  for select to authenticated using (public.is_admin() and branch_id = public.my_branch_id());

drop policy if exists "orders_admin_update" on orders;
create policy "orders_admin_update" on orders
  for update to authenticated using (public.is_admin() and branch_id = public.my_branch_id())
  with check (public.is_admin() and branch_id = public.my_branch_id());

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
  for select to authenticated using (public.is_delivery() and branch_id = public.my_branch_id());

drop policy if exists "orders_delivery_update" on orders;
create policy "orders_delivery_update" on orders
  for update to authenticated
  using (public.is_delivery() and delivery_user_id = auth.uid() and branch_id = public.my_branch_id())
  with check (public.is_delivery() and delivery_user_id = auth.uid() and branch_id = public.my_branch_id());

create or replace function public.set_delivery(p_email text, p_flag boolean)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid;
  caller_branch uuid;
begin
  if not public.is_admin() then
    return false;
  end if;
  select branch_id into caller_branch from public.profiles where user_id = auth.uid();
  if caller_branch is null then
    return false;
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    return false;
  end if;
  insert into profiles (user_id, email, is_delivery, branch_id)
  values (uid, p_email, p_flag, caller_branch)
  on conflict (user_id)
  do update set is_delivery = excluded.is_delivery, email = excluded.email, branch_id = caller_branch, updated_at = now();
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
  with check (bucket_id = 'products' and public.is_product_manager());

create policy "products_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'products' and public.is_product_manager())
  with check (bucket_id = 'products' and public.is_product_manager());

create policy "products_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_product_manager());

-- Bucket público para imágenes de recetas. A diferencia del bucket 'products'
-- (solo is_product_manager), cualquier admin lo gestiona. Los ingredientes
-- (condiments) no llevan imagen.
insert into storage.buckets (id, name, public)
values ('recipes', 'recipes', true)
on conflict (id) do nothing;

drop policy if exists "recipes_storage_read" on storage.objects;
create policy "recipes_storage_read" on storage.objects
  for select using (bucket_id = 'recipes');

drop policy if exists "recipes_storage_insert" on storage.objects;
create policy "recipes_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipes' and public.is_admin());

drop policy if exists "recipes_storage_update" on storage.objects;
create policy "recipes_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipes' and public.is_admin())
  with check (bucket_id = 'recipes' and public.is_admin());

drop policy if exists "recipes_storage_delete" on storage.objects;
create policy "recipes_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipes' and public.is_admin());

alter table orders
  add column if not exists delivery_user_id uuid references auth.users(id) on delete set null;

create or replace function public.orders_check_status_update()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  is_admin_user boolean := public.is_admin() and new.branch_id = public.my_branch_id();
  is_delivery_user boolean := public.is_delivery() and new.branch_id = public.my_branch_id();
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
    and delivery_user_id is null
    and branch_id = (select branch_id from public.profiles where user_id = auth.uid());
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

grant execute on function public.claim_order(uuid) to authenticated;

drop policy if exists "orders_delivery_update" on orders;

alter table orders replica identity full;

alter publication supabase_realtime add table orders;

-- ============================================================================
-- Multi-sucursal
-- ============================================================================

-- Un cliente solo puede editar ciertas columnas de su perfil
-- (no is_admin/is_delivery/email).
revoke update on table public.profiles from authenticated;
grant update (name, avatar, lat, lng, reference, branch_id, updated_at) on table public.profiles to authenticated;

-- Stock por sucursal.
create table if not exists branch_stock (
  branch_id uuid not null references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stock integer not null default 0,
  primary key (branch_id, product_id)
);

alter table branch_stock enable row level security;

drop policy if exists "branch_stock_select_authenticated" on branch_stock;
create policy "branch_stock_select_authenticated" on branch_stock
  for select to authenticated using (true);

drop policy if exists "branch_stock_admin_write" on branch_stock;
create policy "branch_stock_admin_write" on branch_stock
  for insert to authenticated with check (public.is_admin() and branch_id = public.my_branch_id());

drop policy if exists "branch_stock_admin_update" on branch_stock;
create policy "branch_stock_admin_update" on branch_stock
  for update to authenticated using (public.is_admin() and branch_id = public.my_branch_id())
  with check (public.is_admin() and branch_id = public.my_branch_id());

drop policy if exists "branch_stock_admin_delete" on branch_stock;
create policy "branch_stock_admin_delete" on branch_stock
  for delete to authenticated using (public.is_admin() and branch_id = public.my_branch_id());

-- Productos "pack" (ej. 12 pack): comparten el stock físico del producto
-- unidad (pack_of). El stock real se guarda SOLO en la unidad; el pack es
-- derivado. units_per_pack = unidades que consume cada pack.
alter table products
  add column if not exists pack_of uuid references products(id) on delete restrict;

alter table products
  add column if not exists units_per_pack integer not null default 1;

alter table products
  drop constraint if exists products_no_self_pack;
alter table products
  add constraint products_no_self_pack check (pack_of is distinct from id);

-- Catálogo de una sucursal: TODOS los productos con su stock en esa sucursal.
-- Los productos sin fila en branch_stock se muestran con stock 0 (agotados).
-- Para los packs, el stock = stock_unidad / units_per_pack (división entera).
create or replace view branch_products with (security_invoker = true) as
  select
    b.id as branch_id,
    p.id as product_id,
    case
      when p.pack_of is null then coalesce(bs.stock, 0)
      else coalesce(bs2.stock, 0) / nullif(p.units_per_pack, 0)
    end as stock,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category,
    p.abv,
    p.created_at,
    p.pack_of,
    p.units_per_pack
  from branches b
  cross join products p
  left join branch_stock bs on bs.branch_id = b.id and bs.product_id = p.id
  left join products pp on pp.id = p.pack_of
  left join branch_stock bs2 on bs2.branch_id = b.id and bs2.product_id = pp.id;

-- place_order: transacción atómica que valida cobertura, descuenta stock
-- y guarda la sucursal enlazada del cliente.
create or replace function public.place_order(
  p_items jsonb,
  p_total numeric,
  p_payment_method text,
  p_branch_id uuid
)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid;
  v_email text;
  v_name text;
  v_lat double precision;
  v_lng double precision;
  v_reference text;
  v_branch_lat double precision;
  v_branch_lng double precision;
  v_radius numeric;
  v_dist double precision;
  v_order_id uuid;
  item record;
  v_item_id uuid;
  v_qty int;
  v_factor int;
  v_source_id uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Debes iniciar sesión para hacer un pedido.';
  end if;

  select lat, lng, delivery_radius_km into v_branch_lat, v_branch_lng, v_radius
  from public.branches
  where id = p_branch_id and active = true;
  if v_branch_lat is null then
    raise exception 'Sucursal no disponible.';
  end if;

  select email into v_email from auth.users where id = uid;
  select name, lat, lng, reference into v_name, v_lat, v_lng, v_reference
  from public.profiles where user_id = uid;

  if v_lat is null or v_lng is null then
    raise exception 'Debes definir tu ubicación antes de confirmar el pedido.';
  end if;

  v_dist := public.haversine_km(v_lat, v_lng, v_branch_lat, v_branch_lng);
  if v_dist > v_radius then
    raise exception using message = format(
      'Sin cobertura de entrega en tu zona (estás a %.1f km y el radio de la sucursal es %.1f km).',
      v_dist, v_radius
    );
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    v_item_id := null;
    begin
      v_item_id := (item.value->>'id')::uuid;
    exception when others then
      null; -- machucadas / ítems sin producto real: bajo pedido
    end;
    if v_item_id is not null then
      v_qty := coalesce((item.value->>'quantity')::int, 1);
      -- Un pack descuenta de su producto base (unidad); factor = unidades por pack.
      select coalesce(p.pack_of, p.id),
             case when p.pack_of is null then 1 else p.units_per_pack end
        into v_source_id, v_factor
        from public.products p
        where p.id = v_item_id;
      update public.branch_stock
      set stock = stock - (v_qty * v_factor)
      where branch_id = p_branch_id and product_id = v_source_id and stock >= v_qty * v_factor;
      if not found then
        raise exception using message = 'Sin stock suficiente de ' || coalesce(item.value->>'name', 'producto');
      end if;
    end if;
  end loop;

  insert into public.orders (
    user_id, items, total, status, payment_method, branch_id,
    customer_email, customer_name, delivery_lat, delivery_lng, delivery_reference
  )
  values (
    uid, p_items, p_total, 'Pendiente', p_payment_method, p_branch_id,
    v_email, v_name, v_lat, v_lng, v_reference
  )
  returning id into v_order_id;

  insert into public.profiles (user_id, branch_id)
  values (uid, p_branch_id)
  on conflict (user_id) do update set branch_id = excluded.branch_id, updated_at = now();

  return v_order_id;
end;
$$;

grant execute on function public.place_order(jsonb, numeric, text, uuid) to authenticated;
