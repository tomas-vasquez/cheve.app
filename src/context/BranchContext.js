import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';

const BranchContext = createContext(undefined);

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function nearestBranch(branches, lat, lng) {
  if (!branches || branches.length === 0 || lat == null || lng == null) return null;
  let best = null;
  let bestDist = Infinity;
  for (const b of branches) {
    const d = haversineKm(lat, lng, Number(b.lat), Number(b.lng));
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const { showToast } = useToast();

  const [branches, setBranches] = useState([]);
  const [profile, setProfile] = useState({});
  const [branchId, setBranchId] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: bData }, { data: pData }] = await Promise.all([
      supabase.from('branches').select('*').eq('active', true).order('name'),
      user
        ? supabase
            .from('profiles')
            .select('branch_id, lat, lng, reference')
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (bData) setBranches(bData);
    setProfile(pData || {});
    if (pData?.branch_id) {
      setBranchId(pData.branch_id);
    } else if (pData && pData.lat != null && pData.lng != null && bData && bData.length) {
      const near = nearestBranch(bData, pData.lat, pData.lng);
      setBranchId(near ? near.id : null);
    } else {
      setBranchId(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectBranch = useCallback(
    async (id) => {
      if (id === branchId) return;
      setBranchId(id);
      localStorage.setItem('cheve:branch', id);
      if (user) {
        await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              branch_id: id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      }
      if (items.length > 0) {
        clear();
        showToast('Sucursal cambiada · carrito vaciado', { tone: 'info' });
      }
    },
    [branchId, user, items.length, clear, showToast]
  );

  const currentBranch =
    branches.find((b) => b.id === branchId) || branches[0] || null;

  const hasLocation = profile.lat != null && profile.lng != null;

  const distanceKm =
    currentBranch && hasLocation
      ? haversineKm(profile.lat, profile.lng, Number(currentBranch.lat), Number(currentBranch.lng))
      : null;

  const covered =
    distanceKm != null &&
    currentBranch &&
    distanceKm <= Number(currentBranch.delivery_radius_km);

  const branchById = useCallback(
    (id) => branches.find((b) => b.id === id) || null,
    [branches]
  );

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        branchId: currentBranch?.id ?? null,
        profile,
        hasLocation,
        distanceKm,
        covered,
        loading,
        reload,
        selectBranch,
        branchById,
        nearestBranch,
        haversineKm,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch debe usarse dentro de BranchProvider');
  return ctx;
}
