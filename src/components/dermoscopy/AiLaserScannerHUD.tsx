import React, { useEffect, useState } from 'react';
import { Scan, ShieldAlert, Cpu, Activity, CheckCircle } from 'lucide-react';

interface AiLaserScannerHUDProps {
  isAnalyzing: boolean;
  imageUrl?: string | null;
  progressStep?: string;
}

export const AiLaserScannerHUD: React.FC<AiLaserScannerHUDProps> = ({
  isAnalyzing,
  imageUrl,
  progressStep = 'Awaiting dermoscopic sample...'
}) => {
  const [scanPosition, setScanPosition] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setScanPosition((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 30);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '1 / 1',
      maxHeight: '380px',
      borderRadius: '16px',
      overflow: 'hidden',
      background: 'radial-gradient(circle at center, #0F172A 0%, #020617 100%)',
      border: '1.5px solid rgba(14, 165, 233, 0.3)',
      boxShadow: '0 8px 32px rgba(2, 6, 23, 0.6), 0 0 24px rgba(14, 165, 233, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Specimen Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Dermoscopic Specimen"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isAnalyzing ? 'contrast(1.1) brightness(0.95)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          color: '#64748B'
        }}>
          <Scan size={48} color="#0EA5E9" style={{ opacity: 0.7 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>No Image Loaded</span>
        </div>
      )}

      {/* Futuristic Reticle Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        border: '1px dashed rgba(14, 165, 233, 0.3)',
        borderRadius: '16px',
        margin: '12px'
      }}>
        {/* Corner Brackets */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '3px solid #0EA5E9', borderLeft: '3px solid #0EA5E9' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '3px solid #0EA5E9', borderRight: '3px solid #0EA5E9' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '3px solid #0EA5E9', borderLeft: '3px solid #0EA5E9' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '3px solid #0EA5E9', borderRight: '3px solid #0EA5E9' }} />
        
        {/* Center Target Crosshair */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0EA5E9', boxShadow: '0 0 8px #0EA5E9' }} />
        </div>
      </div>

      {/* Laser Scanning Beam (when analyzing) */}
      {isAnalyzing && (
        <>
          <div style={{
            position: 'absolute',
            top: `${scanPosition}%`,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, rgba(14,165,233,0) 0%, #0EA5E9 50%, rgba(14,165,233,0) 100%)',
            boxShadow: '0 0 16px 4px rgba(14, 165, 233, 0.75)',
            pointerEvents: 'none',
            zIndex: 10
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: `${100 - scanPosition}%`,
            background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.18) 100%)',
            pointerEvents: 'none',
            zIndex: 9
          }} />
        </>
      )}

      {/* Live AI Status HUD Bar */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        right: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAnalyzing ? (
            <Activity size={16} color="#0EA5E9" style={{ animation: 'spin 1.5s linear infinite' }} />
          ) : (
            <Cpu size={16} color="#10B981" />
          )}
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#E2E8F0', letterSpacing: '0.02em' }}>
            {progressStep}
          </span>
        </div>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px',
          background: isAnalyzing ? 'rgba(14, 165, 233, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          color: isAnalyzing ? '#38BDF8' : '#34D399',
          border: isAnalyzing ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
        }}>
          {isAnalyzing ? 'INFERENCE ACTIVE' : 'RESNET-18 READY'}
        </span>
      </div>
    </div>
  );
};
