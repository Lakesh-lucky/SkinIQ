import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface ScanHistoryViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({ onNavigate }) => {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState('ALL');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState('ALL');

  const fetchScans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.scans.list();
      if (res.success) {
        setScans(res.scans || []);
      } else {
        setError('Failed to fetch scan history.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const filteredScans = scans.filter(s => {
    // Search by Patient ID, Patient Name, Scan ID
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.scan_code.toLowerCase().includes(q) ||
      (s.patient_code && s.patient_code.toLowerCase().includes(q)) ||
      (s.patient_name && s.patient_name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Filter by Prediction
    if (selectedPrediction !== 'ALL') {
      if (s.prediction?.predicted_class !== selectedPrediction) return false;
    }

    // Filter by Review Status
    if (selectedReviewStatus !== 'ALL') {
      const revStatus = s.doctor_review?.review_status || 'PENDING';
      if (revStatus !== selectedReviewStatus) return false;
    }

    return true;
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
            Scan History
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Comprehensive registry of multimodal AI lesion scans, evidential uncertainty, and clinician evaluations.
          </p>
        </div>

        <button
          onClick={() => { soundFx.playClick(); onNavigate('newAnalysis'); }}
          className="btn btn-primary"
          style={{ padding: '9px 16px', fontSize: '0.85rem', fontWeight: 700 }}
        >
          + New Analysis
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '16px 20px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text"
            placeholder="Search Scan ID, Patient ID, or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Prediction Class Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Prediction:</span>
            <select
              value={selectedPrediction}
              onChange={(e) => setSelectedPrediction(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
            >
              <option value="ALL">All Classes (8-Class)</option>
              <option value="MEL">MEL (Melanoma)</option>
              <option value="NV">NV (Melanocytic Nevus)</option>
              <option value="BCC">BCC (Basal Cell Carcinoma)</option>
              <option value="AK">AK (Actinic Keratosis)</option>
              <option value="BKL">BKL (Benign Keratosis)</option>
              <option value="DF">DF (Dermatofibroma)</option>
              <option value="VASC">VASC (Vascular Lesion)</option>
              <option value="SCC">SCC (Squamous Cell Carcinoma)</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Review Status:</span>
            <select
              value={selectedReviewStatus}
              onChange={(e) => setSelectedReviewStatus(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-Up Required</option>
              <option value="PENDING">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading scan registry...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '24px' }}>
          <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '6px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Scans Table */}
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
          {filteredScans.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <History size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                No scan records found.
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: '6px auto 16px' }}>
                No clinical scans match the current filters or query.
              </p>
              <button
                onClick={() => { soundFx.playClick(); onNavigate('newAnalysis'); }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                + New Analysis
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Scan ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient Name</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>AI Result</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Confidence</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Doctor Review</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Report</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map(s => {
                    const pred = s.prediction;
                    const docRev = s.doctor_review;
                    const isHigh = ['MEL', 'BCC', 'SCC'].includes(pred?.predicted_class);
                    const reviewStatusText = docRev?.review_status || 'PENDING';

                    return (
                      <tr 
                        key={s.id} 
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fbfcfe')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                          {s.scan_code}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                          {s.patient_code || 'N/A'}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>
                          {s.patient_name || 'Anonymous Subject'}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#64748b' }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 700, color: isHigh ? '#b91c1c' : '#059669' }}>
                            {pred ? `${pred.predicted_class_name} (${pred.predicted_class})` : 'Processing'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {pred ? `${(pred.top_probability * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span 
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: reviewStatusText === 'REVIEWED' ? '#ecfdf5' : reviewStatusText === 'FOLLOW_UP_REQUIRED' ? '#fee2e2' : '#fef3c7',
                              color: reviewStatusText === 'REVIEWED' ? '#059669' : reviewStatusText === 'FOLLOW_UP_REQUIRED' ? '#b91c1c' : '#b45309'
                            }}
                          >
                            {reviewStatusText}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <a
                            href={api.reports.getPdfUrl(s.id)}
                            download
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            PDF
                          </a>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            onClick={() => { soundFx.playClick(); onNavigate('analysisResult', s.id); }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            View Result →
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
    </div>
  );
};
