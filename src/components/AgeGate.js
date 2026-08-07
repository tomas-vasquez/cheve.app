import React from 'react';

const AGE_VERIFIED_KEY = 'age_verified';

export function isAgeVerified() {
  return localStorage.getItem(AGE_VERIFIED_KEY) === 'true';
}

export default function AgeGate({ onVerified }) {
  const handleConfirm = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    onVerified();
  };

  const handleDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Verificación de edad</h1>
        <p style={styles.text}>
          Este sitio vende bebidas alcohólicas. ¿Eres mayor de edad según la ley de tu país?
        </p>
        <button style={styles.buttonYes} onClick={handleConfirm}>
          Sí, soy mayor de edad
        </button>
        <button style={styles.buttonNo} onClick={handleDeny}>
          No
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    background:
      'radial-gradient(circle at 30% 20%, rgba(201,162,39,0.12), transparent 45%), ' +
      'radial-gradient(circle at 75% 80%, rgba(255,255,255,0.05), transparent 50%), #000',
    color: '#fff',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '40px 28px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
  },
  title: { fontSize: 28, marginBottom: 16, letterSpacing: 0.5 },
  text: { fontSize: 16, color: '#cfcfcf', marginBottom: 32, maxWidth: 360, margin: '0 auto 32px', lineHeight: 1.5 },
  buttonYes: {
    backgroundColor: '#c9a227', color: '#000', border: 'none',
    padding: '14px 24px', borderRadius: 10, marginBottom: 12,
    width: '100%', cursor: 'pointer', fontWeight: 700, fontSize: 15,
  },
  buttonNo: {
    backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
    padding: '14px 24px', borderRadius: 10, width: '100%', cursor: 'pointer', fontSize: 15,
  },
};
