import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Eye, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send 
} from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface ReportsListViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const ReportsListView: React.FC<ReportsListViewProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Share Modal State
  const [activeShareReport, setActiveShareReport] = useState<any | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<{ message: string; shareUrl?: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.reports.list();
      if (res.success) {
        setReports(res.reports || []);
      } else {
        setError('Failed to fetch clinical reports.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleShare = async (mode: 'EMAIL' | 'LINK') => {
    if (!activeShareReport) return;
    setShareLoading(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const payload: any = { expires_in_days: 7 };
      if (mode === 'EMAIL') {
        if (!recipientEmail) {
          setShareError('Please enter a recipient email address.');
          setShareLoading(false);
          return;
        }
        payload.recipient_email = recipientEmail.trim();
        payload.recipient_name = recipientName.trim() || undefined;
      }

      const res = await api.reports.share(activeShareReport.scan_id, payload);
      if (res.success) {
        soundFx.playSuccess();
        const fullUrl = `${window.location.origin}${res.share_url}`;
        setShareSuccess({
          message: res.message,
          shareUrl: fullUrl
        });
      }
    } catch (err: any) {
      soundFx.playError();
      setShareError(err.message || 'Failed to generate share link.');
    } finally {
      setShareLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    return !q || 
      r.report_id.toLowerCase().includes(q) || 
      r.patient_name.toLowerCase().includes(q) || 
      r.patient_code.toLowerCase().includes(q) ||
      r.ai_result.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Clinical AI Reports
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            View, download official clinical PDFs, and share AI-assisted lesion reports.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text"
            placeholder="Search report ID, patient, result..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading reports from medical database...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '24px' }}>
          <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '6px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Reports Table */}
      {!loading && !error && (
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0', 
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          {filteredReports.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                No reports have been generated yet.
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: '6px auto 16px' }}>
                Run an AI lesion analysis from the workstation to generate official clinical diagnostic reports.
              </p>
              <button
                onClick={() => { soundFx.playClick(); onNavigate('newAnalysis'); }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                + Start First Analysis
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Report ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Scan Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>AI Result</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Doctor Review</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Generated Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr 
                      key={r.scan_id} 
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fbfcfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                        {r.report_id}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>
                        {r.patient_name}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                        {r.patient_code}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>
                        {r.scan_date}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                        {r.ai_result}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: r.doctor_review === 'REVIEWED' ? '#ecfdf5' : '#fef3c7',
                            color: r.doctor_review === 'REVIEWED' ? '#059669' : '#b45309'
                          }}
                        >
                          {r.doctor_review}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>
                        {r.generated_date}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { soundFx.playClick(); onNavigate('analysisResult', r.scan_id); }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="View Analysis"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <a
                            href={r.pdf_url}
                            download
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            title="Download PDF"
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </a>

                          <button
                            onClick={() => { soundFx.playClick(); setActiveShareReport(r); }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Share Report"
                          >
                            <Share2 size={13} />
                            <span>Share</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- SHARE MODAL ---------------- */}
      {activeShareReport && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ background: '#0f172a', padding: '18px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Share Clinical Report</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Report ID: {activeShareReport.report_id}</span>
              </div>
              <button 
                onClick={() => { setActiveShareReport(null); setShareSuccess(null); setShareError(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {shareError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', marginBottom: '16px' }}>
                  {shareError}
                </div>
              )}

              {shareSuccess ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px' }} />
                    <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a' }}>{shareSuccess.message}</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      A secure, revocable token link has been generated.
                    </p>
                  </div>

                  <div 
                    style={{ 
                      padding: '12px', 
                      background: '#f8fafc', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      fontSize: '0.82rem', 
                      wordBreak: 'break-all',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <span>{shareSuccess.shareUrl}</span>
                    <button
                      onClick={() => {
                        if (shareSuccess.shareUrl) {
                          navigator.clipboard.writeText(shareSuccess.shareUrl);
                          soundFx.playClick();
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => { setActiveShareReport(null); setShareSuccess(null); }}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Option 1: Share by Real SMTP Email
                    </label>
                    <input 
                      type="email"
                      placeholder="Doctor or Authorized Specialist Email..."
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    <input 
                      type="text"
                      placeholder="Recipient Name (Optional)..."
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      style={{ width: '100%', marginTop: '8px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      disabled={shareLoading || !recipientEmail}
                      onClick={() => handleShare('EMAIL')}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '10px', padding: '9px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {shareLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                      <span>Send Report via Email</span>
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '0.78rem', color: '#94a3b8', position: 'relative' }}>
                    <span style={{ background: '#ffffff', padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Option 2: Generate Secure Link
                    </label>
                    <button
                      type="button"
                      disabled={shareLoading}
                      onClick={() => handleShare('LINK')}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '9px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Copy size={15} />
                      <span>Generate Secure Link</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
