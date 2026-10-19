import React, { useEffect } from 'react';
import { X, ShieldAlert, BookOpen, Keyboard, HelpCircle, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ClinicalHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalHelpModal: React.FC<ClinicalHelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playClick();
          onClose();
        }
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 id="help-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Clinical Decision Support Guide
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                DERMAClass-Net Platform Protocols & System Operations
              </p>
            </div>
          </div>
          <button
            onClick={() => { soundFx.playClick(); onClose(); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Assistive Protocol Warning */}
          <div style={{
            display: 'flex',
            gap: '12px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <ShieldAlert size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065f46', marginBottom: '3px' }}>
                Class II Medical Decision Support
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#047857', lineHeight: 1.45 }}>
                DERMAClass-Net uses ResNet-18 feature extraction combined with tabular patient metadata. Predictions and Grad-CAM activations are advisory and do not replace histological biopsy.
              </p>
            </div>
          </div>

          {/* Clinical Workflow Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <BookOpen size={16} color="#059669" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Clinical Workflow Steps
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: '2px' }}>
                  1. Register / Select Patient
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Use the patient directory to create or search records with unique identifiers.
                </div>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: '2px' }}>
                  2. Upload Dermoscopy
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Input standardized macroscopic or dermoscopic JPEG/PNG image with lesion coordinates.
                </div>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: '2px' }}>
                  3. Review Ensemble Inference
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Inspect multiclass softmax probabilities, entropy confidence, and Grad-CAM attention.
                </div>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: '2px' }}>
                  4. Sign-off & Reports
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Doctor reviews findings, signs notes, and issues cryptographically secured PDF reports.
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Keyboard size={16} color="#059669" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Keyboard Shortcuts
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: '#334155' }}>Toggle Sidebar (Expand / Collapse)</span>
                <kbd style={{ padding: '2px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                  Ctrl + B
                </kbd>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: '#334155' }}>Close Drawers / Modals</span>
                <kbd style={{ padding: '2px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                  Esc
                </kbd>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Pacific Coast Institute of Oncology • Division of Dermatology
          </span>
          <button
            onClick={() => { soundFx.playClick(); onClose(); }}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Close Guide
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
