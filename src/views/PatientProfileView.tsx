import React, { useState, useEffect } from 'react';
import { 
  User, 
  ArrowLeft, 
  Copy, 
  Check, 
  PlusCircle, 
  Activity, 
  FileText, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  CheckCircle2,
  FileCheck2,
  Shield
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface PatientProfileViewProps {
  patientId: string;
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
  onBack: () => void;
}

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({
  patientId,
  onNavigate,
  onBack
}) => {
  const [data, setData] = useState<{ patient: any; scans: any[]; reports: any[]; appointments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'OVERVIEW' | 'SCANS' | 'REVIEWS' | 'REPORTS' | 'APPOINTMENTS'>('OVERVIEW');
  const [copied, setCopied] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const handleDownloadPdf = async (scanId: string) => {
    try {
      setDownloadingReportId(scanId);
      soundFx.playClick();
      await api.reports.downloadPdf(scanId);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert(err.message || 'Failed to download report PDF. Please try again.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.patients.get(patientId);
      if (res.success && res.patient) {
        setData({
          patient: res.patient,
          scans: res.scans || [],
          reports: (res as any).reports || [],
          appointments: (res as any).appointments || []
        });
      } else {
        setError('Patient file could not be loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [patientId]);

  const handleCopyId = () => {
    if (!data?.patient?.patient_code) return;
    navigator.clipboard.writeText(data.patient.patient_code);
    soundFx.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading official patient profile...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b' }}>
        <AlertCircle size={24} style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Patient Record Not Available</div>
        <p style={{ margin: '6px 0 16px', fontSize: '0.85rem' }}>{error || 'Unable to locate patient record.'}</p>
        <button onClick={onBack} className="btn btn-secondary">
          ← Return to Patients List
        </button>
      </div>
    );
  }

  const { patient, scans, reports, appointments } = data;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Patient Roster</span>
      </button>

      {/* ---------------- PROFILE HEADER ---------------- */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          padding: '24px 28px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Left: Name and Patient ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800
              }}
            >
              {patient.patient_name.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {patient.patient_name}
                </h1>
                <span 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    color: '#059669', 
                    background: '#ecfdf5', 
                    border: '1px solid #a7f3d0',
                    padding: '3px 8px', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {patient.patient_code}
                  <button 
                    onClick={handleCopyId}
                    title="Copy Patient ID"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#059669', display: 'flex' }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </span>
              </div>

              {/* Demographic Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.84rem', color: '#64748b', flexWrap: 'wrap' }}>
                <span><strong>Age:</strong> {patient.age} yrs</span>
                <span>•</span>
                <span><strong>Gender:</strong> {patient.gender}</span>
                <span>•</span>
                <span><strong>DOB:</strong> {patient.date_of_birth}</span>
                <span>•</span>
                <span><strong>Location:</strong> {patient.city}, {patient.district}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action */}
          <div>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigate('newAnalysis', { 
                  patientId: patient.id, 
                  patientCode: patient.patient_code, 
                  patientName: patient.patient_name,
                  age: patient.age,
                  gender: patient.gender
                });
              }}
              className="btn btn-primary"
              style={{
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <PlusCircle size={16} />
              <span>+ New Analysis for this Patient</span>
            </button>
          </div>
        </div>

        {/* Contact Strip */}
        <div 
          style={{ 
            marginTop: '20px', 
            paddingTop: '16px', 
            borderTop: '1px solid #f1f5f9', 
            display: 'flex', 
            gap: '24px', 
            fontSize: '0.82rem', 
            color: '#475569',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={14} color="#059669" />
            <span>{patient.phone}</span>
          </div>
          {patient.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="#059669" />
              <span>{patient.email}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="#059669" />
            <span>{patient.area}, {patient.city}, {patient.district}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#059669" />
            <span>Doctor: {patient.doctor_name || 'Dr. Evelyn Vance, MD'}</span>
          </div>
        </div>
      </div>

      {/* ---------------- SECTION TABS ---------------- */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e2e8f0', 
          marginBottom: '24px', 
          gap: '8px' 
        }}
      >
        {[
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'SCANS', label: `Scan History & AI Results (${scans.length})` },
          { id: 'REVIEWS', label: 'Doctor Reviews' },
          { id: 'REPORTS', label: `Reports (${reports.length})` },
          { id: 'APPOINTMENTS', label: `Appointments (${appointments.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { soundFx.playClick(); setActiveSection(tab.id as any); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeSection === tab.id ? '2px solid #059669' : '2px solid transparent',
              color: activeSection === tab.id ? '#059669' : '#64748b',
              fontWeight: activeSection === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------------- SECTION CONTENT ---------------- */}
      
      {/* 1. OVERVIEW */}
      {activeSection === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Medical Notes Card */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
              Clinical History & Dermatologic Notes
            </h3>
            {patient.medical_notes ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                {patient.medical_notes}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                No clinical notes recorded for this patient file yet.
              </p>
            )}
          </div>

          {/* Quick Summary Card */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
              Diagnostic Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total Lesion Scans:</span>
                <strong style={{ color: '#0f172a' }}>{scans.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Reports Generated:</span>
                <strong style={{ color: '#0f172a' }}>{reports.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Scheduled Consultations:</span>
                <strong style={{ color: '#0f172a' }}>{appointments.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Registration Date:</span>
                <span style={{ color: '#475569' }}>{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCAN HISTORY & AI RESULTS */}
      {activeSection === 'SCANS' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {scans.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Activity size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No scans on file for this patient.</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 16px' }}>
                Upload a skin lesion dermoscopy image to run multimodal AI inference.
              </p>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onNavigate('newAnalysis', { patientId: patient.id });
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem' }}
              >
                + Start First Scan
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px' }}>Scan ID</th>
                    <th style={{ padding: '12px 18px' }}>Lesion Image</th>
                    <th style={{ padding: '12px 18px' }}>Anatomical Site</th>
                    <th style={{ padding: '12px 18px' }}>Date</th>
                    <th style={{ padding: '12px 18px' }}>AI Prediction</th>
                    <th style={{ padding: '12px 18px' }}>Confidence</th>
                    <th style={{ padding: '12px 18px' }}>Review Status</th>
                    <th style={{ padding: '12px 18px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(s => {
                    const pred = s.prediction;
                    const docRev = s.doctor_review;
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {s.scan_code}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <img 
                            src={s.image_base64 || resolveMediaUrl(s.image_url)} 
                            alt="Lesion" 
                            style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 18px', color: '#475569' }}>
                          {s.anatomical_site}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b' }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontWeight: 700, color: ['MEL', 'BCC', 'SCC'].includes(pred?.predicted_class) ? '#b91c1c' : '#059669' }}>
                            {pred?.predicted_class_name || 'Processing'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {pred ? `${(pred.top_probability * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span 
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: docRev?.review_status === 'REVIEWED' ? '#ecfdf5' : '#fef3c7',
                              color: docRev?.review_status === 'REVIEWED' ? '#059669' : '#b45309'
                            }}
                          >
                            {docRev?.review_status || 'PENDING'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <button
                            onClick={() => { soundFx.playClick(); onNavigate('analysisResult', s.id); }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            View Result
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. DOCTOR REVIEWS */}
      {activeSection === 'REVIEWS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {scans.filter(s => s.doctor_review).length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '50px 20px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <FileCheck2 size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No doctor reviews entered yet.</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0' }}>
                Reviews submitted after AI analysis will appear here.
              </p>
            </div>
          ) : (
            scans.filter(s => s.doctor_review).map(s => (
              <div key={s.id} style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Scan Code: {s.scan_code}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                    {s.doctor_review.review_status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <div><strong>Clinician Diagnosis:</strong> {s.doctor_review.doctor_diagnosis || 'Unspecified'}</div>
                  <div style={{ marginTop: '4px' }}><strong>Observations:</strong> {s.doctor_review.clinical_notes}</div>
                  {s.doctor_review.recommended_action && (
                    <div style={{ marginTop: '4px' }}><strong>Recommended Follow-up:</strong> {s.doctor_review.recommended_action}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. REPORTS */}
      {activeSection === 'REPORTS' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {reports.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No reports have been generated yet.</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0' }}>
                PDF diagnostic reports are created upon scan evaluation.
              </p>
            </div>
          ) : (
            <div style={{ padding: '16px 20px' }}>
              {reports.map((r: any) => (
                <div key={r.scan_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                      Report #{r.scan_code}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {r.date} • {r.prediction} ({r.confidence}%)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(r.scan_id)}
                    disabled={downloadingReportId === r.scan_id}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    {downloadingReportId === r.scan_id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{downloadingReportId === r.scan_id ? 'Downloading...' : 'Download PDF'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. APPOINTMENTS */}
      {activeSection === 'APPOINTMENTS' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
              <Calendar size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No appointments scheduled.</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0' }}>
                Schedule follow-up consultations in the Appointments tab.
              </p>
            </div>
          ) : (
            <div>
              {appointments.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                      {a.type} • {a.date} at {a.time}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Code: {a.appointment_code} • Urgency: {a.urgency}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
