import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (mode === 'recover') {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setError(error.message);
      } else {
        setMessage('Revisa tu correo para restablecer tu contraseña.');
      }
      setSubmitting(false);
      return;
    }

    const action = mode === 'login' ? signIn : signUp;
    const { data, error } = await action(email.trim(), password);

    if (error) {
      setError(error.message);
    } else if (mode === 'register' && !data.session) {
      setMessage('Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.');
    }

    setSubmitting(false);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {mode === 'login'
            ? 'Iniciar sesión'
            : mode === 'register'
              ? 'Crear cuenta'
              : 'Recuperar contraseña'}
        </h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          {mode !== 'recover' && (
            <>
              <label style={styles.label}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                minLength={6}
                required
              />
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.message}>{message}</p>}

          <button type="submit" style={styles.submit} disabled={submitting}>
            {submitting
              ? 'Procesando...'
              : mode === 'login'
                ? 'Entrar'
                : mode === 'register'
                  ? 'Registrarse'
                  : 'Enviar enlace'}
          </button>
        </form>

        {mode === 'login' && (
          <button style={styles.toggle} onClick={() => switchMode('recover')}>
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {mode === 'recover' && (
          <button style={styles.toggle} onClick={() => switchMode('login')}>
            Volver a iniciar sesión
          </button>
        )}

        {mode !== 'recover' && (
          <button
            style={styles.toggle}
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login'
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        )}
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
      'radial-gradient(circle at 25% 15%, rgba(29,185,84,0.15), transparent 45%), ' +
      'radial-gradient(circle at 80% 85%, rgba(255,255,255,0.03), transparent 50%), #121212',
    color: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: '40px 28px',
    borderRadius: 16,
    background: '#181818',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
  },
  title: { fontSize: 26, marginBottom: 24, textAlign: 'center', letterSpacing: 0.5 },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, color: '#B3B3B3', marginBottom: 6 },
  input: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: '#242424',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
  },
  error: { color: '#ff6b6b', fontSize: 13, margin: '0 0 12px' },
  message: { color: '#1DB954', fontSize: 13, margin: '0 0 12px' },
  submit: {
    backgroundColor: '#1DB954', color: '#000', border: 'none',
    padding: '14px 24px', borderRadius: 500, marginTop: 4,
    cursor: 'pointer', fontWeight: 700, fontSize: 15,
    transition: 'transform 0.1s ease, background-color 0.2s ease',
  },
  toggle: {
    marginTop: 16, background: 'none', border: 'none',
    color: '#B3B3B3', fontSize: 13, cursor: 'pointer',
    width: '100%', textDecoration: 'underline',
  },
};
