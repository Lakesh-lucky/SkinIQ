import React, { useState, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  FileText, 
  ArrowLeft, 
  Check, 
  Copy, 
  Mail, 
  Send, 
  RefreshCw,
  Sparkles,
  Stethoscope,
  Info,
  FileCheck2,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface AnalysisResultViewProps {
  scanId: string;
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
  onBack: () => void;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  scanId,
  onNavigate,
  onBack
}) => {
  const [scanData, setScanData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Zoom and Pan Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Model View Tab (for Dual-Model analysis)
  const [activeModelTab, setActiveModelTab] = useState<'consensus' | 'dermaclass' | 'resnet18'>('consensus');

  // Doctor Review Form State
  const [reviewStatus, setReviewStatus] = useState<'PENDING' | 'REVIEWED' | 'FOLLOW_UP_REQUIRED'>('REVIEWED');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [doctorDiagnosis, setDoctorDiagnosis] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('Routine dermoscopic follow-up in 6 months.');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<{ message: string; shareUrl?: string; token?: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setError(null);
    try {
      soundFx.playClick();
      await api.reports.downloadPdf(scanData ? scanData.id : scanId);
      soundFx.playSuccess();
    } catch (err: any) {
      soundFx.playError();
      setError(err.message || 'Failed to download PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const fetchScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.scans.get(scanId);
      if (res.success && res.scan) {
        setScanData(res.scan);
        if (res.scan.doctor_review) {
          setReviewStatus(res.scan.doctor_review.review_status || 'REVIEWED');
          setClinicalNotes(res.scan.doctor_review.clinical_notes || '');
          setDoctorDiagnosis(res.scan.doctor_review.doctor_diagnosis || '');
          setRecommendedAction(res.scan.doctor_review.recommended_action || 'Routine dermoscopic follow-up in 6 months.');
        } else if (res.scan.prediction) {
          setDoctorDiagnosis(`Evaluation of ${res.scan.prediction.predicted_class_name}`);
        }
      } else {
        setError('Scan record not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [scanId]);

  // Submit Doctor Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalNotes.trim()) {
      setReviewSuccessMsg(null);
      setError('Please enter your clinical observation notes before submitting.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);
    try {
      const res = await api.scans.review(scanId, {
        review_status: reviewStatus,
        doctor_diagnosis: doctorDiagnosis.trim() || undefined,
        clinical_notes: clinicalNotes.trim(),
        recommended_action: recommendedAction.trim() || undefined
      });

      if (res.success) {
        soundFx.playSuccess();
        setReviewSuccessMsg('Clinician review submitted and recorded in medical database.');
        fetchScan();
      }
    } catch (err: any) {
      soundFx.playError();
      setError(err.message || 'Failed to submit clinical review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Share Report Handler (Real Email SMTP or Secure Link)
  const handleShareReport = async (mode: 'EMAIL' | 'LINK') => {
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

      const res = await api.reports.share(scanId, payload);
      if (res.success) {
        soundFx.playSuccess();
        const fullUrl = `${window.location.origin}${res.share_url}`;
        setShareSuccess({
          message: res.message,
          shareUrl: fullUrl,
          token: res.share_token
        });
      }
    } catch (err: any) {
      soundFx.playError();
      setShareError(err.message || 'Failed to generate shared report link.');
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading AI diagnostic telemetry and scan imagery...</div>
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div style={{ padding: '40px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b' }}>
        <AlertCircle size={24} style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scan Record Not Found</div>
        <p style={{ margin: '6px 0 16px', fontSize: '0.85rem' }}>{error || 'The requested scan could not be loaded.'}</p>
        <button onClick={onBack} className="btn btn-secondary">
          ← Return to Workspace
        </button>
      </div>
    );
  }

  const { prediction, patient, doctor_review } = scanData;
  const comparison = prediction?.comparison;

  // Active prediction based on tab (if dual-model analysis was conducted)
  const displayedPred = (comparison && activeModelTab === 'resnet18')
    ? comparison.models.resnet18
    : (comparison && activeModelTab === 'dermaclass')
      ? comparison.models.dermaclass_final
      : prediction;

  const probabilities = displayedPred?.probabilities || {};
  const isHighRisk = ['MEL', 'BCC', 'SCC'].includes(displayedPred?.predicted_class);

  return (
    <div>
      {/* ---------------- NAVIGATION HEADER ---------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Scans</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isDownloadingPdf ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>

          <button
            onClick={() => { soundFx.playClick(); setIsShareModalOpen(true); }}
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Share2 size={15} />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      {/* ---------------- TWO COLUMN WORKSPACE (LEFT: IMAGE / RIGHT: AI TELEMETRY) ---------------- */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', 
          gap: '24px', 
          marginBottom: '24px' 
        }}
      >
        
        {/* ================= LEFT: LARGE LESION IMAGE WITH ZOOM ================= */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Dermoscopic Lesion Imagery
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Scan Code: <strong>{scanData.scan_code}</strong>
              </span>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.25))}
                title="Zoom In"
                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: '#334155', borderRadius: '4px' }}
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                title="Zoom Out"
                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: '#334155', borderRadius: '4px' }}
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                title="Reset Zoom"
                style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: '#334155', borderRadius: '4px' }}
              >
                <RotateCcw size={14} />
              </button>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', padding: '0 6px' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>

          {/* Interactive Viewer Frame */}
          <div 
            style={{ 
              flex: 1, 
              minHeight: '380px', 
              background: '#0f172a', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={(scanData as any)?.image_base64 || resolveMediaUrl(scanData?.image_url)} 
              alt="Dermoscopy Lesion"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('data:image') && (scanData as any)?.image_base64) {
                  target.src = (scanData as any).image_base64;
                }
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.15s ease',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Image Information Strip */}
          <div 
            style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid #f1f5f9', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
              gap: '12px', 
              fontSize: '0.75rem', 
              color: '#64748b' 
            }}
          >
            <div>
              <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>Anatomical Site</span>
              {scanData.anatomical_site}
            </div>
            <div>
              <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>Patient Details</span>
              {patient ? `${patient.patient_name} (${patient.patient_code})` : 'Anonymous / Trial'}
            </div>
            <div>
              <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>Acquisition Date</span>
              {scanData.created_at ? new Date(scanData.created_at).toLocaleDateString() : 'Recorded'}
            </div>
            <div>
              <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>Image Source</span>
              {scanData.original_filename || 'lesion.jpg'}
            </div>
          </div>
        </div>        {/* ================= RIGHT: AI PREDICTION TELEMETRY ================= */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {/* Header: Title & Model Switcher Tabs if Dual-Model was run */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
                  {comparison ? 'Dual-Model Comparative Diagnostic Telemetry' : (prediction?.model_architecture || 'AI-Assisted Lesion Classification')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Processing: <strong>{prediction?.processing_time_ms || 28} ms</strong>
              </span>
            </div>

            {/* Model Tab Switcher if Comparison is Available */}
            {comparison && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setActiveModelTab('consensus')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeModelTab === 'consensus' ? '#059669' : 'transparent',
                    color: activeModelTab === 'consensus' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Consensus & Comparison
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModelTab('dermaclass')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeModelTab === 'dermaclass' ? '#2563eb' : 'transparent',
                    color: activeModelTab === 'dermaclass' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  DERMAClass-Net (8-Class)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModelTab('resnet18')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeModelTab === 'resnet18' ? '#7c3aed' : 'transparent',
                    color: activeModelTab === 'resnet18' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ResNet-18 (2-Class)
                </button>
              </div>
            )}

            {/* View Mode 1: Dual-Model Consensus View */}
            {comparison && activeModelTab === 'consensus' && (
              <div style={{ marginBottom: '16px' }}>
                {/* Consensus Banner */}
                <div 
                  style={{ 
                    padding: '14px', 
                    borderRadius: '10px', 
                    background: comparison.concordance_type === 'FULL_CONCORDANCE' ? '#f0fdf4' : comparison.concordance_type === 'BENIGN_RESOLUTION' ? '#eff6ff' : '#fffbeb', 
                    border: '1px solid',
                    borderColor: comparison.concordance_type === 'FULL_CONCORDANCE' ? '#bbf7d0' : comparison.concordance_type === 'BENIGN_RESOLUTION' ? '#bfdbfe' : '#fde68a',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: comparison.concordance_type === 'FULL_CONCORDANCE' ? '#15803d' : comparison.concordance_type === 'BENIGN_RESOLUTION' ? '#1d4ed8' : '#b45309' }}>
                      {comparison.concordance_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                      Confidence Δ: {(comparison.confidence_delta * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.4, fontWeight: 500 }}>
                    {comparison.consensus_summary}
                  </div>
                </div>

                {/* Side-by-Side Model Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {/* DERMAClass-Net Card */}
                  <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '2px' }}>
                      DERMAClass-Net (8-Class)
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {comparison.models.dermaclass_final.predicted_class}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '6px' }}>
                      {comparison.models.dermaclass_final.predicted_class_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                      Confidence: {(comparison.models.dermaclass_final.top_probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Uncertainty: {Number(comparison.models.dermaclass_final.epistemic_uncertainty).toFixed(4)}
                    </div>
                  </div>

                  {/* ResNet-18 Card */}
                  <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '2px' }}>
                      ResNet-18 (2-Class)
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {comparison.models.resnet18.predicted_class}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '6px' }}>
                      {comparison.models.resnet18.predicted_class_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                      Confidence: {(comparison.models.resnet18.top_probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Uncertainty: {Number(comparison.models.resnet18.epistemic_uncertainty).toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* DERMAClass-Net Adaptive Fusion Weights */}
                {comparison.models.dermaclass_final.fusion_weights && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>DERMAClass-Net Dual-Backbone Fusion Gating:</span>
                      <span style={{ color: '#059669' }}>Adaptive Attention</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.74rem', color: '#475569' }}>
                      <span>DenseNet-121: <strong>{((comparison.models.dermaclass_final.fusion_weights.densenet121 || 0.5) * 100).toFixed(1)}%</strong></span>
                      <span>•</span>
                      <span>EfficientNet-B4: <strong>{((comparison.models.dermaclass_final.fusion_weights.efficientnet_b4 || 0.5) * 100).toFixed(1)}%</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Mode 2 & 3: Detailed Prediction Display */}
            {(!comparison || activeModelTab !== 'consensus') && (
              <div>
                {/* Main AI Classification Display */}
                <div 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: isHighRisk ? '#fff1f2' : '#f0fdf4', 
                    border: '1px solid', 
                    borderColor: isHighRisk ? '#fecdd3' : '#bbf7d0',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isHighRisk ? '#e11d48' : '#059669', textTransform: 'uppercase' }}>
                    {activeModelTab === 'dermaclass' ? 'DERMAClass-Net Classification:' : activeModelTab === 'resnet18' ? 'ResNet-18 Classification:' : 'Model Classification:'}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isHighRisk ? '#9f1239' : '#065f46', margin: '4px 0 2px' }}>
                    {displayedPred?.predicted_class_name} ({displayedPred?.predicted_class})
                  </div>
                  <div style={{ fontSize: '0.82rem', color: isHighRisk ? '#be123c' : '#047857' }}>
                    {isHighRisk ? 'Atypical presentation — clinical dermoscopy and histological correlation recommended.' : 'Lesion classified with predominant benign dermoscopic feature patterns.'}
                  </div>
                </div>

                {/* Metrics: Confidence & Epistemic Uncertainty */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Model Confidence</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                      {displayedPred ? (displayedPred.top_probability * 100).toFixed(1) : 0}%
                    </div>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          background: isHighRisk ? '#e11d48' : '#059669', 
                          width: `${displayedPred ? (displayedPred.top_probability * 100) : 0}%` 
                        }} 
                      />
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Epistemic Uncertainty</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                      {displayedPred ? Number(displayedPred.epistemic_uncertainty).toFixed(4) : '0.0000'}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {displayedPred?.evidence ? 'Dirichlet vacuity u = K/S' : '1 − confidence gap'}
                    </span>
                  </div>
                </div>

                {/* Dual Backbone Attention Weights if available */}
                {displayedPred?.fusion_weights && Object.keys(displayedPred.fusion_weights).length > 1 && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Backbone Fusion Weights:
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.74rem', color: '#64748b' }}>
                      {Object.entries(displayedPred.fusion_weights).map(([k, v]) => (
                        <span key={k}>
                          <strong>{k}:</strong> {(Number(v) * 100).toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Class Probabilities Distribution */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Class Probabilities ({Object.keys(probabilities).length} Classes • {activeModelTab === 'resnet18' ? 'ResNet-18' : 'DERMAClass-Net'})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(probabilities)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([cls, prob]) => {
                    const pct = Number(((prob as number) * 100).toFixed(1));
                    const isTop = cls === displayedPred?.predicted_class;
                    return (
                      <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.76rem' }}>
                        <span style={{ width: '46px', fontWeight: isTop ? 800 : 500, color: isTop ? '#059669' : '#64748b' }}>
                          {cls}
                        </span>
                        <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: isTop ? (isHighRisk ? '#e11d48' : '#059669') : '#cbd5e1', 
                              width: `${pct}%`,
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                        <span style={{ width: '46px', textAlign: 'right', fontWeight: isTop ? 700 : 500, color: isTop ? '#0f172a' : '#64748b' }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Model Specs in Card Footer */}
          <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>Architecture: {prediction?.model_architecture || 'Multi-Model Clinical Platform'}</span>
            <span>Version: {prediction?.model_version || 'v3.0.0-dual-ensemble'}</span>
          </div>
        </div>
      </div>

      {/* ---------------- BELOW: CLINICAL INTERPRETATION & EXPLICIT DISCLAIMER ---------------- */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '14px', 
          padding: '20px 24px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={16} color="#059669" />
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Algorithmic Clinical Interpretation & Synthesis
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
          {comparison ? (
            <>
              <strong>Dual-Model Cross-Validation:</strong> {comparison.consensus_summary}{' '}
              DERMAClass-Net evaluated 8 distinct diagnostic categories using multimodal image and patient metadata, 
              while SkinLesion-ResNet18 provided baseline binary triage. Primary assessment: <strong>{prediction?.predicted_class_name} ({prediction?.predicted_class})</strong> with an 
              AI confidence of <strong>{prediction ? (prediction.top_probability * 100).toFixed(1) : 0}%</strong> and epistemic uncertainty of <strong>{prediction?.epistemic_uncertainty}</strong>.
            </>
          ) : (
            <>
              The model classified this image as <strong>{prediction?.predicted_class_name} ({prediction?.predicted_class})</strong> with an 
              AI confidence of <strong>{prediction ? (prediction.top_probability * 100).toFixed(1) : 0}%</strong> and a prediction 
              uncertainty of <strong>{prediction?.epistemic_uncertainty}</strong>.
            </>
          )}
        </p>

        {/* Mandatory Prominent Medical Disclaimer */}
        <div 
          style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            background: '#f8fafc', 
            borderLeft: '4px solid #059669', 
            fontSize: '0.78rem', 
            color: '#475569',
            lineHeight: 1.5
          }}
        >
          <strong>AI-Generated Decision Support Notice:</strong> This software produces an <strong>AI assessment</strong> and is 
          <strong> not a medical diagnosis</strong>. AI-generated decision support. Final diagnosis must be made by a qualified healthcare professional.
        </div>
      </div>

      {/* ---------------- DOCTOR CLINICAL REVIEW (VISUALLY SEPARATE FROM AI) ---------------- */}
      <div 
        style={{ 
          borderRadius: '16px', 
          padding: '24px 28px', 
          border: '2px solid #93c5fd', 
          background: '#f8fbff',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Doctor Clinical Review & Final Assessment
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Physician observations, dermoscopic findings, and recommended patient actions
              </span>
            </div>
          </div>

          {doctor_review?.reviewed_at && (
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
              Reviewed by Clinician on {new Date(doctor_review.reviewed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {reviewSuccessMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>{reviewSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitReview}>
          {/* Review Status Radio Group */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Clinician Review Status *
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { val: 'REVIEWED', label: 'Reviewed (Confirmed)', color: '#059669' },
                { val: 'FOLLOW_UP_REQUIRED', label: 'Follow-Up Required', color: '#b91c1c' },
                { val: 'PENDING', label: 'Pending Assessment', color: '#b45309' },
              ].map(opt => (
                <label 
                  key={opt.val}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: reviewStatus === opt.val ? opt.color : '#cbd5e1',
                    background: reviewStatus === opt.val ? '#ffffff' : '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: reviewStatus === opt.val ? 700 : 500,
                    color: reviewStatus === opt.val ? opt.color : '#475569'
                  }}
                >
                  <input 
                    type="radio" 
                    name="reviewStatus" 
                    value={opt.val} 
                    checked={reviewStatus === opt.val}
                    onChange={() => setReviewStatus(opt.val as any)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clinician Diagnosis / Assessment Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Physician Diagnosis / Clinical Assessment
            </label>
            <input 
              type="text"
              placeholder="e.g. Benign Compound Dysplastic Nevus with Regular Pigment Network"
              value={doctorDiagnosis}
              onChange={(e) => setDoctorDiagnosis(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Clinical Observations & Dermoscopy Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Clinical Observations & Dermoscopy Notes *
            </label>
            <textarea 
              rows={3}
              required
              placeholder="Record ABCD rule criteria observations, pigment network symmetry, vascular patterns, or histopathologic recommendations..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Recommended Follow-up */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Recommended Follow-Up & Patient Action
            </label>
            <input 
              type="text"
              placeholder="e.g. Total-body photography follow-up in 6 months; patient advised on self-examination."
              value={recommendedAction}
              onChange={(e) => setRecommendedAction(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit Review Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmittingReview}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#2563eb',
                borderColor: '#1d4ed8'
              }}
            >
              {isSubmittingReview ? <RefreshCw size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
              <span>Submit Doctor Clinical Review</span>
            </button>
          </div>
        </form>
      </div>

      {/* ================= MODAL: SHARE REPORT ================= */}
      {isShareModalOpen && (
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
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Share Diagnostic Report</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Report ID: {scanData.scan_code}</span>
              </div>
              <button 
                onClick={() => { setIsShareModalOpen(false); setShareSuccess(null); setShareError(null); }}
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
                    onClick={() => { setIsShareModalOpen(false); setShareSuccess(null); }}
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
                      Option 1: Send via Real SMTP Email
                    </label>
                    <input 
                      type="email"
                      placeholder="Recipient Doctor or Authorized Specialist Email..."
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
                      onClick={() => handleShareReport('EMAIL')}
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
                      Option 2: Generate Secure Revocable Link
                    </label>
                    <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: '#64748b' }}>
                      Creates a cryptographically random token link valid for 7 days.
                    </p>
                    <button
                      type="button"
                      disabled={shareLoading}
                      onClick={() => handleShareReport('LINK')}
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
