-- El catálogo de cada sucursal debe mostrar TODOS los productos, incluidos los
-- que no tienen stock asignado (sin fila en branch_stock) o que están agotados.
-- Antes era un inner join: los productos "sin stock" no aparecían en la app.
create or replace view branch_products with (security_invoker = true) as
  select
    b.id as branch_id,
    p.id as product_id,
    coalesce(bs.stock, 0) as stock,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category,
    p.abv,
    p.created_at
  from branches b
  cross join products p
  left join branch_stock bs on bs.branch_id = b.id and bs.product_id = p.id;
