import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

const DEFAULT_POS = [-17.7833, -63.1821];

const pinIcon = L.divIcon({
  className: 'map-pin',
  html: '<div class="map-pin-inner"></div>',
  iconSize: [26, 40],
  iconAnchor: [13, 31],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function Recenter({ pos, shouldFly }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (shouldFly) map.flyTo(pos, 16, { duration: 1 });
  }, [map, pos, shouldFly]);
  return null;
}

export default function MapPicker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { branches, nearestBranch, reload } = useBranch();
  const [pos, setPos] = useState(DEFAULT_POS);
  const [flyToPos, setFlyToPos] = useState(true);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const watchIdRef = useRef(null);

  const pickPos = (p) => {
    setFlyToPos(false);
    setPos(p);
  };

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocating(false);
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('lat, lng, reference')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      if (data.lat != null && data.lng != null) {
        setPos([data.lat, data.lng]);
      }
      setReference(data.reference || '');
    }
  }, [user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const locate = () => {
    if (!navigator.geolocation) {
      setFeedback('Tu navegador no permite obtener tu ubicación.');
      return;
    }
    if (watchIdRef.current != null) {
      stopWatch();
      return;
    }
    setLocating(true);
    setFeedback('Obteniendo ubicación con alta precisión...');
    let timeoutId = null;
    const handlePosition = (p) => {
      const accuracy = p.coords.accuracy;
      console.log('Precisión de ubicación:', accuracy, 'm');
      if (accuracy <= 10) {
        clearTimeout(timeoutId);
        setFlyToPos(true);
        setPos([p.coords.latitude, p.coords.longitude]);
        stopWatch();
        setFeedback('Ubicación precisa (≤ 10 m).');
        return;
      }
      setFeedback(
        `Precisión: ${Math.round(accuracy)} m, esperando mejor señal...`
      );
    };
    const handleError = () => {
      clearTimeout(timeoutId);
      stopWatch();
      setFeedback('No se pudo obtener tu ubicación.');
    };
    timeoutId = setTimeout(() => {
      stopWatch();
      setFeedback('No se logró una precisión ≤ 10 m. Intenta de nuevo.');
    }, 30000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const save = async () => {
    setSaving(true);
    setFeedback('');
    const nearest = nearestBranch(branches, pos[0], pos[1]);
    const payload = {
      user_id: user.id,
      lat: pos[0],
      lng: pos[1],
      reference: reference.trim(),
      updated_at: new Date().toISOString(),
    };
    if (nearest) payload.branch_id = nearest.id;
    const { error } = await supabase.from('profiles').upsert(
      payload,
      { onConflict: 'user_id' }
    );
    setSaving(false);
    if (error) {
      console.error(error);
      setFeedback(
        `No se pudo guardar: ${error.message}. Verifica que la tabla profiles exista en Supabase.`
      );
    } else {
      await reload();
      navigate(-1);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backButton} aria-label="Volver" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <h1 style={styles.title}>Definir ubicación</h1>
        <span style={styles.headerSpacer} />
      </header>

      <div style={styles.mapWrap}>
        <MapContainer
          center={pos}
          zoom={12}
          scrollWheelZoom
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onPick={pickPos} />
          <Recenter pos={pos} shouldFly={flyToPos} />
          <Marker
            position={pos}
            draggable
            icon={pinIcon}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                pickPos([lat, lng]);
              },
            }}
          />
        </MapContainer>
        <button style={styles.locateFab} onClick={locate} disabled={locating} aria-label="Usar mi ubicación">
          {locating ? (
            <span style={styles.spinner} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h6" />
              <circle cx="12" cy="12" r="3" />
              <path d="M22 12h-6" />
              <path d="M12 2v6" />
              <path d="M12 22v-6" />
            </svg>
          )}
        </button>
      </div>

      <div style={styles.panel}>
        <label style={styles.label}>Referencia</label>
        <input
          type="text"
          placeholder="Ej: Casa Blanca #456"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={styles.input}
        />

        {feedback && (
          <p style={styles.feedback} role="status" aria-live="polite">
            {feedback}
          </p>
        )}

        <button style={styles.saveButton} onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar ubicación'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 },
  headerSpacer: { width: 36 },
  mapWrap: { flex: 1, position: 'relative', minHeight: 0 },
  locateFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1DB954',
    color: '#000',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '3px solid rgba(0,0,0,0.25)',
    borderTopColor: '#000',
    animation: 'spin 0.8s linear infinite',
  },
  panel: {
    padding: 16,
    background: 'rgba(0,0,0,0.85)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 6 },
  input: {
    width: '100%',
    marginBottom: 12,
    padding: '12px 14px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  feedback: { fontSize: 13, color: '#ff6b6b', margin: '4px 0 10px' },
  saveButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: 14,
    borderRadius: 500,
    width: '100%',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
  },
};
