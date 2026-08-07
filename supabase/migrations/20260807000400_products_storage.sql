-- Bucket público para imágenes de productos
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes
drop policy if exists "products_storage_read" on storage.objects;
create policy "products_storage_read" on storage.objects
  for select using (bucket_id = 'products');

-- Solo administradores pueden subir, sobrescribir o eliminar imágenes
drop policy if exists "products_storage_insert" on storage.objects;
create policy "products_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "products_storage_update" on storage.objects;
create policy "products_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "products_storage_delete" on storage.objects;
create policy "products_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_admin());
