-- Diferenciación ingredientes / recetas:
--  - Los ingredientes (condiments) ya NO tienen imagen (se revierte el cambio
--    de la migración 20260809030000).
--  - Las recetas (preset_recipes) son definidas por el admin y SÍ llevan imagen,
--    nombre y combinación de ingredientes (condiment_ids). El precio se calcula
--    en la app: base + suma del precio de sus ingredientes.
--  - Las recetas personales del usuario siguen en la tabla `recipes`.

-- 1) Ingredientes sin imagen + eliminar políticas del bucket condiments
--    (el bucket queda vacío; no se puede borrar por SQL, solo por Storage API).
alter table condiments drop column if exists image_url;

drop policy if exists "condiments_storage_read" on storage.objects;
drop policy if exists "condiments_storage_insert" on storage.objects;
drop policy if exists "condiments_storage_update" on storage.objects;
drop policy if exists "condiments_storage_delete" on storage.objects;

-- 2) Tabla de recetas definidas por el admin
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

-- 3) Bucket público para imágenes de recetas (solo admin puede subir/borrar)
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

-- 4) Semilla: las mismas recetas que estaban fijas en el código de la app.
--    El admin puede editarlas, renombrarlas (ej. miratecho, quitahembra) y crear nuevas.
insert into preset_recipes (name, condiment_ids, cantidad, active, sort_order)
select
  x.name,
  coalesce(s.condiment_ids, '[]'::jsonb),
  x.cantidad,
  true,
  x.sort_order
from jsonb_to_recordset('[
  {"name": "Clásica menta", "condiments": ["Menta"], "cantidad": 1, "sort_order": 1},
  {"name": "Café con canela", "condiments": ["Café", "Canela"], "cantidad": 1, "sort_order": 2},
  {"name": "Chocolate dulce", "condiments": ["Chocolate", "Coco rallado", "Miel"], "cantidad": 1, "sort_order": 3},
  {"name": "Cítrica", "condiments": ["Limón", "Naranja"], "cantidad": 1, "sort_order": 4},
  {"name": "Relajante", "condiments": ["Eucalipto", "Anís", "Miel"], "cantidad": 1, "sort_order": 5},
  {"name": "Hierba luisa y menta", "condiments": ["Hierba luisa", "Menta"], "cantidad": 1, "sort_order": 6},
  {"name": "Sin azúcar", "condiments": ["Estevia", "Limón", "Menta"], "cantidad": 1, "sort_order": 7}
]'::jsonb) as x(name text, condiments jsonb, cantidad numeric, sort_order int)
left join lateral (
  select coalesce(jsonb_agg(c.id order by t.ordinality), '[]'::jsonb) as condiment_ids
  from jsonb_array_elements_text(x.condiments) with ordinality as t(cond_name, ordinality)
  left join condiments c on c.name = t.cond_name
) s on true
on conflict do nothing;
