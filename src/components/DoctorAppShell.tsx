import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Users, 
  History, 
  FileText, 
  Calendar, 
  Bell, 
  Settings, 
  LogOut, 
  Search, 
  ChevronRight,
  PanelLeftClose,
  Plus,
  HelpCircle,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { SkinIQLogo } from '../assets/SkinIQLogo';
import { useAuth } from '../context/AuthContext';
import { soundFx } from '../utils/audio';
import { api } from '../services/api';
import { InAppNotification, RegisteredPatient } from '../types';
import { ClinicalHelpModal } from './ClinicalHelpModal';
import './DoctorSidebar.css';

export type DoctorNavTab = 
  | 'dashboard'
  | 'patients'
  | 'patientProfile'
  | 'newAnalysis'
  | 'analysisResult'
  | 'scanHistory'
  | 'reports'
  | 'appointments'
  | 'notifications'
  | 'settings';

interface DoctorAppShellProps {
  currentTab: DoctorNavTab;
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
  children: React.ReactNode;
}

const TAB_LABELS: Record<DoctorNavTab, string> = {
  dashboard: 'Clinical Dashboard',
  patients: 'Patient Directory',
  patientProfile: 'Patient Profile',
  newAnalysis: 'New Diagnostic Workspace',
  analysisResult: 'Analysis & Telemetry',
  scanHistory: 'Dermoscopic Scan History',
  reports: 'Clinical Reports Archive',
  appointments: 'Patient Consultations',
  notifications: 'Clinical Alerts',
  settings: 'Doctor Settings'
};

const SIDEBAR_STORAGE_KEY = 'dermaclass_sidebar_collapsed';

