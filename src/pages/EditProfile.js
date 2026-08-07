import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email?.[0] || 'U').toUpperCase();
  const fileRef = useRef(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setName(data.name || '');
        setAvatar(data.avatar || null);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user.id]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setFeedback('');
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        name: name.trim(),
        avatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    setSaving(false);
    if (error) {
      console.error(error);
      setFeedback(`No se pudo guardar: ${error.message}`);
    } else {
      navigate('/profile');
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backButton} aria-label="Volver" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <h1 style={styles.title}>Editar perfil</h1>
        <span style={styles.headerSpacer} />
      </header>

      <div style={styles.body}>
        {loading ? (
          <div>
            <Skeleton height={96} borderRadius={48} style={{ margin: '0 auto 20px', width: 96 }} />
            <Skeleton height={48} borderRadius={10} style={{ marginBottom: 20 }} />
          </div>
        ) : (
          <>
            <button
              style={styles.avatarWrap}
              onClick={() => fileRef.current?.click()}
              aria-label="Cambiar foto de perfil"
            >
              {avatar ? (
                <img src={avatar} alt="Foto de perfil" style={styles.avatarImage} />
              ) : (
                <div style={styles.avatar}>{initial}</div>
              )}
              <span style={styles.cameraBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <p style={styles.hint}>Toca para cambiar tu foto</p>

            <label style={styles.label}>Nombre</label>
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />

            {feedback && (
              <p style={styles.feedback} role="status" aria-live="polite">
                {feedback}
              </p>
            )}

            <button style={styles.saveButton} onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </>
        )}
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
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 },
  headerSpacer: { width: 36 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  avatarWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #c9a227, #e6c25a)',
    margin: '0 auto 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 38,
    fontWeight: 800,
    background: '#000',
    color: '#c9a227',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    border: '2px solid #c9a227',
    color: '#c9a227',
  },
  hint: { textAlign: 'center', fontSize: 12, color: '#8a8a8a', margin: '0 0 24px' },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 6 },
  input: {
    width: '100%',
    marginBottom: 12,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  feedback: { fontSize: 13, color: '#ff6b6b', margin: '4px 0 10px' },
  saveButton: {
    backgroundColor: '#c9a227',
    color: '#000',
    border: 'none',
    padding: 14,
    borderRadius: 10,
    width: '100%',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
  },
};
