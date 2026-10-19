import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  PlusCircle, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Phone, 
  FileText,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { AppointmentRecord, RegisteredPatient } from '../types';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface DoctorAppointmentsViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const DoctorAppointmentsView: React.FC<DoctorAppointmentsViewProps> = ({ onNavigate }) => {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [patients, setPatients] = useState<RegisteredPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Appointment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bookerName, setBookerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [aptDate, setAptDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [aptTime, setAptTime] = useState('10:00 AM');
  const [consultationType, setConsultationType] = useState('In-Person Dermoscopy Review');
  const [urgency, setUrgency] = useState('Routine Follow-Up');
  const [patientNotes, setPatientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [aptRes, patRes] = await Promise.all([
        api.appointments.list(),
        api.patients.list()
      ]);
      if (aptRes.success) {
        setAppointments(aptRes.appointments || []);
      }
      if (patRes.success && patRes.patients) {
        setPatients(patRes.patients);
        if (patRes.patients.length > 0 && !selectedPatientId) {
          setSelectedPatientId(patRes.patients[0].id);
          setBookerName(patRes.patients[0].patient_name);
          setContactPhone(patRes.patients[0].phone);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handlePatientSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPatientId(pId);
    const p = patients.find(x => x.id === pId);
    if (p) {
      setBookerName(p.patient_name);
      setContactPhone(p.phone);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !aptDate || !aptTime) {
      setModalError('Please fill in all mandatory appointment fields.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await api.appointments.create({
        patient_id: selectedPatientId,
        booker_name: bookerName.trim() || 'Patient Self',
        booker_relation: 'Self (Patient)',
        contact_phone: contactPhone.trim(),
        appointment_date: aptDate,
        appointment_time: aptTime,
        consultation_type: consultationType,
        urgency: urgency,
        patient_notes: patientNotes.trim() || undefined
      });

      if (res.success) {
        soundFx.playSuccess();
        setIsModalOpen(false);
        setPatientNotes('');
        fetchAppointments();
      }
    } catch (err: any) {
      soundFx.playError();
      setModalError(err.message || 'Failed to schedule appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    soundFx.playClick();
    try {
      await api.appointments.updateStatus(appointmentId, newStatus);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status.');
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
            Doctor Appointments
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Schedule and manage clinician follow-ups and lesion surveillance consultations.
          </p>
        </div>

        <button
          onClick={() => { soundFx.playClick(); setIsModalOpen(true); }}
          className="btn btn-primary"
          style={{ padding: '9px 16px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <PlusCircle size={16} />
          <span>+ Schedule Appointment</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading clinical calendar...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '24px' }}>
          <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '6px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Appointments List */}
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
          {appointments.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                No appointments scheduled.
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', margin: '6px auto 16px' }}>
                Schedule dermoscopy reviews or biopsy follow-ups for your registered patients.
              </p>
              <button
                onClick={() => { soundFx.playClick(); setIsModalOpen(true); }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                + Schedule Follow-up
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Code</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date & Time</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Consultation Type</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Urgency</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                        {a.appointment_code}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>
                        {a.patient_name}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                        {a.patient_code || '—'}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#0f172a', fontWeight: 600 }}>
                        {a.appointment_date} at {a.appointment_time}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {a.consultation_type}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: a.urgency.includes('Urgent') ? '#fee2e2' : a.urgency.includes('High') ? '#fef3c7' : '#f0fdf4',
                            color: a.urgency.includes('Urgent') ? '#b91c1c' : a.urgency.includes('High') ? '#b45309' : '#15803d'
                          }}
                        >
                          {a.urgency}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={a.status}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: a.status === 'COMPLETED' ? '#ecfdf5' : a.status === 'CANCELLED' ? '#fef2f2' : '#ffffff',
                            color: a.status === 'COMPLETED' ? '#059669' : a.status === 'CANCELLED' ? '#dc2626' : '#0f172a'
                          }}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          onClick={() => {
                            if (a.status !== 'CANCELLED') {
                              handleStatusChange(a.id, 'CANCELLED');
                            }
                          }}
                          disabled={a.status === 'CANCELLED'}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: a.status === 'CANCELLED' ? '#cbd5e1' : '#ef4444',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: a.status === 'CANCELLED' ? 'default' : 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CREATE APPOINTMENT MODAL ---------------- */}
      {isModalOpen && (
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
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Schedule Patient Consultation</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Doctor-Initiated Follow-up</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ padding: '24px' }}>
              {modalError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', marginBottom: '16px' }}>
                  {modalError}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Select Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={handlePatientSelectChange}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.patient_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Appointment Date *
                  </label>
                  <input 
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Appointment Time *
                  </label>
                  <select
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Consultation Type
                  </label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <option value="In-Person Dermoscopy Review">In-Person Dermoscopy Review</option>
                    <option value="Biopsy / Excision Planning">Biopsy / Excision Planning</option>
                    <option value="Digital Surveillance Monitoring">Digital Surveillance Monitoring</option>
                    <option value="Pathology Teleconsultation">Pathology Teleconsultation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <option value="Routine Follow-Up">Routine Follow-Up</option>
                    <option value="High Priority Surveillance">High Priority Surveillance</option>
                    <option value="Urgent Clinical Review">Urgent Clinical Review</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Clinical Instructions / Patient Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Examine changing pigment lesion on posterior torso; compare against baseline scan."
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
