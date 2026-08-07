let audioCtx = null;

export function playBeep() {
  try {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    audioCtx = audioCtx || new window.AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // ignorar errores de audio
  }
}

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function canNotify() {
  return notifySupported() && window.Notification.permission === 'granted';
}

export async function requestNotifyPermission() {
  if (!notifySupported()) return 'unsupported';
  const result = await window.Notification.requestPermission();
  return result;
}

export function browserNotify(title, body) {
  if (!canNotify()) return;
  try {
    const n = new window.Notification(title, {
      body,
      icon: `${window.location.origin}/logo192.png`,
      badge: `${window.location.origin}/logo192.png`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    // ignorar errores de notificación
  }
}
