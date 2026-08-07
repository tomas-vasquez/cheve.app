import { supabase } from './supabase';

export async function placeOrder(items, total, paymentMethod = 'contra_entrega') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Debes iniciar sesión para pagar.') };

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, lat, lng, reference')
    .eq('user_id', user.id)
    .maybeSingle();

  return supabase.from('orders').insert({
    user_id: user.id,
    items,
    total,
    status: 'Pendiente',
    payment_method: paymentMethod,
    customer_email: user.email,
    customer_name: profile?.name ?? null,
    delivery_lat: profile?.lat ?? null,
    delivery_lng: profile?.lng ?? null,
    delivery_reference: profile?.reference ?? null,
  });
}
