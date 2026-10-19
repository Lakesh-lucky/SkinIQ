import React from 'react';
import { X, Download, Printer, ShieldCheck, Microscope, User, Calendar, MapPin, Phone } from 'lucide-react';
import { RegisteredPatient } from '../types';
import { soundFx } from '../utils/audio';

interface DigitalPatientCardProps {
  isOpen: boolean;
  onClose: () => void;
  patient: RegisteredPatient | null;
  doctorName?: string;
}

export const DigitalPatientCard: React.FC<DigitalPatientCardProps> = ({
  isOpen,
  onClose,
  patient,
  doctorName = 'Dr. Evelyn Vance, MD'
}) => {
  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    soundFx.playClick();
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Controls */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#059669" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Official Clinical Patient Card
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Card Area */}
        <div
          id="printable-patient-card"
          style={{
            padding: '28px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            margin: '20px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Watermark Logo */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-20px',
              opacity: 0.05,
              pointerEvents: 'none'
            }}
          >
            <Microscope size={220} color="#ffffff" />
          </div>

          {/* Card Top Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#10b981', fontWeight: 800 }}>
                Pacific Coast Dermatology Institute
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginTop: '2px' }}>
                DermaClass<span style={{ color: '#10b981' }}>-Net</span> ID
              </div>
            </div>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                color: '#34d399',
                fontWeight: 700
              }}
            >
              VERIFIED PATIENT
            </div>
          </div>

          {/* Patient Primary Identifier */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Official Patient ID
            </div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '1.5px',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}
            >
              {patient.patient_code}
            </div>
          </div>

          {/* Patient Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Full Legal Name
              </div>
              <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {patient.patient_name}
              </div>
            </div>

            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Age / Gender
              </div>
              <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {patient.age} yrs • {patient.gender}
              </div>
            </div>

            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Attending Clinician
              </div>
              <div style={{ fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                {patient.doctor_name || doctorName}
              </div>
            </div>

            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                City / Region
              </div>
              <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {patient.city}, {patient.district}
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div
            style={{
              marginTop: '22px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.68rem',
              color: '#94a3b8'
            }}
          >
            <span>Issued: {patient.created_at ? patient.created_at.split('T')[0] : '2026-10-03'}</span>
            <span style={{ color: '#10b981' }}>Present ID to access diagnostic reports</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--bg-void)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
          >
            <Printer size={15} /> Print Card
          </button>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
