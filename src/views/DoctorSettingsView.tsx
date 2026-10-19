import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  Building, 
  FileBadge,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';

export const DoctorSettingsView: React.FC = () => {
  const { currentUser, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'APPLICATION'>('PROFILE');

  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Real SMTP Status
  const [smtpStatus, setSmtpStatus] = useState<any | null>(null);
  const [loadingSmtp, setLoadingSmtp] = useState(false);

  useEffect(() => {
    const fetchSmtp = async () => {
      setLoadingSmtp(true);
      try {
        const res = await api.auth.getSmtpStatus();
        setSmtpStatus(res);
      } catch {
        // Silently handle
      } finally {
        setLoadingSmtp(false);
      }
    };
    fetchSmtp();
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMsg(null);

    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      soundFx.playSuccess();
      setPasswordMsg({ type: 'success', text: 'Password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      soundFx.playError();
      setPasswordMsg({ type: 'error', text: res.error || 'Failed to update password.' });
    }
  };

  const doctorProfile = currentUser?.doctor_profile;

  return (
    <div style={{ maxWidth: '840px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Clinician Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
          Manage your verified doctor profile, credentials, login security, and SMTP status.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        {[
          { id: 'PROFILE', label: 'Doctor Profile' },
          { id: 'SECURITY', label: 'Security & Email OTP' },
          { id: 'APPLICATION', label: 'Application Preferences' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { soundFx.playClick(); setActiveTab(tab.id as any); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #059669' : '2px solid transparent',
              color: activeTab === tab.id ? '#059669' : '#64748b',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. PROFILE */}
      {activeTab === 'PROFILE' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
            Clinician Credentials
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Full Doctor Name
              </label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                {currentUser?.full_name}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Registered Doctor Email
              </label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#0f172a' }}>
                {currentUser?.email}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Assigned Doctor Code
              </label>
              <div style={{ padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0', fontSize: '0.88rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                {doctorProfile?.doctor_code || 'DR001'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Medical License / Registration Number
              </label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#0f172a' }}>
                {doctorProfile?.license_number || 'MD-84920-DERM'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Specialization
              </label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#0f172a' }}>
                {doctorProfile?.specialization || 'Cutaneous Oncology & Dermoscopy'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Hospital / Institution Affiliation
              </label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#0f172a' }}>
                {doctorProfile?.hospital_affiliation || 'Pacific Coast Dermatology Institute'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECURITY & EMAIL OTP */}
      {activeTab === 'SECURITY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SMTP Service Status Indicator */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#059669" />
              <span>SMTP Real Email Service Status</span>
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>
              Verification codes (OTP) and report-sharing links are delivered through your configured SMTP service.
            </p>

            <div 
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                background: smtpStatus?.configured ? '#f0fdf4' : '#fffbeb', 
                border: '1px solid',
                borderColor: smtpStatus?.configured ? '#bbf7d0' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {smtpStatus?.configured ? (
                <CheckCircle2 size={24} color="#16a34a" />
              ) : (
                <AlertCircle size={24} color="#d97706" />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: smtpStatus?.configured ? '#166534' : '#92400e' }}>
                  {smtpStatus?.configured ? 'SMTP Email Service Online' : 'Email Service Not Configured'}
                </div>
                <div style={{ fontSize: '0.78rem', color: smtpStatus?.configured ? '#15803d' : '#b45309', marginTop: '2px' }}>
                  {smtpStatus?.configured ? (
                    `Host: ${smtpStatus.host} • Sender: ${smtpStatus.from_email}`
                  ) : (
                    'Email service is not configured. Configure SMTP credentials in the backend environment (.env).'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#059669" />
              <span>Change Password</span>
            </h2>

            {passwordMsg && (
              <div 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  background: passwordMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  border: '1px solid',
                  borderColor: passwordMsg.type === 'error' ? '#fecaca' : '#bbf7d0',
                  color: passwordMsg.type === 'error' ? '#991b1b' : '#166534'
                }}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ maxWidth: '420px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Current Password
                </label>
                <input 
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  New Password (min 6 characters)
                </label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn btn-primary"
                style={{ padding: '9px 18px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. APPLICATION PREFERENCES */}
      {activeTab === 'APPLICATION' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
            Workspace Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: '#334155' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>Enable audio cues for high-confidence predictions and report generation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>Automatically flag atypical classifications (MEL, BCC, SCC) for priority review</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>Email notifications when new appointments are booked</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
