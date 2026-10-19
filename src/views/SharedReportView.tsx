import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldAlert, 
  Stethoscope,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { MedicalReportRecord } from '../types';

export const SharedReportView: React.FC<{ token: string; onReturnToLogin: () => void }> = ({
  token,
  onReturnToLogin
}) => {
  const [report, setReport] = useState<MedicalReportRecord | null>(null);
  const [sharedInfo, setSharedInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShared = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.reports.getShared(token);
        if (res.success && res.report) {
          setReport(res.report);
          setSharedInfo(res.shared_info);
        } else {
          setError('This shared report link is invalid or has expired.');
        }
      } catch (err: any) {
        setError(err.message || 'Shared report link has expired or been revoked.');
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Decrypting and loading shared medical report...</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Link Inactive or Expired</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
            {error || 'This shared medical document link is no longer accessible.'}
          </p>
          <button onClick={onReturnToLogin} className="btn btn-secondary">
            Return to SkinIQ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px 60px' }}>
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Banner */}
        <div style={{ background: '#0f172a', padding: '24px 28px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Skin<span style={{ color: '#1d4ed8' }}>IQ</span>
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Secure Clinical Report • Scan #{report.scan_code}</span>
          </div>
          <a
            href={report.pdf_download_url}
            download
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <Download size={14} />
            <span>Download Official PDF</span>
          </a>
        </div>

        {/* Report Content */}
        <div style={{ padding: '28px' }}>
          {/* Patient Details */}
          <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Patient Record
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '0.84rem' }}>
              <div><strong>Patient ID:</strong> {report.patient_code}</div>
              <div><strong>Patient:</strong> {report.patient_name}</div>
              <div><strong>Age / Gender:</strong> {report.patient_age} yrs / {report.patient_gender}</div>
              <div><strong>Site:</strong> {report.anatomical_site}</div>
            </div>
          </div>

          {/* AI Result */}
          <div style={{ padding: '18px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
              AI Multimodal Lesion Classification
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
              {report.ai_predicted_class_name} ({report.ai_predicted_class})
            </div>
            <div style={{ fontSize: '0.82rem', color: '#047857' }}>
              Confidence: <strong>{report.ai_confidence.toFixed(1)}%</strong> • Epistemic Vacuity: <strong>{report.ai_uncertainty.toFixed(4)}</strong>
            </div>
          </div>

          {/* Doctor Review */}
          <div style={{ padding: '18px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>
              Clinician Assessment & Notes
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '6px' }}>
              {report.doctor_diagnosis}
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.5 }}>
              {report.doctor_clinical_notes}
            </p>
            {report.doctor_recommended_action && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#475569' }}>
                <strong>Recommendation:</strong> {report.doctor_recommended_action}
              </div>
            )}
            <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#64748b' }}>
              Attending: {report.doctor_name}
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '16px', lineHeight: 1.5 }}>
            <strong>Medical Notice:</strong> {report.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};
