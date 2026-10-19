import React, { useState } from 'react';
import { 
  Mail, 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  Heart, 
  Phone, 
  ArrowUpRight, 
  Copy, 
  Send,
  Download
} from 'lucide-react';
import { Appointment } from '../types';
import { generateICalendarDownload } from '../services/notificationService';
import { soundFx } from '../utils/audio';

interface DoctorEmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onOpenCase?: (caseId: string) => void;
  onMarkRead?: (appointmentId: string) => void;
}

export const DoctorEmailNotificationModal: React.FC<DoctorEmailNotificationModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onOpenCase,
  onMarkRead
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [replySent, setReplySent] = useState<boolean>(false);

  if (!isOpen || !appointment) return null;

  const notif = appointment.emailNotification;

  const handleCopyEmail = () => {
    soundFx.playClick();
    const plainSummary = `
[DERMACLASS-NET CLINICAL APPOINTMENT NOTIFICATION]
Subject: ${notif.subject}
To: ${notif.sentToDoctorName} <${notif.sentToEmail}>
Date: ${new Date(notif.sentAt).toLocaleString()}
Status: ${notif.deliveryStatus}

PATIENT INFORMATION:
- Patient: ${appointment.patientName} (${appointment.patientId})
- Booked By: ${appointment.bookerName} (${appointment.bookerRelation})
- Contact Phone: ${appointment.contactPhone}
${appointment.patientEmail ? `- Contact Email: ${appointment.patientEmail}` : ''}

CONSULTATION DETAILS:
- Date & Time: ${appointment.appointmentDate} at ${appointment.appointmentTime}
- Type: ${appointment.consultationType}
- Urgency: ${appointment.urgency}
- Case ID: ${appointment.caseId}
- Lesion Diagnosis: ${appointment.lesionDiagnosis} (${appointment.riskLevel})
- Notes: ${appointment.patientNotes || 'None'}
    `.trim();

    navigator.clipboard.writeText(plainSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCalendarDownload = () => {
    soundFx.playClick();
    generateICalendarDownload(appointment);
  };

  const handleQuickAcknowledge = () => {
    soundFx.playEmailSent();
    setReplySent(true);
    if (onMarkRead) onMarkRead(appointment.id);
    setTimeout(() => setReplySent(false), 4000);
  };

  const isHighRisk = appointment.riskLevel.includes('High') || appointment.urgency.includes('Urgent');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel-raised"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid var(--border-light)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Email Client Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Mail size={18} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Doctor Email Notification
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Pacific Coast Dermatology EMR • Real-Time Alert Dispatch
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0'
              }}
            >
              ✓ {notif.deliveryStatus}
            </span>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email Metadata Header Fields */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.84rem'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: '6px', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>To:</span>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>{notif.sentToDoctorName}</strong>{' '}
              <span className="mono" style={{ color: '#059669', fontSize: '0.8rem' }}>&lt;{notif.sentToEmail}&gt;</span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>From:</span>
            <div style={{ color: 'var(--text-secondary)' }}>
              DermaClass-Net Clinical Dispatch <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>&lt;alerts@dermaclass.med&gt;</span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Subject:</span>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{notif.subject}</span>
              <span
                className={`badge ${isHighRisk ? 'badge-high-risk' : 'badge-benign'}`}
                style={{ fontSize: '0.62rem' }}
              >
                {appointment.urgency}
              </span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Dispatched:</span>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {new Date(notif.sentAt).toLocaleString()} • Message ID: <span className="mono">{notif.messageId}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Email Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            background: '#ffffff'
          }}
        >
          {/* Confirmed Slot Alert Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: '#f0fdf4',
              border: '1.5px solid #10b981',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                  Confirmed Clinical Consultation
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065f46' }}>
                  {appointment.appointmentDate} at {appointment.appointmentTime}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                  {appointment.consultationType} • Pacific Coast Dermatology
                </div>
              </div>
            </div>

            <button
              onClick={handleCalendarDownload}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: '#059669', color: '#059669' }}
            >
              <Download size={14} />
              <span>Add to iCal / Outlook (.ics)</span>
            </button>
          </div>

          {/* Key Parties Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            {/* Patient Box */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <User size={15} color="#059669" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Patient Profile
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {appointment.patientName}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Record ID: {appointment.patientId}
              </div>
            </div>

            {/* Booker / Family Box */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#fff1f2',
                border: '1px solid #fecdd3'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Heart size={15} color="#e11d48" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
                  Booked By (Family / Authorized)
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#881337' }}>
                {appointment.bookerName}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#9f1239' }}>
                Relationship: {appointment.bookerRelation}
              </div>
            </div>

            {/* Contact Box */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#f0f9ff',
                border: '1px solid #bae6fd'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Phone size={15} color="#0284c7" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                  Contact Phone & SMS
                </span>
              </div>
              <div className="mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0369a1' }}>
                {appointment.contactPhone}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#0284c7' }}>
                SMS Notification Active
              </div>
            </div>
          </div>

          {/* Associated Lesion Assessment Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Associated Case Diagnosis & AI Telemetry
              </div>
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>
                {appointment.caseId}
              </span>
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {appointment.lesionDiagnosis}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Stratification: <strong style={{ color: isHighRisk ? '#e11d48' : '#059669' }}>{appointment.riskLevel}</strong>
            </div>
          </div>

          {/* Patient / Family Notes */}
          {appointment.patientNotes && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                marginBottom: '20px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
                Patient / Daughter Notes & Symptoms
              </div>
              <p style={{ fontSize: '0.88rem', color: '#78350f', margin: 0, fontStyle: 'italic' }}>
                "{appointment.patientNotes}"
              </p>
            </div>
          )}

          {/* Reply acknowledgment feedback */}
          {replySent && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#ecfdf5',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px'
              }}
            >
              <CheckCircle2 size={18} color="#059669" />
              <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 700 }}>
                Acknowledgment SMS & Email Sent to {appointment.bookerName} ({appointment.contactPhone}).
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyEmail}
              className="btn btn-secondary btn-sm"
              title="Copy email notification content"
            >
              <Copy size={14} />
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleQuickAcknowledge}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: '#0284c7', color: '#0284c7' }}
            >
              <Send size={14} />
              <span>Send SMS Acknowledgment</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onOpenCase && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  onClose();
                  onOpenCase(appointment.caseId);
                }}
                className="btn btn-primary btn-sm"
              >
                <span>Open Clinical Workspace ({appointment.caseId})</span>
                <ArrowUpRight size={14} />
              </button>
            )}

            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              <span>Close Viewer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
