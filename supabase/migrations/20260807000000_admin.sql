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

update profiles set is_admin = true
where user_id = (select id from auth.users where email = 'tomasdetloging@gmail.com');
