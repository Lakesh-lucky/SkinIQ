import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  FileText, 
  Activity, 
  Calendar, 
  Share2, 
  ShieldAlert 
} from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { InAppNotification } from '../types';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface DoctorNotificationsViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const DoctorNotificationsView: React.FC<DoctorNotificationsViewProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notifications.list();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      } else {
        setError('Failed to load notifications.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    soundFx.playClick();
    try {
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'DOCTOR_REVIEW':
        return <Activity size={18} color="#059669" />;
      case 'APPOINTMENT':
        return <Calendar size={18} color="#2563eb" />;
      case 'REPORT':
        return <FileText size={18} color="#7c3aed" />;
      case 'REPORT_SHARED':
        return <Share2 size={18} color="#0284c7" />;
      default:
        return <Bell size={18} color="#475569" />;
    }
  };

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
            Doctor Notification Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Real event telemetry from AI scan inference, review submissions, and consultations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600 }}
          >
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Loading & Error */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading notifications...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '24px' }}>
          <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '6px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Notifications List */}
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
          {notifications.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                You're all caught up.
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: '6px auto 0' }}>
                No active notifications found in your clinician event queue.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: n.is_read ? '#ffffff' : '#f0fdf4'
                  }}
                >
                  <div 
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '8px', 
                      background: n.is_read ? '#f8fafc' : '#ffffff', 
                      border: '1px solid #e2e8f0',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getIconForType(n.notification_type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
