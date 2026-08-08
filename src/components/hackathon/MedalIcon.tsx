import { useId } from 'react';

// Same shiny-2D-medallion treatment as CoinIcon, tier-colored and with a
// ribbon so it reads as a medal rather than a second coin. Gradient id is
// per-instance (useId) for the same reason as CoinIcon — this renders many
// at once (leaderboard rows, badge tallies).
const TIER: Record<'gold' | 'silver' | 'bronze', { light: string; mid: string; dark: string; ribbon: string }> = {
  gold: { light: '#FFF6C8', mid: '#FFD700', dark: '#B8860B', ribbon: '#C70110' },
  silver: { light: '#F7F7F7', mid: '#C0C0C0', dark: '#8C8C8C', ribbon: '#5865F2' },
  bronze: { light: '#F0C89A', mid: '#CD7F32', dark: '#8B5A2B', ribbon: '#006600' },
};

export const MedalIcon = ({ tier, size = 16, className = '' }: { tier: 'gold' | 'silver' | 'bronze'; size?: number; className?: string }) => {
  const gradId = `medal-face-${useId()}`;
  const c = TIER[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="45%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
      </defs>
      <path d="M8 2 L11 11 L6 11 Z" fill={c.ribbon} opacity="0.9" />
      <path d="M16 2 L18 11 L13 11 Z" fill={c.ribbon} opacity="0.75" />
      <circle cx="12" cy="14.5" r="8" fill={c.dark} />
      <circle cx="12" cy="13.5" r="8" fill={`url(#${gradId})`} stroke={c.dark} strokeWidth="1" />
      <circle cx="12" cy="13.5" r="5.6" fill="none" stroke={c.light} strokeWidth="0.6" opacity="0.6" />
      <ellipse cx="9.3" cy="10.8" rx="2.6" ry="1.4" fill="#FFFFFF" opacity="0.5" transform="rotate(-25 9.3 10.8)" />
      <path d="M12 11l0.8 1.7 1.9.25-1.35 1.3.35 1.85-1.7-.9-1.7.9.35-1.85-1.35-1.3 1.9-.25z" fill={c.dark} opacity="0.7" />
    </svg>
  );
};
