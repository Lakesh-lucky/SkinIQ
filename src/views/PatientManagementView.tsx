import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  PlusCircle, 
  Copy, 
  Download, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UserPlus, 
  X, 
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { RegisteredPatient } from '../types';
import { soundFx } from '../utils/audio';
import { DoctorNavTab } from '../components/DoctorAppShell';

interface PatientManagementViewProps {
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const PatientManagementView: React.FC<PatientManagementViewProps> = ({ onNavigate }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'NEEDS_REVIEW' | 'REVIEWED'>('ALL');

  // Create Patient Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1985-04-12');
  const [age, setAge] = useState<number>(39);
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('+1 (555) 301-4491');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('Bay Area');
  const [city, setCity] = useState('San Francisco');
  const [district, setDistrict] = useState('Northern District');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.patients.list();
      if (res.success) {
        setPatients(res.patients || []);
      } else {
        setError('Failed to fetch patients list.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Auto calculate age from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birthYear = new Date(val).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
        setAge(currentYear - birthYear);
      }
    }
  };

  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !dob || !phone || !area || !city || !district) {
      setFormError('Please fill in all mandatory patient demographic fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.patients.create({
        patient_name: fullName.trim(),
        date_of_birth: dob,
        age: Number(age),
        gender,
        phone: phone.trim(),
        email: email.trim() || undefined,
        area: area.trim(),
        city: city.trim(),
        district: district.trim(),
        medical_notes: medicalNotes.trim() || undefined
      });

      if (res.success && res.patient) {
        soundFx.playSuccess();
        setCreatedPatient(res.patient);
        fetchPatients();
      } else {
        soundFx.playError();
        setFormError('Failed to create patient record.');
      }
    } catch (err: any) {
      soundFx.playError();
      setFormError(err.message || 'Failed to register patient in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!createdPatient) return;
    navigator.clipboard.writeText(createdPatient.patient_code);
    soundFx.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = () => {
    if (!createdPatient) return;
    soundFx.playSuccess();
    // Generate clean text card
    const cardContent = `========================================================
SkinIQ CLINICAL PATIENT REGISTRATION CARD
========================================================
PATIENT ID:    ${createdPatient.patient_code}
FULL NAME:     ${createdPatient.patient_name}
AGE / GENDER:  ${createdPatient.age} yrs / ${createdPatient.gender}
DATE OF BIRTH: ${createdPatient.date_of_birth}
PHONE:         ${createdPatient.phone}
LOCATION:      ${createdPatient.city}, ${createdPatient.district}
ATTENDING DR:  ${createdPatient.doctor_name || 'Dr. Evelyn Vance, MD'}
REGISTERED:    ${new Date().toLocaleDateString()}
========================================================
Doctor-managed record for AI-assisted skin lesion triage.
========================================================`;

    const blob = new Blob([cardContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Patient_Card_${createdPatient.patient_code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFullName('');
    setDob('1985-04-12');
    setAge(39);
    setGender('Male');
    setPhone('+1 (555) 301-4491');
    setEmail('');
    setArea('Bay Area');
    setCity('San Francisco');
    setDistrict('Northern District');
    setMedicalNotes('');
    setFormError(null);
    setCreatedPatient(null);
    setIsCreateModalOpen(false);
  };

  // Filter & Search Logic
  const filteredPatients = patients.filter(p => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      p.patient_name.toLowerCase().includes(q) || 
      p.patient_code.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q));

    if (!matchesSearch) return false;

    // Filter
    if (filterType === 'NEEDS_REVIEW') {
      return p.review_status === 'PENDING' || p.review_status === 'FOLLOW_UP_REQUIRED';
    }
    if (filterType === 'REVIEWED') {
      return p.review_status === 'REVIEWED';
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
            Patient Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Manage registered clinical subjects, view scan history, and assign unique Patient IDs.
          </p>
        </div>

        <button
          onClick={() => { soundFx.playClick(); setIsCreateModalOpen(true); }}
          className="btn btn-primary"
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <UserPlus size={18} />
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
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
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
          <input 
            type="text"
            placeholder="Search by Patient ID (e.g. PAT01-DR001) or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
            Filter:
          </span>
          <button
            onClick={() => setFilterType('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: filterType === 'ALL' ? '#059669' : '#e2e8f0',
              background: filterType === 'ALL' ? '#ecfdf5' : '#ffffff',
              color: filterType === 'ALL' ? '#059669' : '#475569',
              fontSize: '0.78rem',
              fontWeight: filterType === 'ALL' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilterType('NEEDS_REVIEW')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: filterType === 'NEEDS_REVIEW' ? '#b45309' : '#e2e8f0',
              background: filterType === 'NEEDS_REVIEW' ? '#fffbeb' : '#ffffff',
              color: filterType === 'NEEDS_REVIEW' ? '#b45309' : '#475569',
              fontSize: '0.78rem',
              fontWeight: filterType === 'NEEDS_REVIEW' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            Needs Review
          </button>
          <button
            onClick={() => setFilterType('REVIEWED')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: filterType === 'REVIEWED' ? '#059669' : '#e2e8f0',
              background: filterType === 'REVIEWED' ? '#ecfdf5' : '#ffffff',
              color: filterType === 'REVIEWED' ? '#059669' : '#475569',
              fontSize: '0.78rem',
              fontWeight: filterType === 'REVIEWED' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            Reviewed
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading patient database records...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '24px' }}>
          <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '6px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Patients Table */}
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
          {filteredPatients.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Users size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                No patients have been registered yet.
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '400px', margin: '6px auto 16px' }}>
                Create your first patient record to assign a unique Patient ID (e.g. PAT01-DR001) and begin analyzing lesions.
              </p>
              <button
                onClick={() => { soundFx.playClick(); setIsCreateModalOpen(true); }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                + Register First Patient
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient ID</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Patient Name</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Age / Sex</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Contact</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Location</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Last Scan</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr 
                      key={p.id} 
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fbfcfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#059669', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                        {p.patient_code}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                        {p.patient_name}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {p.age} yrs • {p.gender}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.8rem' }}>
                        <div>{p.phone}</div>
                        {p.email && <div style={{ color: '#94a3b8' }}>{p.email}</div>}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.8rem' }}>
                        {p.city}, {p.district}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {p.last_scan_code ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.last_scan_code}</span>
                            <span style={{ fontSize: '0.72rem', color: '#059669', display: 'block' }}>{p.last_scan_result}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No scans</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: p.review_status === 'REVIEWED' ? '#ecfdf5' : p.review_status === 'FOLLOW_UP_REQUIRED' ? '#fee2e2' : p.review_status === 'PENDING' ? '#fef3c7' : '#f1f5f9',
                            color: p.review_status === 'REVIEWED' ? '#059669' : p.review_status === 'FOLLOW_UP_REQUIRED' ? '#b91c1c' : p.review_status === 'PENDING' ? '#b45309' : '#64748b'
                          }}
                        >
                          {p.review_status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { soundFx.playClick(); onNavigate('patientProfile', p.id); }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => { soundFx.playClick(); onNavigate('newAnalysis', { patientId: p.id }); }}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                            title="Start New Analysis for this patient"
                          >
                            + Scan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CREATE PATIENT MODAL / POST-CREATION CARD ---------------- */}
      {isCreateModalOpen && (
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
              maxWidth: '560px',
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Header */}
            <div 
              style={{
                background: '#0f172a',
                padding: '20px 24px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {createdPatient ? 'Patient File Created' : 'Register Clinical Patient'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Pacific Coast Dermatology Institute • Doctor-Managed Records
                </span>
              </div>
              <button 
                onClick={resetForm}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* If patient was just created: show post-creation card */}
            {createdPatient ? (
              <div style={{ padding: '28px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div 
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px'
                    }}
                  >
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    Patient Created Successfully
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Official Patient ID has been generated and uniquely registered in the clinical database:
                  </p>

                  {/* Patient ID Display Box */}
                  <div 
                    style={{
                      margin: '18px 0',
                      padding: '16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '2px dashed #059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', color: '#059669', letterSpacing: '1px' }}>
                      {createdPatient.patient_code}
                    </span>
                    <button
                      onClick={handleCopyId}
                      style={{
                        background: copied ? '#059669' : '#e2e8f0',
                        color: copied ? '#ffffff' : '#334155',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <strong>{createdPatient.patient_name}</strong> • {createdPatient.age} yrs • {createdPatient.gender}
                  </div>
                </div>

                {/* 3 Explicit Required Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const p = createdPatient;
                      resetForm();
                      onNavigate('newAnalysis', { patientId: p.id, patientCode: p.patient_code, patientName: p.patient_name });
                    }}
                    className="btn btn-primary"
                    style={{
                      padding: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Play size={16} />
                    <span>Start New Analysis with this Patient</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={handleCopyId}
                      className="btn btn-secondary"
                      style={{
                        padding: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Copy size={15} />
                      <span>{copied ? 'ID Copied!' : 'Copy Patient ID'}</span>
                    </button>

                    <button
                      onClick={handleDownloadCard}
                      className="btn btn-secondary"
                      style={{
                        padding: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={15} />
                      <span>Download Patient Card</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create Patient Form */
              <form onSubmit={handleCreatePatientSubmit} style={{ padding: '24px 28px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Full Patient Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Johnathan Miller"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Birth *
                    </label>
                    <input 
                      type="date"
                      required
                      value={dob}
                      onChange={handleDobChange}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Age (yrs) *
                    </label>
                    <input 
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Phone Contact *
                    </label>
                    <input 
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Email (Optional)
                    </label>
                    <input 
                      type="email"
                      placeholder="patient@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Area *
                    </label>
                    <input 
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      City *
                    </label>
                    <input 
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      District *
                    </label>
                    <input 
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Clinical Medical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Fitzpatrick skin phototype, dysplastic nevus syndrome history, sunburn history..."
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={resetForm}
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
                    {isSubmitting ? 'Generating Patient ID...' : 'Register Patient & Generate ID'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
