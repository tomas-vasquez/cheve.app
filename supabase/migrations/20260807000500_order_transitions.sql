-- Asignación de pedidos a repartidores
alter table orders
  add column if not exists delivery_user_id uuid references auth.users(id) on delete set null;

-- Valida transiciones de estado por rol:
--   Admin:      Pendiente -> En preparación | Pendiente/En preparación/En camino -> Cancelado | En camino -> En preparación
--   Repartidor: (solo su pedido asignado) En preparación -> En camino | En camino -> Entregado
--   Reclamo:    (solo repartidor) En preparación sin dueño -> asignárselo
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
    -- Sin cambio de estado: solo se permite reclamar un pedido
    if is_delivery_user and new.delivery_user_id = auth.uid()
       and old.delivery_user_id is null and old.status = 'En preparación'
       and new.items is not distinct from old.items
       and new.total is not distinct from old.total
       and new.user_id = old.user_id
       and new.customer_name is not distinct from old.customer_name
       and new.customer_email is not distinct from old.customer_email then
      return new;
    end if;
    -- Cambios triviales (p. ej. nada cambiado) permitidos
    if new is not distinct from old then
      return new;
    end if;
    raise exception 'Cambio no permitido';
  end if;

  -- Cambio de estado
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

-- Un repartidor se asigna un pedido "En preparación" sin dueño (el primero gana)
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

-- El repartidor solo puede actualizar los pedidos que le fueron asignados
drop policy if exists "orders_delivery_update" on orders;
create policy "orders_delivery_update" on orders
  for update to authenticated
  using (public.is_delivery() and delivery_user_id = auth.uid())
  with check (public.is_delivery() and delivery_user_id = auth.uid());
