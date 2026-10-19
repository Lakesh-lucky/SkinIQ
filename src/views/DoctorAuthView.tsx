import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  KeyRound, 
  Eye, 
  EyeOff,
  Clock,
  ArrowLeft,
  User,
  FileBadge,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundFx } from '../utils/audio';
import { OtpInputBox } from '../components/auth/OtpInputBox';
import { MedicalMesh3D } from '../components/three/MedicalMesh3D';
import { SkinIQLogo } from '../assets/SkinIQLogo';
import './DoctorAuthView.css';

type AuthStep = 'CREDENTIALS' | 'VERIFY_OTP' | 'FORGOT_PASSWORD' | 'FORGOT_VERIFY' | 'FORGOT_RESET' | 'REGISTER';

export const DoctorAuthView: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { 
    login, 
    verifyLoginOtp, 
    resendLoginOtp, 
    verifySignupOtp, 
    resendSignupOtp, 
    forgotPassword, 
    verifyResetOtp, 
    resetPassword, 
    registerDoctor 
  } = useAuth();

  const [step, setStep] = useState<AuthStep>('CREDENTIALS');
  const [otpFlow, setOtpFlow] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  
  // Forgot Password Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Register Fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLicense, setRegLicense] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Handle Login Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMessage({ type: 'error', text: 'Please enter both your medical email address and password.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Authenticating credentials and dispatching verification code...' });
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success && res.requires_otp) {
      soundFx.playSuccess();
      setOtpFlow('LOGIN');
      setOtpCode('');
      setMaskedEmail(res.masked_email || email);
      setCooldownRemaining(res.cooldown_seconds || 60);
      setStatusMessage({ 
        type: 'success', 
        text: 'Verification code sent to your registered email address.' 
      });
      setStep('VERIFY_OTP');
    } else {
      soundFx.playError();
      const err = res.error || 'Authentication failed. Please verify your credentials.';
      setStatusMessage({ type: 'error', text: err });
    }
  };

  // Handle Login / Signup Step 2: Verify OTP
  const handleOtpVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (code.length < 6) {
      setStatusMessage({ type: 'error', text: 'Please enter the complete 6-digit verification code.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Verifying one-time code...' });
    setIsSubmitting(true);

    const res = otpFlow === 'SIGNUP' 
      ? await verifySignupOtp(email || regEmail, code)
      : await verifyLoginOtp(email, code);
    setIsSubmitting(false);

    if (res.success) {
      soundFx.playSuccess();
      setIsVerifiedSuccess(true);
      setStatusMessage({ type: 'success', text: 'Verification successful! Loading clinical workspace...' });
      setTimeout(() => {
        onSuccess();
      }, 750);
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Invalid or expired verification code.' });
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (cooldownRemaining > 0 || isSubmitting) return;
    setStatusMessage({ type: 'info', text: 'Dispatching new verification code...' });
    setIsSubmitting(true);

    const targetEmail = otpFlow === 'SIGNUP' ? regEmail : email;
    const res = otpFlow === 'SIGNUP'
      ? await resendSignupOtp(targetEmail)
      : await resendLoginOtp(targetEmail);
    setIsSubmitting(false);

    if (res.success) {
      soundFx.playSuccess();
      setCooldownRemaining(res.cooldown_seconds || 60);
      setStatusMessage({ type: 'success', text: 'A fresh verification code has been dispatched.' });
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Unable to resend code. Please try again later.' });
    }
  };

  // Handle Forgot Password Step 1: Request Code
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setStatusMessage({ type: 'error', text: 'Please provide your registered doctor email.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Locating account and generating recovery code...' });
    setIsSubmitting(true);

    const res = await forgotPassword(forgotEmail);
    setIsSubmitting(false);

    if (res.success) {
      soundFx.playSuccess();
      setMaskedEmail(res.masked_email || forgotEmail);
      setStatusMessage({ type: 'success', text: 'Password reset code dispatched to your email.' });
      setStep('FORGOT_VERIFY');
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Failed to dispatch reset code.' });
    }
  };

  // Handle Forgot Password Step 2: Verify Code
  const handleForgotVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp.length < 6) {
      setStatusMessage({ type: 'error', text: 'Please enter the complete 6-digit recovery code.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Verifying password reset code...' });
    setIsSubmitting(true);

    const res = await verifyResetOtp(forgotEmail, forgotOtp);
    setIsSubmitting(false);

    if (res.success) {
      soundFx.playSuccess();
      setStatusMessage({ type: 'success', text: 'Code verified. Enter your new password below.' });
      setStep('FORGOT_RESET');
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Invalid or expired recovery code.' });
    }
  };

  // Handle Forgot Password Step 3: Set New Password
  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 8 characters in length.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Securing new password...' });
    setIsSubmitting(true);

    const res = await resetPassword(forgotEmail, forgotOtp, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      soundFx.playSuccess();
      setStatusMessage({ type: 'success', text: 'Password updated successfully! Please sign in with your new credentials.' });
      setStep('CREDENTIALS');
      setEmail(forgotEmail);
      setPassword('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Failed to reset password.' });
    }
  };

  // Handle Doctor Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPassword) {
      setStatusMessage({ type: 'error', text: 'Please fill out all required clinician registration fields.' });
      return;
    }
    if (regPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 8 characters in length.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Creating clinician record and dispatching activation code...' });
    setIsSubmitting(true);

    const res = await registerDoctor({
      full_name: regFullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim() || undefined,
      license_number: regLicense.trim() || undefined
    });

    setIsSubmitting(false);

    if (res.success && res.requires_otp) {
      soundFx.playSuccess();
      setOtpFlow('SIGNUP');
      setEmail(regEmail.trim());
      setMaskedEmail(res.masked_email || regEmail.trim());
      setCooldownRemaining(res.cooldown_seconds || 60);
      setStatusMessage({ 
        type: 'success', 
        text: 'Account staged! Please enter the 6-digit verification code sent to your medical email.' 
      });
      setStep('VERIFY_OTP');
    } else {
      soundFx.playError();
      setStatusMessage({ type: 'error', text: res.error || 'Registration failed. Please check your details.' });
    }
  };

  return (
    <div className="auth-viewport-wrapper">
      {/* Subtle Ambient Radial Backdrops */}
      <div className="auth-ambient-blooms">
        <div className="auth-bloom-1" />
        <div className="auth-bloom-2" />
      </div>

      {/* Main Clinical Auth Card */}
      <div className="auth-card-container">
        
        {/* Top Header with Brand Identity */}
        <div className="auth-card-header">
          <div className="auth-brand-icon-wrapper">
            <SkinIQLogo variant="icon" size={42} />
          </div>
          <h1 className="auth-brand-title">
            Skin<span className="brand-accent">IQ</span>
          </h1>
          <p className="auth-brand-subtitle">
            {step === 'REGISTER' 
              ? 'Clinician Registration & Account Activation' 
              : step === 'FORGOT_PASSWORD' || step === 'FORGOT_VERIFY' || step === 'FORGOT_RESET'
              ? 'Account Security & Credential Recovery'
              : 'Smarter Skin Insights — Clinician Portal'}
          </p>
        </div>

        {/* Status Alert Message */}
        {statusMessage && (
          <div className={`auth-alert-banner ${statusMessage.type}`} role="alert">
            {statusMessage.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            {statusMessage.type === 'success' && <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            {statusMessage.type === 'info' && <RefreshCw size={18} className="animate-spin" style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span style={{ flex: 1 }}>{statusMessage.text}</span>
          </div>
        )}

        {/* ==================== STEP 1: CREDENTIALS (LOGIN) ==================== */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleCredentialsSubmit} className="auth-form-content">
            
            {/* Email Field */}
            <div className="auth-form-group">
              <label htmlFor="login-email" className="auth-field-label">
                Doctor Email Address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input 
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-form-group">
              <div className="auth-field-label-row">
                <label htmlFor="login-password" className="auth-field-label">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setStatusMessage(null);
                    setStep('FORGOT_PASSWORD');
                  }}
                  className="auth-forgot-link"
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-text-input with-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-toggle-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Requesting Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Registration Link */}
            <div className="auth-switch-step-footer">
              <span>Need a clinician account?</span>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setStep('REGISTER');
                }}
                className="auth-switch-link-btn"
              >
                Register here
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP 2: VERIFY OTP ==================== */}
        {step === 'VERIFY_OTP' && (
          <div className="auth-form-content">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                border: '1px solid #ccfbf1'
              }}>
                <KeyRound size={22} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                {otpFlow === 'SIGNUP' ? 'Activate Clinician Profile' : 'Two-Factor Authentication'}
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Enter the 6-digit verification code dispatched to:
              </p>
              <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f766e', marginTop: '4px' }}>
                {maskedEmail}
              </div>
            </div>

            {/* Interactive 6-Digit Individual Input Boxes */}
            <OtpInputBox
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(code) => handleOtpVerify(code)}
              disabled={isSubmitting || isVerifiedSuccess}
            />

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => handleOtpVerify()}
              disabled={isSubmitting || otpCode.length < 6 || isVerifiedSuccess}
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : isVerifiedSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Verification Successful</span>
                </>
              ) : (
                <>
                  <span>{otpFlow === 'SIGNUP' ? 'Activate Account & Enter' : 'Verify & Enter Workspace'}</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>

            {/* Resend Cooldown UI */}
            <div className="auth-switch-step-footer">
              <span>Didn't receive the code? </span>
              {cooldownRemaining > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B', fontWeight: 600 }}>
                  <Clock size={13} />
                  Resend in {cooldownRemaining}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="auth-switch-link-btn"
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Back Button */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setStep(otpFlow === 'SIGNUP' ? 'REGISTER' : 'CREDENTIALS');
                }}
                className="auth-back-link-btn"
              >
                <ArrowLeft size={13} />
                <span>{otpFlow === 'SIGNUP' ? 'Back to Registration' : 'Back to Sign In'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP: FORGOT PASSWORD ==================== */}
        {step === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotPasswordSubmit} className="auth-form-content">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Reset Password
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Enter your registered doctor email to receive a secure recovery code.
              </p>
            </div>

            <div className="auth-form-group">
              <label htmlFor="forgot-email" className="auth-field-label">
                Doctor Medical Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input 
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="doctor@hospital.org"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Dispatching Code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setStep('CREDENTIALS');
                }}
                className="auth-back-link-btn"
              >
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP: FORGOT VERIFY ==================== */}
        {step === 'FORGOT_VERIFY' && (
          <form onSubmit={handleForgotVerifySubmit} className="auth-form-content">
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Enter Recovery Code
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Enter the 6-digit recovery code sent to {maskedEmail}
              </p>
            </div>

            <OtpInputBox
              value={forgotOtp}
              onChange={setForgotOtp}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting || forgotOtp.length < 6}
              className="auth-submit-btn"
            >
              {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : 'Verify Code'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setStep('FORGOT_PASSWORD');
                }}
                className="auth-back-link-btn"
              >
                <ArrowLeft size={13} />
                <span>Change Email</span>
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP: FORGOT RESET ==================== */}
        {step === 'FORGOT_RESET' && (
          <form onSubmit={handleForgotResetSubmit} className="auth-form-content">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Create New Password
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Please choose a strong password with at least 8 characters.
              </p>
            </div>

            <div className="auth-form-group">
              <label htmlFor="new-password" className="auth-field-label">
                New Password (min 8 chars)
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-text-input with-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="auth-eye-toggle-btn"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="confirm-password" className="auth-field-label">
                Confirm New Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Sign In</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ==================== STEP: REGISTER DOCTOR ==================== */}
        {step === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form-content">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Clinician Registration
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Register your medical practitioner credentials for clinical AI access.
              </p>
            </div>

            {/* Full Name */}
            <div className="auth-form-group">
              <label htmlFor="reg-fullname" className="auth-field-label">
                Full Name & Title
              </label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder="Dr. Evelyn Vance, MD"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            {/* Medical Email */}
            <div className="auth-form-group">
              <label htmlFor="reg-email" className="auth-field-label">
                Official Medical Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="doctor@hospital.org"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-form-group">
              <label htmlFor="reg-password" className="auth-field-label">
                Password (min 8 chars)
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="auth-text-input with-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="auth-eye-toggle-btn"
                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Medical License */}
            <div className="auth-form-group">
              <label htmlFor="reg-license" className="auth-field-label">
                Medical License / Registration No. <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div className="auth-input-wrapper">
                <FileBadge size={16} className="auth-input-icon" />
                <input
                  id="reg-license"
                  type="text"
                  placeholder="MD-84920-DERM"
                  value={regLicense}
                  onChange={(e) => setRegLicense(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="auth-form-group">
              <label htmlFor="reg-phone" className="auth-field-label">
                Contact Phone <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div className="auth-input-wrapper">
                <Phone size={16} className="auth-input-icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <span>Register & Request Verification</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Back to sign in */}
            <div className="auth-switch-step-footer">
              <span>Already have an active profile?</span>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setStep('CREDENTIALS');
                }}
                className="auth-switch-link-btn"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default DoctorAuthView;