export const DoctorAppShell: React.FC<DoctorAppShellProps> = ({
  currentTab,
  onNavigate,
  children
}) => {
  const { currentUser, logout } = useAuth();
  
  // Sidebar State: Collapsed or Expanded (Persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Mobile Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Clinical Help & Protocol Modal
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  
  // Notifications Popover
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global Patient Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RegisteredPatient[]>([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recent Scans (Real data only)
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Primary Sidebar Toggle (via logo/brand area or keyboard shortcut)
  const toggleSidebar = () => {
    soundFx.playClick();
    if (window.innerWidth <= 1024) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (notifOpen) setNotifOpen(false);
        if (searchDropdownOpen) setSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, notifOpen, searchDropdownOpen]);

  // Poll for real in-app notifications
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifs = async () => {
      try {
        const res = await api.notifications.list();
        if (res.success) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unread_count || 0);
        }
      } catch {
        // Silently handle background poll error
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch real recent scans from API
  useEffect(() => {
    if (!currentUser) return;
    const fetchRecentScans = async () => {
      try {
        const res = await api.scans.list();
        if (res.success && res.scans) {
          setRecentScans(res.scans.slice(0, 5));
        }
      } catch {
        // Silently handle
      }
    };

    fetchRecentScans();
  }, [currentUser, currentTab]);

  // Handle Global Patient Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.patients.list();
        if (res.success && res.patients) {
          const q = searchQuery.toLowerCase();
          const filtered = res.patients.filter(p => 
            p.patient_name.toLowerCase().includes(q) || 
            p.patient_code.toLowerCase().includes(q) ||
            p.phone.includes(q)
          );
          setSearchResults(filtered.slice(0, 6));
          setSearchDropdownOpen(true);
        }
      } catch {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const handleNavClick = (tab: DoctorNavTab, param?: any) => {
    soundFx.playClick();
    onNavigate(tab, param);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Primary Navigation Items with exact hierarchy
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={18} /> },
    { id: 'patients', label: 'Patients', icon: <Users size={18} /> },
    { id: 'scanHistory', label: 'Scan History', icon: <History size={18} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  const doctorCode = currentUser?.doctor_profile?.doctor_code || 'DR001';
  const doctorName = currentUser?.full_name || 'Clinician';
  const avatarInitials = doctorName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DR';

  return (
    <div className="chatgpt-app-container">
      
      {/* ---------------- MOBILE BACKDROP OVERLAY ---------------- */}
      <div 
        className={`sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => {
          soundFx.playClick();
          setMobileMenuOpen(false);
        }}
        aria-hidden="true"
      />

      {/* ---------------- CHATGPT-STYLE SIDEBAR ---------------- */}
      <aside 
        className={`chatgpt-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${mobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Clinician Workspace Sidebar"
      >
        
        {/* 1. TOP SECTION: Logo Toggle, User Profile, and Primary Action */}
        <div className="sidebar-top-section">
          
          {/* Logo / Brand Area as Primary Sidebar Toggle */}
          <button 
            type="button"
            className="sidebar-brand-toggle"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            <SkinIQLogo variant="icon" size={32} />
            {!isCollapsed && (
              <>
                <div className="sidebar-brand-text">
                  <div className="sidebar-brand-name">
                    Skin<span>IQ</span>
                  </div>
                  <div className="sidebar-brand-sub">
                    Smarter Skin Insights
                  </div>
                </div>
                <div className="sidebar-brand-chevron" title="Collapse sidebar">
                  <PanelLeftClose size={16} />
                </div>
              </>
            )}
            {isCollapsed && (
              <span className="sidebar-tooltip">Expand sidebar (Ctrl+B)</span>
            )}
          </button>

          {/* Clinician Profile Card — Anchored at TOP */}
          <div 
            className="sidebar-profile-card"
            title={`${doctorName} (${doctorCode})`}
          >
            <div className="sidebar-profile-avatar">
              {avatarInitials}
            </div>
            {!isCollapsed && (
              <div className="sidebar-profile-details">
                <div className="sidebar-profile-name">{doctorName}</div>
                <div className="sidebar-profile-code">ID: {doctorCode} • On Duty</div>
              </div>
            )}
            {isCollapsed && (
              <span className="sidebar-tooltip">{doctorName} (ID: {doctorCode})</span>
            )}
          </div>

          {/* '+ New Analysis' Primary Action Button */}
          <button
            type="button"
            onClick={() => handleNavClick('newAnalysis')}
            className={`sidebar-new-btn ${isCollapsed ? 'compact' : ''} ${currentTab === 'newAnalysis' ? 'active' : ''}`}
            title="Start New Lesion Analysis"
            aria-label="New Analysis"
          >
            <span className="sidebar-new-btn-icon">
              <Plus size={18} />
            </span>
            {!isCollapsed && (
              <>
                <span>New Analysis</span>
                <span className="sidebar-shortcut-badge">+</span>
              </>
            )}
            {isCollapsed && (
              <span className="sidebar-tooltip">New Analysis</span>
            )}
          </button>
        </div>

        {/* 2. MIDDLE SECTION: Navigation & Real History (Scrolls independently) */}
        <div className="sidebar-middle-section">
          
          {/* Clinical Workspace Group Title */}
          {!isCollapsed && (
            <div className="sidebar-group-title">
              <span>Clinical Workspace</span>
            </div>
          )}

          <nav className="sidebar-nav-list">
            {navItems.map(item => {
              const isActive = currentTab === item.id || 
                (item.id === 'patients' && currentTab === 'patientProfile');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id as DoctorNavTab)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {!isCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
                  
                  {/* Badge in expanded mode */}
                  {!isCollapsed && item.badge !== undefined && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}

                  {/* Dot indicator in collapsed mode */}
                  {isCollapsed && item.badge !== undefined && (
                    <span className="sidebar-collapsed-dot" />
                  )}

                  {/* Floating Tooltip in collapsed mode */}
                  {isCollapsed && (
                    <span className="sidebar-tooltip">
                      {item.label} {item.badge !== undefined ? `(${item.badge})` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Recent Scans (Only real application records) */}
          {!isCollapsed && (
            <div className="sidebar-recent-section">
              <div className="sidebar-group-title">
                <span>Recent Scans</span>
                {recentScans.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => handleNavClick('scanHistory')} 
                    className="view-all-link"
                    title="View complete scan history"
                  >
                    View all
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="sidebar-empty-state">
                  No recent scans recorded
                </div>
              ) : (
                recentScans.map(scan => {
                  return (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => handleNavClick('analysisResult', scan.id)}
                      className={`sidebar-recent-item ${currentTab === 'analysisResult' ? 'active' : ''}`}
                      title={`Review scan ${scan.scan_code}`}
                    >
                      <Clock size={13} className="sidebar-recent-icon" />
                      <span className="sidebar-recent-text">
                        {scan.patient_name || scan.scan_code}
                      </span>
                      <ChevronRight size={13} className="sidebar-recent-arrow" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* System & Support Group Title */}
          {!isCollapsed && (
            <div className="sidebar-group-title" style={{ marginTop: '16px' }}>
              <span>System & Support</span>
            </div>
          )}

          {/* Settings & Help Navigation Items */}
          <nav className="sidebar-nav-list">
            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className={`sidebar-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              title={isCollapsed ? "Settings" : undefined}
              aria-label="Settings"
            >
              <span className="sidebar-nav-icon"><Settings size={18} /></span>
              {!isCollapsed && <span className="sidebar-nav-label">Settings</span>}
              {isCollapsed && <span className="sidebar-tooltip">Settings</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setHelpModalOpen(true);
              }}
              className="sidebar-nav-item"
              title={isCollapsed ? "Clinical Protocols & Help" : undefined}
              aria-label="Clinical Protocols & Help"
            >
              <span className="sidebar-nav-icon"><HelpCircle size={18} /></span>
              {!isCollapsed && <span className="sidebar-nav-label">Clinical Help</span>}
              {isCollapsed && <span className="sidebar-tooltip">Clinical Protocols & Help</span>}
            </button>
          </nav>
        </div>

        {/* 3. BOTTOM SECTION: Anchored Dedicated Sign Out & Status */}
        <div className="sidebar-bottom-section">
          
          {/* Dedicated Full-Width Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              logout();
            }}
            className="sidebar-signout-btn"
            title="Sign Out of Session"
            aria-label="Sign Out"
          >
            <LogOut size={17} className="sidebar-signout-icon" />
            {!isCollapsed && <span className="sidebar-signout-label">Sign Out</span>}
            {isCollapsed && <span className="sidebar-tooltip">Sign Out</span>}
          </button>

          {/* Clinic Accreditation Badge */}
          {!isCollapsed && (
            <div className="sidebar-clinic-pill">
              <span className="clinic-status-indicator" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                SkinIQ Clinical Platform • Active
              </span>
            </div>
          )}

        </div>
      </aside>

      {/* ---------------- MAIN CONTENT WRAPPER ---------------- */}
      <div className="chatgpt-main-wrapper">
        
        {/* Sticky Top Header with Clean Brand & Breadcrumbs (No duplicate toggle) */}
        <header className="chatgpt-top-header">
          
          {/* Left: Mobile Brand Toggle OR Desktop Breadcrumb */}
          <div className="top-header-left">
            
            {/* Mobile Brand Toggle: Tapping logo opens mobile drawer */}
            <button
              type="button"
              className="mobile-brand-toggle"
              onClick={toggleSidebar}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <SkinIQLogo variant="compact" size={28} />
            </button>

            {/* Desktop Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="header-breadcrumb">
              <button 
                type="button"
                className="header-breadcrumb-link"
                onClick={() => handleNavClick('dashboard')}
                title="Go to Clinical Dashboard"
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </button>
              {currentTab !== 'dashboard' && (
                <>
                  <span className="header-breadcrumb-separator">/</span>
                  <span className="header-breadcrumb-current">
                    {TAB_LABELS[currentTab] || 'Workspace'}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Center: Global Patient Search */}
          <div ref={searchRef} className="top-header-search">
            <div style={{ position: 'relative' }}>
              <Search size={15} className="search-input-icon" />
              <input 
                type="text"
                placeholder="Search Patient ID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchDropdownOpen(true); }}
                className="search-input-box"
              />
            </div>

            {/* Search Dropdown Matches */}
            {searchDropdownOpen && searchResults.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '6px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                  PATIENT MATCHES
                </div>
                {searchResults.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSearchDropdownOpen(false);
                      setSearchQuery('');
                      handleNavClick('patientProfile', p.id);
                    }}
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                        {p.patient_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.gender}, {p.age} yrs • {p.city}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', background: '#f0fdf9', padding: '3px 8px', borderRadius: '4px' }}>
                      {p.patient_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Notifications & Quick Doctor Pill */}
          <div className="top-header-right">
            
            {/* Notifications Popover */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button 
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen && unreadCount > 0) handleMarkAllRead();
                }}
                className="header-notif-btn"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="notif-badge-count">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                    zIndex: 200,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Clinical Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        type="button"
                        onClick={handleMarkAllRead} 
                        style={{ background: 'none', border: 'none', color: '#0FAE9B', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          style={{ 
                            padding: '10px 16px', 
                            borderBottom: '1px solid #f8fafc',
                            background: n.is_read ? '#ffffff' : '#f0fdf9'
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}>{n.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{n.message}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div 
                    onClick={() => { setNotifOpen(false); handleNavClick('notifications'); }}
                    style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: '#0FAE9B', fontWeight: 700, cursor: 'pointer', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
                  >
                    View All Notifications
                  </div>
                </div>
              )}
            </div>

            {/* Doctor Status Pill - fixed overflow/alignment */}
            <div className="header-doctor-pill">
              <div className="header-doctor-avatar" style={{ flexShrink: 0 }}>
                {avatarInitials}
              </div>
              <div className="doctor-text-wrapper" style={{ lineHeight: 1.2, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doctorName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#0891b2', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ID: {doctorCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { soundFx.playClick(); logout(); }}
                title="Sign Out"
                aria-label="Sign Out"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <LogOut size={16} />
              </button>
            </div>

          </div>
        </header>

        {/* Main Content Area */}
        <main className="chatgpt-main-content">
          {children}
        </main>

      </div>

      {/* Clinical Help & Protocol Modal */}
      <ClinicalHelpModal 
        isOpen={helpModalOpen} 
        onClose={() => setHelpModalOpen(false)} 
      />

    </div>
  );
};

export default DoctorAppShell;
