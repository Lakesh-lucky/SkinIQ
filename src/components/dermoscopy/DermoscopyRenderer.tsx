import React, { useState, useRef, useEffect } from 'react';
import { LesionClassId } from '../../types';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Crosshair, Sparkles, Eye, Sliders } from 'lucide-react';

export type RenderMode = 'original' | 'gradcam' | 'overlay' | 'segmentation' | 'split';
export type Colormap = 'jet' | 'inferno' | 'turbo' | 'viridis';

interface DermoscopyRendererProps {
  presetKey?: LesionClassId;
  customImageUrl?: string;
  renderMode?: RenderMode;
  colormap?: Colormap;
  overlayOpacity?: number; // 0..1
  zoom?: number;
  showRuler?: boolean;
  showCrosshairs?: boolean;
  edgeFilter?: boolean;
  invertFilter?: boolean;
  onMeasureDistance?: (mm: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DermoscopyRenderer: React.FC<DermoscopyRendererProps> = ({
  presetKey = 'MEL',
  customImageUrl,
  renderMode = 'original',
  colormap = 'jet',
  overlayOpacity = 0.65,
  zoom = 1,
  showRuler = false,
  showCrosshairs = false,
  edgeFilter = false,
  invertFilter = false,
  onMeasureDistance,
  className = '',
  style
}) => {
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0..100
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle split drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (renderMode === 'split') {
      setIsDraggingSplit(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplit && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSplitPos((x / rect.width) * 100);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    if (isDraggingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit]);

  // Handle measurement click
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!showRuler || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isMeasuring || !measurePoints) {
      setMeasurePoints({ x1: x, y1: y, x2: x, y2: y });
      setIsMeasuring(true);
    } else {
      const p = { ...measurePoints, x2: x, y2: y };
      setMeasurePoints(p);
      setIsMeasuring(false);
      const pixelDist = Math.sqrt(Math.pow(p.x2 - p.x1, 2) + Math.pow(p.y2 - p.y1, 2));
      // Calibrate: 500px ~ 15mm
      const mm = (pixelDist / rect.width) * 16;
      if (onMeasureDistance) onMeasureDistance(parseFloat(mm.toFixed(1)));
    }
  };

  // Helper to render procedural dermoscopic lesion graphic based on lesion class
  const renderLesionGraphic = (mode: 'base' | 'gradcam' | 'segmentation') => {
    if (customImageUrl) {
      return (
        <img
          src={customImageUrl}
          alt="Custom Dermoscopic"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: mode === 'gradcam' ? 'hue-rotate(180deg) saturate(200%)' : undefined
          }}
        />
      );
    }

