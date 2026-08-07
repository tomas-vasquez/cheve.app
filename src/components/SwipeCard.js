import React, { useRef, useState } from 'react';

const TRIGGER = 100;
const MAX_DRAG = 140;

export default function SwipeCard({
  onSwipeRight,
  onSwipeLeft,
  rightLabel = '→ Avanzar',
  leftLabel = '← Cancelar',
  children,
  cardStyle,
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef(null);

  const rightAllowed = typeof onSwipeRight === 'function';
  const leftAllowed = typeof onSwipeLeft === 'function';

  const clamp = (dx) => {
    const maxRight = rightAllowed ? MAX_DRAG : 0;
    const maxLeft = leftAllowed ? MAX_DRAG : 0;
    return Math.max(-maxLeft, Math.min(maxRight, dx));
  };

  const handlePointerDown = (e) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    axisRef.current = null;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (axisRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (axisRef.current !== 'h') return;
    setOffset(clamp(dx));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (axisRef.current === 'h') {
      if (offset > TRIGGER && rightAllowed) onSwipeRight();
      else if (offset < -TRIGGER && leftAllowed) onSwipeLeft();
    }
    setOffset(0);
  };

  const showRight = rightAllowed && offset > 0;
  const showLeft = leftAllowed && offset < 0;

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.bgRight, opacity: showRight ? 1 : 0 }}>
        <span style={styles.bgLabel}>{rightLabel}</span>
      </div>
      <div style={{ ...styles.bgLeft, opacity: showLeft ? 1 : 0 }}>
        <span style={styles.bgLabel}>{leftLabel}</span>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          ...styles.card,
          ...cardStyle,
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    marginBottom: 12,
  },
  bgRight: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    background: 'rgba(126,231,135,0.22)',
    color: '#7ee787',
    transition: 'opacity 0.15s ease',
  },
  bgLeft: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    background: 'rgba(255,107,107,0.22)',
    color: '#ff6b6b',
    transition: 'opacity 0.15s ease',
  },
  bgLabel: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.5,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.09)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'pan-y',
  },
};
