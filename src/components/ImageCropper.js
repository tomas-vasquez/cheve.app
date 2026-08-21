import React, { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';

const OUTPUT_SIZE = 512;
const QUALITY = 0.8;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cropImage(src, area) {
  return new Promise(async (resolve, reject) => {
    try {
      const image = await loadImage(src);
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );
      const toBlob = (type) =>
        new Promise((res) => canvas.toBlob(res, type, QUALITY));
      let blob = await toBlob('image/webp');
      if (!blob) blob = await toBlob('image/jpeg');
      resolve(blob);
    } catch (err) {
      reject(err);
    }
  });
}

export default function ImageCropper({ imageSrc, onCancel, onComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const apply = async () => {
    if (!area || processing) return;
    setProcessing(true);
    try {
      const blob = await cropImage(imageSrc, area);
      const ext = (blob.type === 'image/jpeg' ? 'jpg' : 'webp');
      const file = new File([blob], `product-${Date.now()}.${ext}`, {
        type: blob.type,
      });
      onComplete(file);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Recortar imagen">
        <h3 style={styles.title}>Ajustar imagen</h3>
        <p style={styles.hint}>Arrastra y usa el zoom para recortar en formato cuadrado (1:1)</p>

        <div style={styles.cropWrap}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_croppedArea, croppedAreaPixels) => setArea(croppedAreaPixels)}
          />
        </div>

        <div style={styles.zoomRow}>
          <span style={styles.zoomLabel}>Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={styles.range}
            aria-label="Zoom de recorte"
          />
          <span style={styles.zoomValue}>{zoom.toFixed(1)}×</span>
        </div>

        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onCancel} disabled={processing}>
            Cancelar
          </button>
          <button style={styles.applyButton} onClick={apply} disabled={processing || !area}>
            {processing ? 'Procesando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 20,
    background: 'rgba(18,18,18,0.98)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  title: { fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#fff' },
  hint: { fontSize: 12, color: '#8a8a8a', margin: '0 0 16px' },
  cropWrap: {
    position: 'relative',
    height: 260,
    marginBottom: 14,
    borderRadius: 500,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
  },
  zoomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  zoomLabel: { fontSize: 13, color: '#cfcfcf', flexShrink: 0 },
  range: { flex: 1, accentColor: '#1DB954' },
  zoomValue: { fontSize: 12, color: '#1DB954', fontWeight: 700, flexShrink: 0, minWidth: 40, textAlign: 'right' },
  actions: { display: 'flex', gap: 10 },
  cancelButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    cursor: 'pointer',
    padding: 13,
    borderRadius: 500,
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
  },
  applyButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: 13,
    borderRadius: 500,
    flex: 1,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};
