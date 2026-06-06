import React from 'react';

const BRAND = 'GŪDESSENCE';

/** Letter wave — keyframes in home-animations.css (static, works in Electron) */
export function AnimatedBrandTitle() {
  const letters = BRAND.split('');

  return (
    <h1 className="neon-text-lime home-header__brand home-header__brand--animated" aria-label={BRAND}>
      {letters.map((char, i) => (
        <span key={`${char}-${i}`} className={`brand-letter brand-letter-${i}`}>
          {char}
        </span>
      ))}
    </h1>
  );
}
