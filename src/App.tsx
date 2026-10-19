import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DoctorAppShell, DoctorNavTab } from './components/DoctorAppShell';
import { DoctorAuthView } from './views/DoctorAuthView';
import { DoctorDashboardView } from './views/DoctorDashboardView';
import { PatientManagementView } from './views/PatientManagementView';
import { PatientProfileView } from './views/PatientProfileView';
import { NewAnalysisWorkspaceView } from './views/NewAnalysisWorkspaceView';
import { AnalysisResultView } from './views/AnalysisResultView';
import { ReportsListView } from './views/ReportsListView';
import { ScanHistoryView } from './views/ScanHistoryView';
import { DoctorAppointmentsView } from './views/DoctorAppointmentsView';
import { DoctorNotificationsView } from './views/DoctorNotificationsView';
import { DoctorSettingsView } from './views/DoctorSettingsView';
import { SharedReportView } from './views/SharedReportView';
import SplashScreenView from './views/SplashScreenView';
import { SkinIQLogo } from './assets/SkinIQLogo';

type AppScreen = 'splash' | 'auth' | 'app';

const DoctorAppRouter: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<DoctorNavTab>('dashboard');
  const [navParam, setNavParam] = useState<any>(null);
  const [sharedToken, setSharedToken] = useState<string | null>(null);
  // Track which top-level screen to show (splash / auth / app)
  const [screen, setScreen] = useState<AppScreen>('splash');

  // Check URL path or hash for shared report links: /shared-report/<token>
  useEffect(() => {
    const parseSharedToken = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      if (pathname.includes('/shared-report/')) {
        const parts = pathname.split('/shared-report/');
        if (parts[1]) return parts[1].split('/')[0];
      }
      if (hash.includes('#/shared-report/')) {
        const parts = hash.split('#/shared-report/');
        if (parts[1]) return parts[1].split('/')[0];
      }
      const queryToken = searchParams.get('sharedToken') || searchParams.get('reportToken');
      if (queryToken) return queryToken;
      return null;
    };

    const token = parseSharedToken();
    if (token) setSharedToken(token);
  }, []);

  // Once auth state resolves, decide initial screen
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && currentUser) {
      // Already logged in — skip splash, go straight to app
      setScreen('app');
    }
    // If not authenticated — stay on splash (default)
  }, [isLoading, isAuthenticated, currentUser]);

  const handleNavigate = (tab: DoctorNavTab, param?: any) => {
    if (param !== undefined) setNavParam(param);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnFromShared = () => {
    setSharedToken(null);
    window.history.pushState({}, '', '/');
  };

  // Public shared report (no auth required)
  if (sharedToken) {
    return (
      <SharedReportView
        token={sharedToken}
        onReturnToLogin={handleReturnFromShared}
      />
    );
  }

  // Auth initialising
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '3px solid #ccfbf1',
          borderTopColor: '#0d9488',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
          marginBottom: '20px',
        }} />
        {/* SkinIQ unified logo */}
        <div style={{ marginBottom: '8px' }}>
          <SkinIQLogo variant="compact" size={38} />
        </div>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
          Initializing clinical workspace...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ===== SPLASH SCREEN (unauthenticated default) =====
  if (screen === 'splash' && !isAuthenticated) {
    return (
      <SplashScreenView
        onSignIn={() => setScreen('auth')}
        onGetStarted={() => setScreen('auth')}
      />
    );
  }

  // ===== AUTHENTICATION SCREEN =====
  if (!isAuthenticated || !currentUser) {
    return (
      <DoctorAuthView
        onSuccess={() => {
          setCurrentTab('dashboard');
          setScreen('app');
        }}
      />
    );
  }

  // ===== AUTHENTICATED APP =====
  return (
    <DoctorAppShell currentTab={currentTab} onNavigate={handleNavigate}>
      {currentTab === 'dashboard' && (
        <DoctorDashboardView onNavigate={handleNavigate} />
      )}
      {currentTab === 'patients' && (
        <PatientManagementView onNavigate={handleNavigate} />
      )}
      {currentTab === 'patientProfile' && (
        <PatientProfileView
          patientId={navParam}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('patients')}
        />
      )}
      {currentTab === 'newAnalysis' && (
        <NewAnalysisWorkspaceView
          initialPatientId={navParam}
          onNavigate={handleNavigate}
        />
      )}
      {currentTab === 'analysisResult' && (
        <AnalysisResultView
          scanId={navParam}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('scanHistory')}
        />
      )}
      {currentTab === 'scanHistory' && (
        <ScanHistoryView onNavigate={handleNavigate} />
      )}
      {currentTab === 'reports' && (
        <ReportsListView onNavigate={handleNavigate} />
      )}
      {currentTab === 'appointments' && (
        <DoctorAppointmentsView onNavigate={handleNavigate} />
      )}
      {currentTab === 'notifications' && (
        <DoctorNotificationsView onNavigate={handleNavigate} />
      )}
      {currentTab === 'settings' && (
        <DoctorSettingsView />
      )}
    </DoctorAppShell>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SkinIQ App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050c1a 0%, #0c1832 50%, #0f172a 100%)',
          color: '#f8fafc',
          padding: '24px',
          textAlign: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
            Skin<span style={{ color: '#06b6d4' }}>IQ</span> Workspace
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '24px', fontSize: '0.95rem' }}>
            A temporary display issue occurred. Click below to reload your clinical workspace.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reload SkinIQ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DoctorAppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
