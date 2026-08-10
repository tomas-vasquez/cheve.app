import React from 'react';

export default function ProductImage({ src, alt = '', style, imgStyle, glyphColor = '#D9D9D9' }) {
  return (
    <div style={{ ...styles.wrap, ...style }}>
      {src ? (
        <img src={src} alt={alt} style={{ ...styles.img, ...imgStyle }} />
      ) : (
        <div style={styles.placeholder} role="img" aria-label={alt}>
          <svg
            width="84"
            height="84"
            viewBox="0 0 24 24"
            fill="none"
            stroke={glyphColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
            <path d="m3 8 9 5 9-5" />
            <path d="M12 13v8" />
          </svg>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
};
