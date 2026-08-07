create or replace function public.auto_promote_admin()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = new.user_id;
  if user_email = 'tomasdetloging@gmail.com' then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists auto_promote_admin on profiles;
create trigger auto_promote_admin
  before insert on profiles
  for each row execute function public.auto_promote_admin();
