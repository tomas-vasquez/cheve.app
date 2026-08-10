-- Cada ingrediente de una receta lleva ahora su cantidad en gramos.
-- preset_recipes.condiment_ids pasa de ser un array de uuid a un array de
-- objetos { "id": uuid, "grams": numeric }.
-- Se migra el dato existente: los ingredientes sin gramos quedan en 0 y el
-- admin los completa desde la pestaña Recetas.
update preset_recipes
set condiment_ids = (
  select coalesce(
    jsonb_agg(jsonb_build_object('id', t.id, 'grams', 0) order by t.ordinality),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(condiment_ids) with ordinality as t(id, ordinality)
)
where condiment_ids is not null
  and jsonb_typeof(condiment_ids) = 'array'
  and (
    jsonb_array_length(condiment_ids) = 0
    or jsonb_typeof(condiment_ids -> 0) = 'string'
  );
