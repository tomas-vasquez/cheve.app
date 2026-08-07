import React from 'react';

const TONES = {
  info: { border: 'rgba(201,162,39,0.65)', dot: '#c9a227' },
  success: { border: 'rgba(126,231,135,0.65)', dot: '#7ee787' },
  error: { border: 'rgba(255,107,107,0.65)', dot: '#ff6b6b' },
};

export default function Toast({ toasts, onDismiss }) {
  return (
    <div style={styles.wrapper}>
      {toasts.map((t) => {
        const tone = TONES[t.tone] || TONES.info;
        return (
          <div
            key={t.id}
            className="toast-in"
            onClick={() => {
              if (t.onClick) t.onClick();
              onDismiss(t.id);
            }}
            style={{ ...styles.toast, borderColor: tone.border }}
            role="alert"
          >
            <span style={{ ...styles.dot, background: tone.dot }} />
            <span style={styles.message}>{t.message}</span>
            <button
              aria-label="Cerrar"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(t.id);
              }}
              style={styles.close}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: 'calc(100% - 32px)',
    maxWidth: 400,
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(20,20,22,0.95)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(201,162,39,0.65)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  message: { flex: 1, lineHeight: 1.35 },
  close: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#cfcfcf',
    width: 22,
    height: 22,
    borderRadius: 6,
    cursor: 'pointer',
  },
};
