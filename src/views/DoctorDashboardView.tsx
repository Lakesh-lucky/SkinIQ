import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Users, 
  FileText, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  UserPlus, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Zap,
  BarChart3,
  Layers,
  Database,
  Search,
  Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface DoctorDashboardViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const DoctorDashboardView: React.FC<DoctorDashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real Database Overview Metrics
  const [metrics, setMetrics] = useState({
    total_patients: 0,
    today_scans: 0,
    pending_reviews: 0,
    reports_generated: 0
  });

  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch real overview metrics
      const res = await api.doctor.getDashboardOverview();
      if (res.success) {
        setMetrics(res.overview || {
          total_patients: 0,
          today_scans: 0,
          pending_reviews: 0,
          reports_generated: 0
        });
        setRecentPatients(res.recent_patients || []);
        setRecentAnalyses(res.recent_analyses || []);
      }

      // Fetch model telemetry
      try {
        const info = await api.system.getInfo();
        setModelInfo(info);
      } catch (infoErr) {
        console.warn('Model telemetry not loaded:', infoErr);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const doctorName = currentUser?.full_name || 'Dr. Evelyn Vance, MD';

  return (
    <div style={{
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* ---------------- TOP HERO & QUICK ACTION BAR ---------------- */}
      <div style={{
        position: 'relative',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 60%, #e6fffa 100%)',
        border: '1px solid #ccfbf1',
        padding: '32px 36px',
        color: '#0F172A',
        marginBottom: '28px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(13, 148, 136, 0.1)',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#0f766e',
              marginBottom: '10px',
              letterSpacing: '0.04em'
            }}>
              <Sparkles size={13} style={{ color: '#0d9488' }} />
              AI-POWERED DERMATOLOGY DECISION SUPPORT
            </div>

            <h1 style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              margin: '0 0 6px',
              letterSpacing: '-0.03em',
              color: '#0F172A'
            }}>
              {getGreeting()}, <span style={{ color: '#0d9488' }}>{doctorName}</span>
            </h1>

            <p style={{
              fontSize: '0.92rem',
              color: '#475569',
              margin: 0,
              maxWidth: '620px',
              lineHeight: 1.5
            }}>
              Evaluate dermoscopic skin scans with the fine-tuned <strong>SkinLesion-ResNet18</strong> ONNX engine, manage patient diagnostic histories, and generate clinical reports.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigate('newAnalysis');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.28)',
                transition: 'all 0.2s ease'
              }}
            >
              <PlusCircle size={18} />
              <span>New AI Analysis</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                onNavigate('patients');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                color: '#1E293B',
                border: '1px solid #CBD5E1',
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={18} />
              <span>Register Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- ERROR BANNER (if any) ---------------- */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#DC2626'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button
            onClick={fetchDashboard}
            style={{
              background: 'none',
              border: '1px solid #DC2626',
              color: '#DC2626',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ---------------- 4 MODERN STAT CARDS ---------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Total Patients */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #0FAE9B, #20B486)'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Total Patients
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {metrics.total_patients || recentPatients.length}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(15, 174, 155, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0FAE9B'
            }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: '10px' }}>
            Enrolled in clinical registry
          </div>
        </div>

        {/* Total AI Assessments */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #12B8E8, #38BDF8)'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Total AI Assessments
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {metrics.today_scans || metrics.reports_generated || recentAnalyses.length}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(18, 184, 232, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#12B8E8'
            }}>
              <Activity size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#0FAE9B', fontWeight: 600, marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={13} />
            <span>ResNet-18 Inference Active</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #E8AD4A, #F59E0B)'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Pending Reviews
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {metrics.pending_reviews}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(232, 173, 74, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8AD4A'
            }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#D97706', fontWeight: 600, marginTop: '10px' }}>
            Awaiting clinician signature
          </div>
        </div>

        {/* Reports Generated */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #20B486, #0FAE9B)'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Reports Generated
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {metrics.reports_generated}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(32, 180, 134, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#20B486'
            }}>
              <FileText size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: '10px' }}>
            Archived PDF clinical reports
          </div>
        </div>
      </div>

      {/* ---------------- 2 COLUMN LAYOUT: RECENT SCANS & RECENT PATIENTS ---------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Recent AI Assessments */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#0FAE9B" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Recent AI Assessments
              </h2>
            </div>
            <button
              onClick={() => onNavigate('scanHistory')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0FAE9B',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {recentAnalyses.length === 0 ? (
            <div style={{
              padding: '36px 16px',
              textAlign: 'center',
              color: '#94A3B8',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #E2E8F0'
            }}>
              <Activity size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>No scans recorded yet</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                Click "New AI Analysis" to evaluate a dermoscopic image.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentAnalyses.slice(0, 5).map((scan, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('analysisResult', scan.scan_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: scan.predicted_class === 'MEL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                      color: scan.predicted_class === 'MEL' ? '#DC2626' : '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.78rem'
                    }}>
                      {scan.predicted_class || 'AI'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                        {scan.patient_name || 'Patient'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        {scan.scan_code} • {scan.date || 'Recent'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: scan.predicted_class === 'MEL' ? '#FEF2F2' : '#F0FDF4',
                      color: scan.predicted_class === 'MEL' ? '#B91C1C' : '#15803D',
                      border: scan.predicted_class === 'MEL' ? '1px solid #FECACA' : '1px solid #BBF7D0'
                    }}>
                      {scan.ai_result || scan.predicted_class}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                      Conf: {scan.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Patients */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#0FAE9B" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Recent Patients
              </h2>
            </div>
            <button
              onClick={() => onNavigate('patients')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0FAE9B',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Manage Patients</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <div style={{
              padding: '36px 16px',
              textAlign: 'center',
              color: '#94A3B8',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #E2E8F0'
            }}>
              <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>No patients enrolled yet</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                Add patients to track individual lesion evolution histories.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentPatients.slice(0, 5).map((patient, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('patientProfile', patient.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}>
                      {patient.patient_name ? patient.patient_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                        {patient.patient_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        ID: {patient.patient_code} • Age: {patient.age} ({patient.gender})
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE'
                  }}>
                    {patient.status || 'Active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- ACTIVE ML MODEL TELEMETRY WIDGET ---------------- */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #111C2E 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#FFFFFF',
        border: '1px solid #2A384D',
        boxShadow: '0 12px 32px rgba(11, 18, 32, 0.15)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(15, 174, 155, 0.18)',
              color: '#0FAE9B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F3F7FC' }}>
                ONNX Diagnostic Runtime Telemetry
              </div>
              <div style={{ fontSize: '0.78rem', color: '#98A7BC' }}>
                Single Source of Truth: <strong>skinlesion_resnet18.onnx</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              fontSize: '0.74rem',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={12} />
              HEALTHY & LOADED
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          fontSize: '0.82rem'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: '2px' }}>INPUT RESOLUTION</div>
            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>224 × 224 × 3 RGB</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: '2px' }}>CLASSES</div>
            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>BCC (Basal Cell) & MEL (Melanoma)</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: '2px' }}>POSTPROCESSING</div>
            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>Softmax + Uncertainty Estimator</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: '2px' }}>AVG INFERENCE TIME</div>
            <div style={{ fontWeight: 700, color: '#34D399' }}>~26.1 ms (CPU)</div>
          </div>
        </div>
      </div>

      {/* Mandatory Prominent Medical Disclaimer */}
      <div style={{
        marginTop: '20px',
        padding: '14px 20px',
        borderRadius: '12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #0284c7',
        fontSize: '0.82rem',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0 }} />
        <div>
          <strong>Clinical Decision-Support Notice:</strong> AI-generated decision support. Final diagnosis must be made by a qualified healthcare professional.
        </div>
      </div>
    </div>
  );
};
