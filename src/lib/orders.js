import { supabase } from './supabase';

export async function placeOrder(items, total, paymentMethod = 'contra_entrega', branchId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Debes iniciar sesión para pagar.') };
  if (!branchId) return { error: new Error('No hay una sucursal seleccionada.') };

  return supabase.rpc('place_order', {
    p_items: items,
    p_total: total,
    p_payment_method: paymentMethod,
    p_branch_id: branchId,
  });
}
