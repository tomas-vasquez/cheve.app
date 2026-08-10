-- Solo admin@cheve.app puede agregar o editar productos (tabla products e
-- imágenes en el bucket 'products'). Los demás admins siguen gestionando su
-- sucursal (stock, pedidos, repartidores).
create or replace function public.is_product_manager()
returns boolean language sql stable security definer
set search_path = public
as $$
  select auth.uid() = '721ecd1b-204c-48cc-83f5-aa7ad2265d2c';
$$;

drop policy if exists "products_admin_insert" on products;
create policy "products_admin_insert" on products
  for insert to authenticated with check (public.is_product_manager());

drop policy if exists "products_admin_update" on products;
create policy "products_admin_update" on products
  for update to authenticated using (public.is_product_manager()) with check (public.is_product_manager());

drop policy if exists "products_admin_delete" on products;
create policy "products_admin_delete" on products
  for delete to authenticated using (public.is_product_manager());

drop policy if exists "products_storage_insert" on storage.objects;
create policy "products_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and public.is_product_manager());

drop policy if exists "products_storage_update" on storage.objects;
create policy "products_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'products' and public.is_product_manager())
  with check (bucket_id = 'products' and public.is_product_manager());

drop policy if exists "products_storage_delete" on storage.objects;
create policy "products_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_product_manager());
