import React from 'react';

export default function Splash() {
  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>
        <span style={styles.logoCheve}>Cheve</span>
        <span style={styles.logoApp}>.app</span>
      </h1>
      <div style={styles.loader} aria-label="Cargando">
        <span className="splash-dot" />
        <span className="splash-dot" />
        <span className="splash-dot" />
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 50% 40%, rgba(201,162,39,0.12), transparent 55%), #000',
  },
  logo: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: 1.5,
    margin: 0,
    textAlign: 'center',
  },
  logoCheve: { color: '#c9a227' },
  logoApp: { color: '#fff' },
  loader: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
  },
};
