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

alter table branches enable row level security;

drop policy if exists "branches_select_authenticated" on branches;
create policy "branches_select_authenticated" on branches
  for select to authenticated using (true);

drop policy if exists "branches_update_admin_own" on branches;
create policy "branches_update_admin_own" on branches
  for update to authenticated
  using (public.is_admin() and id = public.my_branch_id())
  with check (public.is_admin() and id = public.my_branch_id());

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

-- Catálogo de una sucursal: productos con su stock en esa sucursal.
create or replace view branch_products with (security_invoker = true) as
  select
    bs.branch_id,
    bs.product_id,
    bs.stock,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category,
    p.abv,
    p.created_at
  from branch_stock bs
  join products p on p.id = bs.product_id;

-- Los pedidos solo se crean vía la RPC place_order (no se puede saltar
-- la validación de cobertura ni el descuento de stock).
drop policy if exists "orders_insert_own" on orders;

-- Políticas de admin/reparto restringidas a la sucursal del usuario.
drop policy if exists "orders_admin_select" on orders;
create policy "orders_admin_select" on orders
  for select to authenticated using (public.is_admin() and branch_id = public.my_branch_id());

drop policy if exists "orders_admin_update" on orders;
create policy "orders_admin_update" on orders
  for update to authenticated using (public.is_admin() and branch_id = public.my_branch_id())
  with check (public.is_admin() and branch_id = public.my_branch_id());

drop policy if exists "orders_delivery_select" on orders;
create policy "orders_delivery_select" on orders
  for select to authenticated using (public.is_delivery() and branch_id = public.my_branch_id());

drop policy if exists "orders_delivery_update" on orders;
create policy "orders_delivery_update" on orders
  for update to authenticated
  using (public.is_delivery() and delivery_user_id = auth.uid() and branch_id = public.my_branch_id())
  with check (public.is_delivery() and delivery_user_id = auth.uid() and branch_id = public.my_branch_id());

-- Cierra el hueco de seguridad: un cliente solo puede editar ciertas columnas
-- de su perfil (no is_admin/is_delivery/email).
revoke update on table public.profiles from authenticated;
grant update (name, avatar, lat, lng, reference, branch_id, updated_at) on table public.profiles to authenticated;

-- set_delivery: el repartidor se enlaza a la sucursal del admin que lo agrega.
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

-- claim_order: solo se puede tomar un pedido de la propia sucursal.
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

-- Trigger de transiciones de estado: restringido a la sucursal del usuario.
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

drop trigger if exists orders_check_status_update on orders;
create trigger orders_check_status_update
  before update on orders
  for each row execute function public.orders_check_status_update();

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
      update public.branch_stock
      set stock = stock - v_qty
      where branch_id = p_branch_id and product_id = v_item_id and stock >= v_qty;
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

-- Backfill opcional: si ya existe alguna sucursal, asigna los productos actuales
-- a esa sucursal usando el stock global como punto de partida.
insert into branch_stock (branch_id, product_id, stock)
select b.id, p.id, p.stock
from branches b
cross join products p
on conflict (branch_id, product_id) do nothing;
