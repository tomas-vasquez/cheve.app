-- Imagen opcional para cada sabor/receta (condiments). Cualquier admin puede
-- subirla (is_admin), a diferencia del bucket 'products' (solo is_product_manager).
alter table condiments
  add column if not exists image_url text;

-- Bucket público para imágenes de sabores/recetas
insert into storage.buckets (id, name, public)
values ('condiments', 'condiments', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes
drop policy if exists "condiments_storage_read" on storage.objects;
create policy "condiments_storage_read" on storage.objects
  for select using (bucket_id = 'condiments');

-- Solo administradores pueden subir, sobrescribir o eliminar imágenes
drop policy if exists "condiments_storage_insert" on storage.objects;
create policy "condiments_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'condiments' and public.is_admin());

drop policy if exists "condiments_storage_update" on storage.objects;
create policy "condiments_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'condiments' and public.is_admin())
  with check (bucket_id = 'condiments' and public.is_admin());

drop policy if exists "condiments_storage_delete" on storage.objects;
create policy "condiments_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'condiments' and public.is_admin());
