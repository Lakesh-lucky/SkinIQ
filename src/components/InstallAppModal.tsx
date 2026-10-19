import React, { useState, useEffect } from 'react';
import { Smartphone, Laptop, Download, CheckCircle2, Share2, PlusSquare, Sparkles, X, Terminal, Shield } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'mobile' | 'ios' | 'laptop' | 'apk'>('mobile');

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      soundFx.playClick();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid #059669',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              <Smartphone size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Convert & Install as App
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '0.78rem' }}>
                Run DermaClass-Net as a Standalone App on Mobile & Laptop
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '4px 12px 0',
            gap: '6px'
          }}
        >
          <button
            onClick={() => setActiveTab('mobile')}
            style={{
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'mobile' ? 700 : 600,
              color: activeTab === 'mobile' ? '#059669' : '#64748b',
              borderBottom: activeTab === 'mobile' ? '3px solid #059669' : '3px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            📱 Android Phone
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            style={{
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'ios' ? 700 : 600,
              color: activeTab === 'ios' ? '#059669' : '#64748b',
              borderBottom: activeTab === 'ios' ? '3px solid #059669' : '3px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            🍏 Apple iPhone/iPad
          </button>
          <button
            onClick={() => setActiveTab('laptop')}
            style={{
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'laptop' ? 700 : 600,
              color: activeTab === 'laptop' ? '#059669' : '#64748b',
              borderBottom: activeTab === 'laptop' ? '3px solid #059669' : '3px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            💻 Laptop / PC
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            style={{
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'apk' ? 700 : 600,
              color: activeTab === 'apk' ? '#059669' : '#64748b',
              borderBottom: activeTab === 'apk' ? '3px solid #059669' : '3px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            ⚡ APK / Store App
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'mobile' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="badge badge-benign">Android PWA Installation</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Works on Chrome, Edge, Samsung Internet</span>
              </div>

              {deferredPrompt ? (
                <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1.5px solid #10b981', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: '#065f46', marginBottom: '10px' }}>
                    ✨ Direct 1-Click Install Available!
                  </p>
                  <button
                    onClick={handleNativeInstall}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  >
                    <Download size={18} />
                    <span>Install DermaClass App Now</span>
                  </button>
                </div>
              ) : (
                <ol style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '0.88rem', color: '#334155' }}>
                  <li>Open this website in <strong>Google Chrome</strong> on your Android phone.</li>
                  <li>Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.</li>
                  <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>The app icon will appear on your phone's home screen and app drawer, opening full-screen like a native app!</li>
                </ol>
              )}
            </div>
          )}

          {activeTab === 'ios' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="badge badge-cyan">iOS Safari Installation</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>iPhone & iPad (iOS 14+)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</div>
                  <div>Open this website in <strong>Safari</strong> on your iPhone or iPad.</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Tap the <strong>Share button</strong> (<Share2 size={16} color="#0284c7" />) at the bottom bar.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>3</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Scroll down and tap <strong>"Add to Home Screen"</strong> (<PlusSquare size={16} color="#059669" />).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>4</div>
                  <div>Tap <strong>"Add"</strong> in the top-right. DermaClass-Net will now launch full-screen from your iPhone screen!</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'laptop' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="badge badge-violet">Laptop & Desktop App</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Windows, Mac & Linux</span>
              </div>

              <ol style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '0.88rem', color: '#334155' }}>
                <li>Open this website in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on your laptop.</li>
                <li>Look at the right side of the address bar (URL bar). You will see an <strong>Install icon (🖥️ or ➕)</strong>.</li>
                <li>Click <strong>"Install DermaClass-Net"</strong>.</li>
                <li>It will launch in its own standalone desktop window with a desktop shortcut!</li>
              </ol>
            </div>
          )}

          {activeTab === 'apk' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="badge badge-cyan">Build Standalone APK / iOS App</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Capacitor / Android Studio</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '12px' }}>
                To bundle this project into a native <strong>Android .APK</strong> or <strong>Google Play Store app</strong>, you can use <strong>Capacitor</strong> in 3 terminal steps:
              </p>

              <div style={{ background: '#0f172a', color: '#38bdf8', padding: '14px', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '12px' }}>
                <code>
                  # 1. Install Capacitor<br/>
                  npm install @capacitor/core @capacitor/cli @capacitor/android<br/>
                  <br/>
                  # 2. Initialize Capacitor & Add Android<br/>
                  npx cap init "DermaClass" "com.dermaclass.app"<br/>
                  npx cap add android<br/>
                  <br/>
                  # 3. Build & Open in Android Studio<br/>
                  npm run build<br/>
                  npx cap sync<br/>
                  npx cap open android
                </code>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Ready to compile into native APK, Google Play Store AAB, or iOS IPA.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
            <Shield size={14} color="#059669" />
            <span>PWA Enabled • Offline Capable • Zero Storage Limits</span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="btn btn-secondary btn-sm"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
