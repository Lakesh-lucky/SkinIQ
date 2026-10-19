import React, { useEffect, useState } from 'react';
import { SkinIQLogo } from '../assets/SkinIQLogo';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Activity, 
  Lock, 
  CheckCircle2 
} from 'lucide-react';

interface SplashScreenViewProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

/**
 * SkinIQ — Smarter Skin Insights
 * Refined Skincare & Clinical AI Splash Screen / Landing Page
 * Palette: Soft Teal, Aqua, Clean White, Deep Navy, Subtle Blue Accents
 */
export const SplashScreenView: React.FC<SplashScreenViewProps> = ({ onSignIn, onGetStarted }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const capabilities = [
    {
      icon: <Layers size={22} className="feature-icon" />,
      title: 'Multi-Modal Dual-Backbone AI',
      desc: 'Ensemble deep learning evaluates dermoscopic imagery and patient clinical metadata with integrated epistemic uncertainty estimation.'
    },
    {
      icon: <Activity size={22} className="feature-icon" />,
      title: 'Explainable Grad-CAM Telemetry',
      desc: 'High-resolution gradient heatmaps visually isolate the exact morphological lesion boundaries that influenced algorithmic classification.'
    },
    {
      icon: <ShieldCheck size={22} className="feature-icon" />,
      title: 'Compliant Decision Support',
      desc: 'Structured clinical workflows with automated physician report generation, encrypted audit logs, and HIPAA-aligned security protocols.'
    }
  ];

  const metrics = [
    { value: 'Dual-Engine', label: 'ResNet-18 & DERMAClass-Net' },
    { value: '8 Diagnostic', label: 'ISIC Lesion Classes' },
    { value: '< 30ms', label: 'Local Inference Speed' },
    { value: 'Calibrated', label: 'Epistemic Uncertainty' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>

      {/* Subtle Ambient Radial Backdrops (Soft Teal & Aqua) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          maxWidth: '800px',
          maxHeight: '800px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(6, 182, 212, 0.04) 45%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '50vw',
          height: '50vw',
          maxWidth: '700px',
          maxHeight: '700px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, rgba(13, 148, 136, 0.03) 50%, transparent 70%)',
          borderRadius: '50%'
        }} />
      </div>

      {/* ==================== 1. TOP HEADER NAVIGATION ==================== */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 5vw, 64px)',
        height: '66px',
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        boxSizing: 'border-box'
      }}>
        <SkinIQLogo variant="compact" size={34} />

        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="splash-signin-btn"
            onClick={onSignIn}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0d9488';
              e.currentTarget.style.color = '#0d9488';
              e.currentTarget.style.backgroundColor = '#f0fdfa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            Sign In
          </button>

          <button
            id="splash-getstarted-btn"
            onClick={onGetStarted}
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(13, 148, 136, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.25)';
            }}
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* ==================== 2. HERO SECTION ==================== */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '56px clamp(16px, 5vw, 64px) 48px',
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '48px',
        alignItems: 'center'
      }}>
        {/* Left: Text Content */}
        <div style={{
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f0fdfa',
            border: '1px solid #ccfbf1',
            borderRadius: '20px',
            padding: '5px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0f766e',
            letterSpacing: '0.04em',
            marginBottom: '20px'
          }}>
            <Sparkles size={14} color="#0d9488" />
            AI-POWERED DERMATOLOGY DECISION SUPPORT
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(2.3rem, 4.5vw, 3.4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#0f172a',
            margin: '0 0 18px'
          }}>
            Intelligent Skin Insights for Clinical Precision.
          </h1>

          <p style={{
            fontSize: 'clamp(0.98rem, 1.8vw, 1.12rem)',
            color: '#475569',
            lineHeight: 1.65,
            margin: '0 0 32px',
            maxWidth: '540px'
          }}>
            SkinIQ brings together multi-model deep learning, epistemic uncertainty quantification, 
            and explainable Grad-CAM heatmaps to provide dermatologists with transparent decision support at the point of care.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button
              onClick={onGetStarted}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '13px 26px',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.96rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(13, 148, 136, 0.28)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(13, 148, 136, 0.38)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(13, 148, 136, 0.28)';
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={17} />
            </button>

            <button
              onClick={onSignIn}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                padding: '13px 24px',
                borderRadius: '10px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.96rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0d9488';
                e.currentTarget.style.color = '#0d9488';
                e.currentTarget.style.backgroundColor = '#f0fdfa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#1e293b';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              Sign In to Clinic Workspace
            </button>
          </div>

          {/* Metrics Pill Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '14px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '24px'
          }}>
            {metrics.map(m => (
              <div key={m.label}>
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f766e',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1
                }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Refined Skincare & AI Dermal Aperture Visual */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '440px',
            aspectRatio: '1',
            borderRadius: '28px',
            background: 'linear-gradient(145deg, #ffffff 0%, #f0fdfa 100%)',
            border: '1px solid #ccfbf1',
            boxShadow: '0 20px 45px -12px rgba(13, 148, 136, 0.12), 0 0 25px rgba(6, 182, 212, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            {/* Concentric Dermoscopic Aperture Rings */}
            <div style={{
              position: 'relative',
              width: '260px',
              height: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Outer Ring with subtle rotation */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1.5px dashed rgba(13, 148, 136, 0.25)',
                animation: 'spinAperture 30s linear infinite'
              }} />

              {/* Middle Ring */}
              <div style={{
                position: 'absolute',
                inset: '24px',
                borderRadius: '50%',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                background: 'rgba(255, 255, 255, 0.65)'
              }} />

              {/* Core Diagnostic Shield / Logo */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <SkinIQLogo variant="icon" size={68} />
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: '10px'
                }}>
                  Skin<span style={{ color: '#0d9488' }}>IQ</span>
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#0f766e',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}>
                  Dermal Telemetry Active
                </div>
              </div>

              {/* Floating Status Pill 1 */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '-10px',
                background: '#ffffff',
                border: '1px solid #ccfbf1',
                padding: '6px 12px',
                borderRadius: '20px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f766e',
                zIndex: 3
              }}>
                <CheckCircle2 size={13} color="#0d9488" />
                <span>ResNet-18 Consensus: 98.4%</span>
              </div>

              {/* Floating Status Pill 2 */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '-10px',
                background: '#ffffff',
                border: '1px solid #ccfbf1',
                padding: '6px 12px',
                borderRadius: '20px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0369a1',
                zIndex: 3
              }}>
                <Sparkles size={13} color="#0284c7" />
                <span>Grad-CAM Interpretability Active</span>
              </div>
            </div>

            {/* Subtext info */}
            <div style={{
              marginTop: '20px',
              fontSize: '0.74rem',
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              Calibrated multi-model consensus architecture with real-time epistemic uncertainty scoring.
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. CLINICAL CAPABILITIES ==================== */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        padding: '64px clamp(16px, 5vw, 64px)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0f766e',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '12px'
            }}>
              Clinical Workflow
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 10px',
              letterSpacing: '-0.02em'
            }}>
              Engineered for Dermatological Practice
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>
              Rigorous AI evaluation tools built to support healthcare professionals at every diagnostic step.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {capabilities.map(cap => (
              <div 
                key={cap.title}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#0d9488';
                  e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(13, 148, 136, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}>
                  {cap.icon}
                </div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px'
                }}>
                  {cap.title}
                </h3>
                <p style={{
                  fontSize: '0.88rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 4. CALL TO ACTION ==================== */}
      <section style={{
        padding: '64px clamp(16px, 5vw, 64px)',
        maxWidth: '880px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '24px',
          padding: '44px clamp(24px, 5vw, 48px)',
          textAlign: 'center',
          boxShadow: '0 16px 36px -12px rgba(13, 148, 136, 0.12)'
        }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
            fontWeight: 800,
            color: '#0f766e',
            margin: '0 0 12px',
            letterSpacing: '-0.02em'
          }}>
            Ready to enhance your dermatologic workflow?
          </h2>
          <p style={{
            fontSize: '0.96rem',
            color: '#334155',
            maxWidth: '520px',
            margin: '0 auto 28px',
            lineHeight: 1.6
          }}>
            Join certified clinicians utilizing SkinIQ decision support for rapid, explainable, and multi-model skin lesion evaluation.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onGetStarted}
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.94rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.28)'
              }}
            >
              Register Clinician Account
            </button>
            <button
              onClick={onSignIn}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.94rem',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 5. FOOTER & MANDATORY DISCLAIMER ==================== */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '24px clamp(16px, 5vw, 64px)'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <SkinIQLogo variant="compact" size={28} />

          {/* Prominent Medical Notice */}
          <div style={{
            fontSize: '0.78rem',
            color: '#64748b',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: '620px'
          }}>
            <strong>Notice:</strong> AI-generated decision support. Final diagnosis must be made by a qualified healthcare professional.
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            © {new Date().getFullYear()} SkinIQ • All rights reserved
          </div>
        </div>
      </footer>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes spinAperture {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreenView;
