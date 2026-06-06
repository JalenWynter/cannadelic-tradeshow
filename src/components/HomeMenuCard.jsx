import React from 'react';
import { COLOMBIA_RETREAT_HERO_IMAGE } from '../colombiaRetreatMedia.js';

/**
 * Touch-friendly home menu card — matches Cannadelic night market reference layout.
 * Swap iconSrc PNG/SVG files in public/icons/ when brand art is ready.
 */
export function HomeMenuCard({
  variant = 'glass',
  title,
  subtitle,
  iconSrc,
  iconRightSrc = null,
  iconAlt = '',
  badge = null,
  onClick,
  children,
  className = '',
  textAlign = 'left',
  attentionIndex = null,
}) {
  const spotlightStyle = attentionIndex != null ? { '--attn': attentionIndex } : undefined;
  const dualIcon = Boolean(iconSrc && iconRightSrc);

  return (
    <button
      type="button"
      className={[
        'home-menu-card',
        `home-menu-card--${variant}`,
        attentionIndex != null ? 'home-menu-card--spotlight' : '',
        dualIcon ? 'home-menu-card--dual-icon' : '',
        badge ? 'home-menu-card--has-badge' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={spotlightStyle}
      onClick={onClick}
    >
      {iconSrc ? (
        <span className="home-menu-card__icon-wrap" aria-hidden="true">
          <img src={iconSrc} alt={iconAlt} className="home-menu-card__icon" draggable={false} />
        </span>
      ) : null}
      <span className={`home-menu-card__text home-menu-card__text--${textAlign}`}>
        {badge ? <span className="home-menu-card__popcorn-badge">{badge}</span> : null}
        {children}
        <span className="home-menu-card__title">{title}</span>
        {subtitle ? <span className="home-menu-card__subtitle">{subtitle}</span> : null}
      </span>
      {iconRightSrc ? (
        <span className="home-menu-card__icon-wrap home-menu-card__icon-wrap--right" aria-hidden="true">
          <img src={iconRightSrc} alt="" className="home-menu-card__icon" draggable={false} />
        </span>
      ) : null}
    </button>
  );
}

export function HomeMenuRow({ children, columns = 2 }) {
  return (
    <div className="home-menu__row" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {children}
    </div>
  );
}

export function HomeRetreatCard({
  onClick,
  children,
  attentionIndex = null,
  imageUrl = COLOMBIA_RETREAT_HERO_IMAGE,
}) {
  const spotlightStyle = attentionIndex != null ? { '--attn': attentionIndex } : undefined;

  const activate = (e) => {
    if (e?.target?.closest?.('[data-retreat-nested]')) return;
    onClick?.(e);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`home-menu-card home-menu-card--retreat${attentionIndex != null ? ' home-menu-card--spotlight' : ''}`}
      style={spotlightStyle}
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <span className="home-retreat-card__photo" aria-hidden="true">
        <span
          className="home-retreat-card__photo-img"
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
        <span className="home-retreat-card__photo-edge home-retreat-card__photo-edge--left" />
        <span className="home-retreat-card__photo-edge home-retreat-card__photo-edge--right" />
      </span>
      <span className="home-menu-card__text home-menu-card__text--center home-retreat-card__content">
        {children}
      </span>
    </div>
  );
}
