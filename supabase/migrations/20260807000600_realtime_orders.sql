-- Habilita realtime para la tabla orders
alter table orders replica identity full;

alter publication supabase_realtime add table orders;
