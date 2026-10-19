import React, { useState } from 'react';
import { ClassProbability } from '../types';
import { LESION_CLASSES } from '../data/lesionData';

interface ProbabilityChartProps {
  probabilities: ClassProbability[];
  predictedClassId: string;
  className?: string;
}

export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({
  probabilities,
  predictedClassId,
  className = ''
}) => {
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  // Sort descending by probability
  const sorted = [...probabilities].sort((a, b) => b.probability - a.probability);

  return (
    <div className={`probability-chart-container ${className}`} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            8-Class Probability Distribution
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Softmax output vector from Adaptive Feature Fusion classifier
          </p>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
          ISIC Standard 8-Class
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map((item) => {
          const isTop = item.classId === predictedClassId;
          const isHovered = hoveredClass === item.classId;
          const percentage = (item.probability * 100).toFixed(1);
          const classInfo = LESION_CLASSES[item.classId];
          const classColor = classInfo?.typicalColor || '#059669';

          return (
            <div
              key={item.classId}
              onMouseEnter={() => setHoveredClass(item.classId)}
              onMouseLeave={() => setHoveredClass(null)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isTop 
                  ? `${classColor}10` 
                  : isHovered 
                  ? 'var(--bg-surface-hover)' 
                  : 'var(--bg-surface)',
                border: isTop 
                  ? `1.5px solid ${classColor}` 
                  : '1px solid var(--border-subtle)',
                boxShadow: isTop ? `0 2px 10px ${classColor}25` : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Row Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Color indicator dot */}
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: classColor,
                      boxShadow: isTop ? `0 0 8px ${classColor}` : 'none',
                      flexShrink: 0
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: isTop ? classColor : 'var(--text-primary)'
                    }}
                  >
                    {item.classId}
                  </span>
                  <span
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: isTop ? 700 : 500,
                      color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {item.className}
                  </span>
                  {isTop && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-pill)',
                        background: classColor,
                        color: '#ffffff'
                      }}
                    >
                      Top Predicted
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: isTop ? classColor : 'var(--text-muted)'
                    }}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: isTop ? '8px' : '6px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--border-subtle)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.max(item.probability * 100, 1.5)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${classColor}aa, ${classColor})`,
                    borderRadius: 'var(--radius-pill)',
                    transition: 'width 0.6s ease'
                  }}
                />
              </div>

              {/* Expanded tooltip on hover */}
              {isHovered && classInfo && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    borderTop: '1px dashed var(--border-light)',
                    paddingTop: '6px'
                  }}
                >
                  <span style={{ color: classColor, fontWeight: 700 }}>Dermoscopy markers: </span>
                  {classInfo.dermoscopicFeatures.slice(0, 2).join(' • ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
