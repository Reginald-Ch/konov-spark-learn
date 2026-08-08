import { useId } from 'react';

// A small hand-drawn 2D coin (radial-gradient face, embossed rim, glossy
// highlight, drop-shadow edge) standing in for the flat lucide `Coins`
// icon and the 🪙 emoji everywhere Forge Coins are shown. The gradient id
// is per-instance (useId) since this renders many-at-once in lists like
// CoinsTab — a shared literal id would make every coin after the first
// reference the wrong (or missing) gradient in the DOM.
export const CoinIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => {
  const gradId = `coin-face-${useId()}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#FFF3C4" />
          <stop offset="45%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D98E04" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="13" r="9.5" fill="#A66B08" />
      <circle cx="12" cy="11.5" r="9.5" fill={`url(#${gradId})`} stroke="#B8790A" strokeWidth="1" />
      <circle cx="12" cy="11.5" r="7" fill="none" stroke="#F7941D" strokeWidth="0.75" opacity="0.55" />
      <ellipse cx="9" cy="8" rx="3.2" ry="1.8" fill="#FFFFFF" opacity="0.55" transform="rotate(-25 9 8)" />
      <path d="M12 8.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#A66B08" opacity="0.75" />
    </svg>
  );
};
