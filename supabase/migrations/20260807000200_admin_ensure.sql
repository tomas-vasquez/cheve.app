-- Garantiza que el correo admin tenga perfil con is_admin = true,
-- sin distinguir mayúsculas/minúsculas en el email.
insert into profiles (user_id, is_admin)
select id, true
from auth.users
where lower(email) = lower('tomasdetloging@gmail.com')
on conflict (user_id)
do update set is_admin = true, updated_at = now();
