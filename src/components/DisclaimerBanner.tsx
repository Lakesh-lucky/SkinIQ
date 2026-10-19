import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  compact = false,
  className = '',
  style
}) => {
  return (
    <div
      className={`medical-disclaimer ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #059669',
        borderRadius: 'var(--radius-md)',
        padding: compact ? '8px 14px' : '12px 18px',
        fontSize: compact ? '0.78rem' : '0.84rem',
        boxShadow: 'var(--shadow-sm)',
        ...style
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <ShieldAlert size={16} color="#059669" />
      </div>
      <div style={{ flex: 1, color: '#1f2937' }}>
        <span style={{ fontWeight: 700, color: '#000000' }}>
          Clinical Decision Support & Research Prototype:
        </span>{' '}
        <span style={{ color: '#4b5563' }}>
          DermaClass-Net predictions, feature activations, and Grad-CAM maps are assistive decision-support tools. They do NOT constitute a definitive medical diagnosis. Final assessment must be made by a qualified healthcare professional.
        </span>
      </div>
    </div>
  );
};
