alter table profiles
  add column if not exists is_delivery boolean not null default false;

alter table profiles
  add column if not exists email text;

update profiles p
set email = u.email
from auth.users u
where p.user_id = u.id
  and p.email is null;

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

update profiles
set is_delivery = true
where user_id = (select id from auth.users where lower(email) = lower('tomasdetloging@gmail.com'));
