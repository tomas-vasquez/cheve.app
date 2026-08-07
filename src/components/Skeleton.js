import React from 'react';

export default function Skeleton({ width = '100%', height = 14, borderRadius = 8, style }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}
