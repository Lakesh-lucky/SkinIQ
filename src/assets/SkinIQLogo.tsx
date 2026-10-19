import React from 'react';

interface SkinIQLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'splash';
  darkBackground?: boolean;
  size?: number;
  className?: string;
}

/**
 * SkinIQ — Smarter Skin Insights
 * Professional Skincare AI Logo
 * 
 * Motif:
 * - A refined dermal cellular shield / droplet contour representing skin health & protection.
 * - An integrated intelligent neural nexus: three precision nodes connected by fine precision arcs.
 * - Balanced, medical-grade geometry with clean optical alignment.
 */
export const SkinIQLogo: React.FC<SkinIQLogoProps> = ({
  variant = 'compact',
  darkBackground = false,
  size = 36,
  className = ''
}) => {
  const textColor = darkBackground ? '#ffffff' : '#0f172a';
  const subtextColor = darkBackground ? 'rgba(255,255,255,0.72)' : '#64748b';
  const tealPrimary = '#0d9488'; // Refined clinical teal
  const tealDark = '#0f766e';
  const aquaAccent = '#06b6d4'; // Soft modern aqua

  const Emblem = ({ iconSize }: { iconSize: number }) => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        {/* Soft, clinical teal-to-aqua gradient */}
        <linearGradient id="skiniq-emblem-grad" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor={tealDark} />
          <stop offset="60%" stopColor={tealPrimary} />
          <stop offset="100%" stopColor={aquaAccent} />
        </linearGradient>

        <linearGradient id="skiniq-glow-arc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect width="48" height="48" rx="12" fill="url(#skiniq-emblem-grad)" />

      {/* Dermal Shield / Petal Contour */}
      <path
        d="M24 10C24 10 33 16.5 33 24.5C33 29.8 29 34 24 37C19 34 15 29.8 15 24.5C15 16.5 24 10 24 10Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Precision Neural / Dermoscopic Diagnostic Synapse */}
      <path
        d="M24 17L20 23L27 27L24 33"
        stroke="url(#skiniq-glow-arc)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Diagnostic Aperture Interconnect Line */}
      <path
        d="M20 23L28 21"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.2"
        strokeDasharray="1.5 2"
        strokeLinecap="round"
      />

      {/* Intelligent AI Nodes */}
      {/* Top Node (Cellular apex) */}
      <circle cx="24" cy="17" r="2.2" fill="#ffffff" />
      <circle cx="24" cy="17" r="1.1" fill={tealPrimary} />

      {/* Left Node */}
      <circle cx="20" cy="23" r="2" fill="#ffffff" />

      {/* Right Node */}
      <circle cx="28" cy="21" r="1.8" fill="#ffffff" />

      {/* Center Synthesis Node */}
      <circle cx="27" cy="27" r="2.2" fill="#ffffff" />
      <circle cx="27" cy="27" r="1.1" fill={tealPrimary} />

      {/* Base Anchor Node */}
      <circle cx="24" cy="33" r="1.8" fill="#ffffff" />
    </svg>
  );

  // Variant: Icon only
  if (variant === 'icon') {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Emblem iconSize={size} />
      </div>
    );
  }

  // Variant: Splash Screen Hero (Centered, prominent)
  if (variant === 'splash') {
    const splashSize = size || 64;
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <Emblem iconSize={splashSize} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: `${Math.round(splashSize * 0.65)}px`,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: textColor,
          }}>
            Skin<span style={{ color: tealPrimary }}>IQ</span>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: `${Math.max(11, Math.round(splashSize * 0.22))}px`,
            fontWeight: 600,
            color: subtextColor,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}>
            Smarter Skin Insights
          </div>
        </div>
      </div>
    );
  }

  // Variant: Full (Icon + Wordmark + Tagline)
  if (variant === 'full') {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
        <Emblem iconSize={size} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: `${Math.round(size * 0.54)}px`,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: textColor,
          }}>
            Skin<span style={{ color: tealPrimary }}>IQ</span>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: `${Math.max(10, Math.round(size * 0.26))}px`,
            fontWeight: 600,
            color: subtextColor,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Smarter Skin Insights
          </div>
        </div>
      </div>
    );
  }

  // Variant: Compact (Default for header & sidebar: Icon + Wordmark)
  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <Emblem iconSize={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: `${Math.round(size * 0.52)}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: textColor,
          whiteSpace: 'nowrap',
        }}>
          Skin<span style={{ color: tealPrimary }}>IQ</span>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: `${Math.max(9, Math.round(size * 0.24))}px`,
          fontWeight: 600,
          color: subtextColor,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Smarter Skin Insights
        </div>
      </div>
    </div>
  );
};

export default SkinIQLogo;
