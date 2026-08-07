alter table orders
  add column if not exists status text not null default 'Pendiente';

alter table profiles
  add column if not exists name text;

alter table profiles
  add column if not exists avatar text;
