-- ============================================================================
-- Packs compartidos (unidad + 12 pack)
--
-- Un producto "pack" (ej. 12 pack) comparte el stock físico de un producto
-- "unidad". El stock real se guarda SOLO en la unidad; el pack es derivado.
-- ============================================================================

alter table products
  add column if not exists pack_of uuid references products(id) on delete restrict;

alter table products
  add column if not exists units_per_pack integer not null default 1;

alter table products
  drop constraint if exists products_no_self_pack;
alter table products
  add constraint products_no_self_pack check (pack_of is distinct from id);

-- Vista catálogo: para los packs, el stock = stock_unidad / units_per_pack
-- (división entera). También expone pack_of / units_per_pack para el admin.
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

-- place_order: los packs descuentan qty * units_per_pack del stock de la unidad.
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