    switch (presetKey) {
      case 'MEL':
        return renderMelanomaSVG(mode, colormap);
      case 'BCC':
        return renderBccSVG(mode, colormap);
      case 'NV':
        return renderNevusSVG(mode, colormap);
      case 'BKL':
        return renderBklSVG(mode, colormap);
      case 'AK':
        return renderAkSVG(mode, colormap);
      case 'DF':
        return renderDfSVG(mode, colormap);
      case 'VASC':
        return renderVascSVG(mode, colormap);
      case 'SCC':
      default:
        return renderSccSVG(mode, colormap);
    }
  };

  const getColormapGradient = () => {
    switch (colormap) {
      case 'inferno':
        return ['#000004', '#57106e', '#bb3754', '#f98e09', '#fcffa4'];
      case 'turbo':
        return ['#30123b', '#28bbec', '#a2fc3c', '#fb8022', '#7a0403'];
      case 'viridis':
        return ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
      case 'jet':
      default:
        return ['#0000ff', '#00e5ff', '#00ff66', '#ffff00', '#ff0000'];
    }
  };

  return (
    <div
      ref={containerRef}
      className={`dermoscopy-viewport ${className}`}
      onClick={handleContainerClick}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        maxWidth: '560px',
        margin: '0 auto',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: '#040711',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.5)',
        border: '1px solid var(--border-cyan)',
        cursor: showRuler ? 'crosshair' : renderMode === 'split' ? 'ew-resize' : 'default',
        ...style
      }}
    >
      {/* Zoom / Filter wrapper */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: `${edgeFilter ? 'contrast(180%) brightness(110%)' : ''} ${invertFilter ? 'invert(100%)' : ''}`
        }}
      >
        {/* Layer 1: Original Image / Mode */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {renderMode === 'gradcam' ? (
            renderLesionGraphic('gradcam')
          ) : renderMode === 'segmentation' ? (
            <>
              {renderLesionGraphic('base')}
              {renderLesionGraphic('segmentation')}
            </>
          ) : (
            renderLesionGraphic('base')
          )}
        </div>

        {/* Layer 2: Overlay Mode (Semi-transparent Grad-CAM) */}
        {renderMode === 'overlay' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: overlayOpacity,
              mixBlendMode: 'screen',
              pointerEvents: 'none'
            }}
          >
            {renderLesionGraphic('gradcam')}
          </div>
        )}

        {/* Layer 3: Split Mode */}
        {renderMode === 'split' && (
          <>
            {/* Left side: Original Image */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
                pointerEvents: 'none'
              }}
            >
              {renderLesionGraphic('base')}
            </div>

            {/* Right side: Grad-CAM Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
                pointerEvents: 'none'
              }}
            >
              {renderLesionGraphic('base')}
              <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.85 }}>
                {renderLesionGraphic('gradcam')}
              </div>
              {renderLesionGraphic('segmentation')}
            </div>

            {/* Draggable Divider Line */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${splitPos}%`,
                width: '3px',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(to bottom, #00e5ff, #8b5cf6, #00e5ff)',
                boxShadow: '0 0 12px rgba(0, 229, 255, 0.9)',
                cursor: 'ew-resize',
                zIndex: 10
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0a1120',
                  border: '2px solid #00e5ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.7)'
                }}
              >
                <Sliders size={14} color="#00e5ff" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Optical Dermoscopy Bezel & Polarized Reticle Ring Overlay */}
      <svg
        viewBox="0 0 500 500"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        <defs>
          <radialGradient id="lensVignette" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="92%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="rgba(3,7,18,0.95)" />
          </radialGradient>
        </defs>
        {/* Vignette mask */}
        <circle cx="250" cy="250" r="250" fill="url(#lensVignette)" />
        {/* Lens outer measurement ring */}
        <circle cx="250" cy="250" r="242" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="1.5" />
        <circle cx="250" cy="250" r="236" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" strokeDasharray="3, 8" />

        {/* Crosshair grids if enabled */}
        {showCrosshairs && (
          <g stroke="rgba(0, 229, 255, 0.35)" strokeWidth="1" strokeDasharray="4, 4">
            <line x1="250" y1="20" x2="250" y2="480" />
            <line x1="20" y1="250" x2="480" y2="250" />
            <circle cx="250" cy="250" r="60" fill="none" />
            <circle cx="250" cy="250" r="140" fill="none" />
          </g>
        )}

        {/* Millimeter calibration scale in bottom-right */}
        <g transform="translate(370, 460)">
          <rect x="-6" y="-14" width="94" height="20" rx="4" fill="rgba(6,11,24,0.85)" stroke="rgba(0,229,255,0.3)" />
          <line x1="0" y1="0" x2="80" y2="0" stroke="#00e5ff" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#00e5ff" strokeWidth="2" />
          <line x1="40" y1="-3" x2="40" y2="3" stroke="#00e5ff" strokeWidth="1.5" />
          <line x1="80" y1="-5" x2="80" y2="5" stroke="#00e5ff" strokeWidth="2" />
          <text x="40" y="-3" fill="#00e5ff" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
            5.0 mm
          </text>
        </g>
      </svg>

      {/* Measurement line overlay */}
      {measurePoints && showRuler && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 15
          }}
        >
          <line
            x1={measurePoints.x1}
            y1={measurePoints.y1}
            x2={measurePoints.x2}
            y2={measurePoints.y2}
            stroke="#ff0055"
            strokeWidth="2.5"
            strokeDasharray="4,2"
          />
          <circle cx={measurePoints.x1} cy={measurePoints.y1} r="4" fill="#ff0055" />
          <circle cx={measurePoints.x2} cy={measurePoints.y2} r="4" fill="#ff0055" />
        </svg>
      )}

      {/* Mode Tag */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 8,
          background: 'rgba(6, 11, 24, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-light)',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: 'var(--cyan-300)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span className="status-dot" style={{ width: '6px', height: '6px' }} />
        {renderMode.toUpperCase()} VIEW • 10× CONTACT
      </div>
    </div>
  );
};

// ==========================================
// PROCEDURAL LESION SVG RENDERERS (8 CLASSES)
// ==========================================

function renderMelanomaSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="gradcamMel" cx="44%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#ff0022" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ff9900" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#00e5ff" stopOpacity="0.6" />
            <stop offset="90%" stopColor="#05103a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="500" height="500" fill="#060b18" />
        <ellipse cx="225" cy="240" rx="140" ry="120" fill="url(#gradcamMel)" />
        {/* Hotspot satellite */}
        <circle cx="200" cy="220" r="45" fill="#ffffff" opacity="0.4" filter="blur(8px)" />
      </svg>
    );
  }

  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path
          d="M 170 160 Q 230 130 310 170 Q 360 210 350 280 Q 330 340 260 360 Q 180 370 140 310 Q 120 230 170 160 Z"
          fill="rgba(0, 229, 255, 0.12)"
          stroke="#00e5ff"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />
        <circle cx="225" cy="240" r="4" fill="#00e5ff" />
        <text x="235" y="243" fill="#00e5ff" fontSize="10" fontFamily="var(--font-mono)">
          Centroid (0.44, 0.48)
        </text>
      </svg>
    );
  }

  // Base dermoscopy texture: Melanoma (Dark, asymmetric, atypical pigment network, blue-white veil)
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="skinBgMel" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9a882" />
          <stop offset="85%" stopColor="#c5916d" />
          <stop offset="100%" stopColor="#a37050" />
        </radialGradient>
        <radialGradient id="melCore" cx="42%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1a0b06" />
          <stop offset="40%" stopColor="#3d1e10" />
          <stop offset="70%" stopColor="#6e3d22" />
          <stop offset="95%" stopColor="#9c6644" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="veilGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Healthy Epidermal Base */}
      <rect width="500" height="500" fill="url(#skinBgMel)" />

      {/* Skin micro-texture & pores */}
      <g opacity="0.15" stroke="#754728" strokeWidth="0.5">
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={(i * 37) % 500} cy={(i * 61) % 500} r={1.5} fill="#693c1e" />
        ))}
      </g>

      {/* Asymmetric Malignant Melanoma Mass */}
      <path
        d="M 170 160 Q 230 130 310 170 Q 360 210 350 280 Q 330 340 260 360 Q 180 370 140 310 Q 120 230 170 160 Z"
        fill="url(#melCore)"
      />

      {/* Atypical Reticular Pigment Network (Mesh lines) */}
      <g stroke="#261007" strokeWidth="1.2" opacity="0.75" fill="none">
        <path d="M 160 200 Q 240 210 320 200 M 150 240 Q 230 250 340 240 M 160 280 Q 240 290 320 280" />
        <path d="M 200 160 Q 210 240 200 330 M 240 150 Q 250 240 240 350 M 280 165 Q 290 245 280 330" />
      </g>

      {/* Blue-White Veil (Pathognomonic indicator) */}
      <ellipse cx="205" cy="225" rx="42" ry="32" fill="#7ba2c7" opacity="0.45" filter="url(#veilGlow)" />

      {/* Irregular Peripheral Brown-Black Globules */}
      <circle cx="150" cy="180" r="5" fill="#140804" />
      <circle cx="135" cy="245" r="6" fill="#1b0a05" />
      <circle cx="160" cy="330" r="4.5" fill="#140804" />
      <circle cx="330" cy="190" r="5" fill="#200d07" />
      <circle cx="345" cy="270" r="7" fill="#120603" />
      <circle cx="280" cy="350" r="4" fill="#1b0a05" />

      {/* Focal Ulceration / Dark Necrotic Core */}
      <path d="M 210 245 Q 240 235 255 260 Q 240 280 220 275 Z" fill="#080302" />
    </svg>
  );
}

function renderBccSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="gradcamBcc" cx="52%" cy="46%" r="45%">
            <stop offset="0%" stopColor="#ff0022" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ff9900" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#00e5ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="500" height="500" fill="#060b18" />
        <ellipse cx="260" cy="235" rx="120" ry="110" fill="url(#gradcamBcc)" />
      </svg>
    );
  }

  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="255" cy="240" r="95" fill="rgba(0, 229, 255, 0.12)" stroke="#00e5ff" strokeWidth="2.5" strokeDasharray="6,4" />
        <circle cx="255" cy="240" r="4" fill="#00e5ff" />
        <text x="265" y="243" fill="#00e5ff" fontSize="10" fontFamily="var(--font-mono)">Centroid (0.52, 0.46)</text>
      </svg>
    );
  }

  // Base BCC (Pearly pink translucent, arborizing tree-like vessels, blue-grey ovoid nest)
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#e8bfa0" />
      <circle cx="255" cy="240" r="95" fill="#d89688" />
      {/* Shiny translucent core */}
      <circle cx="255" cy="240" r="80" fill="#e8aba0" opacity="0.8" />
      {/* Blue-grey ovoid nests */}
      <ellipse cx="230" cy="215" rx="20" ry="15" fill="#4a5568" opacity="0.75" />
      <ellipse cx="285" cy="265" rx="16" ry="12" fill="#4a5568" opacity="0.65" />
      {/* Arborizing (branching tree-like) Telangiectasias */}
      <g stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M 210 290 Q 230 260 250 240 Q 270 220 295 210" />
        <path d="M 250 240 Q 260 255 275 260" strokeWidth="1.6" />
        <path d="M 230 260 Q 235 280 245 285" strokeWidth="1.4" />
        <path d="M 270 220 Q 285 225 300 230" strokeWidth="1.4" />
      </g>
      {/* Central micro-ulceration */}
      <circle cx="255" cy="235" r="10" fill="#7f1d1d" opacity="0.7" />
    </svg>
  );
}

function renderNevusSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="gradcamNv" cx="50%" cy="50%" r="40%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#2979ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="500" height="500" fill="#060b18" />
        <circle cx="250" cy="250" r="100" fill="url(#gradcamNv)" />
      </svg>
    );
  }

  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="250" cy="250" r="75" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6,4" />
      </svg>
    );
  }

  // Base Nevus: Symmetric, uniform regular reticular network
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#deb896" />
      <circle cx="250" cy="250" r="75" fill="#8c5836" />
      {/* Regular reticular grid */}
      <g stroke="#5c351c" strokeWidth="1" opacity="0.6" fill="none">
        {[-40, -20, 0, 20, 40].map((offset, i) => (
          <React.Fragment key={i}>
            <line x1={200} y1={250 + offset} x2={300} y2={250 + offset} />
            <line x1={250 + offset} y1={200} x2={250 + offset} y2={300} />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}

function renderBklSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <rect width="500" height="500" fill="#060b18" />
        <circle cx="240" cy="260" r="110" fill="#00e5ff" opacity="0.75" filter="blur(20px)" />
      </svg>
    );
  }
  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="240" cy="260" r="105" fill="rgba(45, 212, 191, 0.12)" stroke="#2dd4bf" strokeWidth="2.5" strokeDasharray="6,4" />
      </svg>
    );
  }

  // Base BKL: Cerebriform brain-like ridges, milia-like cysts, comedo crypts
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#d4aa88" />
      <circle cx="240" cy="260" r="105" fill="#784a28" />
      {/* Cerebriform ridges */}
      <g stroke="#4a2810" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M 180 230 Q 210 210 240 230 Q 270 250 300 230" />
        <path d="M 170 270 Q 200 250 230 270 Q 260 290 310 270" />
        <path d="M 190 310 Q 230 290 270 310" />
      </g>
      {/* Milia-like pearly white cysts */}
      <circle cx="210" cy="220" r="4" fill="#ffffff" opacity="0.85" />
      <circle cx="270" cy="245" r="5" fill="#ffffff" opacity="0.85" />
      <circle cx="230" cy="290" r="4" fill="#ffffff" opacity="0.85" />
      {/* Comedo-like dark crypts */}
      <circle cx="200" cy="250" r="4.5" fill="#200d04" />
      <circle cx="280" cy="285" r="5" fill="#200d04" />
    </svg>
  );
}

function renderAkSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <rect width="500" height="500" fill="#060b18" />
        <circle cx="255" cy="245" r="90" fill="#ff9900" opacity="0.8" filter="blur(25px)" />
      </svg>
    );
  }
  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="255" cy="245" r="80" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6,4" />
      </svg>
    );
  }

  // Base AK: Strawberry pattern, erythematous background, keratotic scale
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#e6bca0" />
      <circle cx="255" cy="245" r="85" fill="#e07a7a" opacity="0.8" />
      {/* Follicular openings with white halos (Strawberry pattern) */}
      {[
        [220, 220], [250, 210], [280, 230],
        [210, 250], [250, 250], [290, 260],
        [230, 280], [270, 285]
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#ffffff" opacity="0.6" />
          <circle cx={x} cy={y} r="3" fill="#cf7050" />
        </g>
      ))}
    </svg>
  );
}

function renderDfSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <rect width="500" height="500" fill="#060b18" />
        <circle cx="250" cy="250" r="85" fill="#00e5ff" opacity="0.8" filter="blur(20px)" />
      </svg>
    );
  }
  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="250" cy="250" r="75" fill="rgba(0, 229, 255, 0.12)" stroke="#00e5ff" strokeWidth="2.5" strokeDasharray="6,4" />
      </svg>
    );
  }

  // Base DF: Central white scar-like fibrous patch + delicate brown reticular ring
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#d9ad8c" />
      {/* Peripheral brown ring */}
      <circle cx="250" cy="250" r="75" fill="#8c5836" opacity="0.8" />
      {/* Central white shiny star/patch */}
      <circle cx="250" cy="250" r="32" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

function renderVascSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <rect width="500" height="500" fill="#060b18" />
        <circle cx="250" cy="250" r="80" fill="#8b5cf6" opacity="0.85" filter="blur(20px)" />
      </svg>
    );
  }
  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="250" cy="250" r="70" fill="rgba(139, 92, 246, 0.12)" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" />
      </svg>
    );
  }

  // Base VASC: Red/violaceous round lacunae (blood lagoons)
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#deb896" />
      {/* Clustered lacunae */}
      <circle cx="230" cy="235" r="28" fill="#991b1b" />
      <circle cx="270" cy="240" r="24" fill="#7f1d1d" />
      <circle cx="245" cy="275" r="26" fill="#831843" />
      {/* White fibrous septa dividing lacunae */}
      <circle cx="250" cy="250" r="12" fill="#f8fafc" opacity="0.4" />
    </svg>
  );
}

function renderSccSVG(mode: 'base' | 'gradcam' | 'segmentation', colormap: Colormap) {
  if (mode === 'gradcam') {
    return (
      <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
        <rect width="500" height="500" fill="#060b18" />
        <ellipse cx="235" cy="225" rx="110" ry="100" fill="#f43f5e" opacity="0.85" filter="blur(20px)" />
      </svg>
    );
  }
  if (mode === 'segmentation') {
    return (
      <svg viewBox="0 0 500 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path
          d="M 160 170 Q 240 140 320 180 Q 350 250 330 310 Q 250 350 170 320 Q 130 240 160 170 Z"
          fill="rgba(244, 63, 94, 0.12)"
          stroke="#f43f5e"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />
      </svg>
    );
  }

  // Base SCC: Keratin masses, ulcerated core, hairpin vessels
  return (
    <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }}>
      <rect width="500" height="500" fill="#d9a882" />
      <path
        d="M 160 170 Q 240 140 320 180 Q 350 250 330 310 Q 250 350 170 320 Q 130 240 160 170 Z"
        fill="#c26359"
      />
      {/* Central hyperkeratotic crust */}
      <circle cx="235" cy="225" r="45" fill="#e2d4c0" />
      <circle cx="235" cy="225" r="25" fill="#881337" opacity="0.8" />
    </svg>
  );
}
