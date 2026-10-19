import { Appointment, DoctorEmailNotification, BookerRelation, ConsultationType, UrgencyLevel, ClinicalCase, PatientUser } from '../types';

const STORAGE_KEY = 'dermaclass_clinical_appointments_v1';

export function generateDoctorEmailHtml(appointment: Omit<Appointment, 'emailNotification'> & { emailNotification?: Partial<DoctorEmailNotification> }): string {
  const isHighRisk = appointment.riskLevel.includes('High') || appointment.urgency.includes('Urgent');
  const isModerate = appointment.riskLevel.includes('Moderate') || appointment.urgency.includes('High Priority');
  
  const accentColor = isHighRisk ? '#e11d48' : isModerate ? '#d97706' : '#059669';
  const badgeBg = isHighRisk ? '#fff1f2' : isModerate ? '#fffbeb' : '#ecfdf5';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Clinical Consultation Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: #0f172a; color: #ffffff; padding: 24px 28px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 28px; }
    .section-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .grid { display: table; width: 100%; }
    .grid-row { display: table-row; }
    .grid-cell { display: table-cell; padding: 6px 0; font-size: 13px; }
    .grid-cell.label { color: #64748b; font-weight: 600; width: 40%; }
    .grid-cell.value { color: #0f172a; font-weight: 700; }
    .footer { background: #f1f5f9; padding: 18px 28px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
          Pacific Coast Dermatology Institute • EMR Alert
        </span>
        <span class="badge" style="background: ${badgeBg}; color: ${accentColor}; border: 1px solid ${accentColor}40;">
          ${appointment.urgency}
        </span>
      </div>
      <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        New Consultation Booked by Patient / Family
      </h2>
      <p style="margin: 6px 0 0; font-size: 13px; color: #cbd5e1;">
        Attending Clinician: <strong>${appointment.doctorName}</strong> (${appointment.doctorEmail})
      </p>
    </div>

    <!-- Body Content -->
    <div class="content">
      <p style="font-size: 14px; margin-top: 0; color: #334155;">
        Dear <strong>${appointment.doctorName}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155;">
        A new clinical follow-up appointment has been scheduled via the <strong>SkinIQ Patient Decision-Support Portal</strong>.
      </p>

      <!-- Appointment Highlight Box -->
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase;">Confirmed Slot</div>
        <div style="font-size: 18px; font-weight: 800; color: #065f46; margin: 2px 0;">
          📅 ${appointment.appointmentDate} at ⏰ ${appointment.appointmentTime}
        </div>
        <div style="font-size: 13px; color: #166534; font-weight: 600;">
          Mode: ${appointment.consultationType}
        </div>
      </div>

      <!-- Booker & Patient Information -->
      <div class="section-box">
        <h4 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          Patient & Authorized Representative
        </h4>
        <div class="grid">
          <div class="grid-row">
            <div class="grid-cell label">Patient Full Name:</div>
            <div class="grid-cell value">${appointment.patientName} (${appointment.patientId})</div>
          </div>
          <div class="grid-row">
            <div class="grid-cell label">Booked By:</div>
            <div class="grid-cell value" style="color: #0284c7;">${appointment.bookerName}</div>
          </div>
          <div class="grid-row">
            <div class="grid-cell label">Representative Relation:</div>
            <div class="grid-cell value">${appointment.bookerRelation}</div>
          </div>
          <div class="grid-row">
            <div class="grid-cell label">Primary Contact Phone:</div>
            <div class="grid-cell value">${appointment.contactPhone}</div>
          </div>
          ${appointment.patientEmail ? `
          <div class="grid-row">
            <div class="grid-cell label">Patient / Family Email:</div>
            <div class="grid-cell value">${appointment.patientEmail}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Associated Clinical Case & AI Score -->
      <div class="section-box">
        <h4 style="margin: 0 0 10px; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          Assigned Clinical Case Assessment
        </h4>
        <div class="grid">
          <div class="grid-row">
            <div class="grid-cell label">Clinical Record ID:</div>
            <div class="grid-cell value" style="font-family: monospace;">${appointment.caseId}</div>
          </div>
          <div class="grid-row">
            <div class="grid-cell label">AI Lesion Diagnosis:</div>
            <div class="grid-cell value" style="color: ${accentColor}; font-weight: 800;">${appointment.lesionDiagnosis}</div>
          </div>
          <div class="grid-row">
            <div class="grid-cell label">Risk Stratification:</div>
            <div class="grid-cell value">${appointment.riskLevel}</div>
          </div>
        </div>
      </div>

      <!-- Notes from Patient / Family -->
      ${appointment.patientNotes ? `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">
          Notes & Symptoms from Family / Patient
        </div>
        <p style="margin: 4px 0 0; font-size: 13px; color: #78350f; font-style: italic;">
          "${appointment.patientNotes}"
        </p>
      </div>
      ` : ''}

      <!-- Next Actions -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
          Suggested Clinician Actions:
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li>Review high-resolution dermoscopic image and dual-backbone attention maps for <strong>${appointment.caseId}</strong>.</li>
          <li>Prepare patient encounter for <strong>${appointment.appointmentDate}</strong> at Pacific Coast Dermatology.</li>
          <li>SMS and email confirmation has been logged for authorized contact <strong>${appointment.contactPhone}</strong>.</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>Pacific Coast Dermatology Institute • Cutaneous Oncology Division</div>
      <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
        Confidential Medical Information • Protected under HIPAA Privacy Rule 45 CFR § 164.502
      </div>
      <div style="margin-top: 4px; font-family: monospace; font-size: 10px; color: #94a3b8;">
        Message-ID: &lt;${appointment.emailNotification?.messageId || 'MSG-DCN-2026'}@dermaclass.med&gt;
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const PRESET_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-2026-8941',
    patientId: 'PT-8829-01',
    patientName: 'Sarah Jenkins',
    bookerName: 'Emily Jenkins (Daughter)',
    bookerRelation: 'Daughter / Family Representative',
    contactPhone: '+1 (555) 234-8901',
    patientEmail: 'sarah.jenkins.care@gmail.com',
    doctorEmail: 'dr.evelyn.vance@dermaclass.med',
    doctorName: 'Dr. Evelyn Vance, MD',
    caseId: 'DCN-2026-0841',
    lesionDiagnosis: 'Melanocytic Nevus (NV) - Benign',
    riskLevel: 'Low (Benign Indication)',
    appointmentDate: '2026-09-15',
    appointmentTime: '10:30 AM',
    consultationType: 'In-Person Dermoscopy Review',
    patientNotes: 'Routine 6-month pigment check recommended by AI report. Daughter Emily will accompany mom to the clinic visit.',
    urgency: 'Routine Follow-Up',
    status: 'Confirmed',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    emailNotification: {
      messageId: 'MSG-20260909-8941-EV',
      sentToEmail: 'dr.evelyn.vance@dermaclass.med',
      sentToDoctorName: 'Dr. Evelyn Vance, MD',
      sentAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      subject: '[DermaClass Alert] New Follow-up Appointment Booked by Emily Jenkins (Daughter) for Sarah Jenkins',
      previewSnippet: 'Emily Jenkins (Daughter) has booked an in-person dermoscopy review for Sarah Jenkins on Sep 15, 2026 at 10:30 AM.',
      isRead: false,
      deliveryStatus: 'Delivered (SMTP 250 OK)',
      emailHtmlContent: ''
    }
  }
];

// Initialize preset email HTML
PRESET_APPOINTMENTS[0].emailNotification.emailHtmlContent = generateDoctorEmailHtml(PRESET_APPOINTMENTS[0]);

export function getStoredAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_APPOINTMENTS));
      return PRESET_APPOINTMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PRESET_APPOINTMENTS;
  } catch {
    return PRESET_APPOINTMENTS;
  }
}

export function saveStoredAppointments(appointments: Appointment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  } catch (err) {
    console.error('Failed to save appointments to localStorage', err);
  }
}

export function createAndDispatchAppointment(
  params: {
    patient: PatientUser;
    currentCase: ClinicalCase;
    bookerName: string;
    bookerRelation: BookerRelation;
    contactPhone: string;
    patientEmail?: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationType: ConsultationType;
    patientNotes?: string;
    doctorEmail?: string;
    doctorName?: string;
  }
): Appointment {
  const doctorEmail = params.doctorEmail || 'dr.evelyn.vance@dermaclass.med';
  const doctorName = params.doctorName || 'Dr. Evelyn Vance, MD';
  const aptId = `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const messageId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  let urgency: UrgencyLevel = 'Routine Follow-Up';
  if (params.currentCase.riskLevel.includes('High') || params.consultationType.includes('Urgent')) {
    urgency = 'Urgent Clinical Review';
  } else if (params.currentCase.riskLevel.includes('Moderate')) {
    urgency = 'High Priority';
  }

  const subject = `[DermaClass Alert] New Follow-up Appointment Booked by ${params.bookerName} for ${params.patient.name} (${params.currentCase.id})`;
  const previewSnippet = `${params.bookerName} (${params.bookerRelation}) booked ${params.consultationType} on ${params.appointmentDate} at ${params.appointmentTime} for ${params.patient.name}.`;

  const draftAppointment: Omit<Appointment, 'emailNotification'> = {
    id: aptId,
    patientId: params.patient.id,
    patientName: params.patient.name,
    bookerName: params.bookerName,
    bookerRelation: params.bookerRelation,
    contactPhone: params.contactPhone || params.patient.pacificNumberOrPhone || '',
    patientEmail: params.patientEmail,
    doctorEmail: doctorEmail,
    doctorName: doctorName,
    caseId: params.currentCase.id,
    lesionDiagnosis: params.currentCase.predictedClassName,
    riskLevel: params.currentCase.riskLevel,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime,
    consultationType: params.consultationType,
    patientNotes: params.patientNotes,
    urgency: urgency,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };

  const emailHtml = generateDoctorEmailHtml(draftAppointment);

  const fullAppointment: Appointment = {
    ...draftAppointment,
    emailNotification: {
      messageId: messageId,
      sentToEmail: doctorEmail,
      sentToDoctorName: doctorName,
      sentAt: new Date().toISOString(),
      subject: subject,
      previewSnippet: previewSnippet,
      isRead: false,
      emailHtmlContent: emailHtml,
      deliveryStatus: 'Delivered (SMTP 250 OK)'
    }
  };

  // Save to persistent storage
  const current = getStoredAppointments();
  const updated = [fullAppointment, ...current.filter(a => a.id !== aptId)];
  saveStoredAppointments(updated);

  return fullAppointment;
}

export function generateICalendarDownload(appointment: Appointment): void {
  const dateClean = appointment.appointmentDate.replace(/-/g, '');
  const [timeStr, period] = appointment.appointmentTime.split(' ');
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const startTimeStr = `${String(hours).padStart(2, '0')}${minutesStr}00`;
  const endHours = String(hours + 1).padStart(2, '0');
  const endTimeStr = `${endHours}${minutesStr}00`;

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DermaClass-Net//Clinical Appointment Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${appointment.id}@dermaclass.med
DTSTAMP:${dateClean}T000000Z
DTSTART:${dateClean}T${startTimeStr}
DTEND:${dateClean}T${endTimeStr}
SUMMARY:Dermatology Consultation: ${appointment.patientName} (${appointment.caseId})
DESCRIPTION:Consultation Type: ${appointment.consultationType}\\nBooked by: ${appointment.bookerName} (${appointment.bookerRelation})\\nDiagnosis: ${appointment.lesionDiagnosis}\\nPhone: ${appointment.contactPhone}\\nNotes: ${appointment.patientNotes || 'None'}
LOCATION:Pacific Coast Dermatology Institute
STATUS:CONFIRMED
ORGANIZER;CN=${appointment.doctorName}:mailto:${appointment.doctorEmail}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${appointment.patientName}:mailto:${appointment.patientEmail || appointment.doctorEmail}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `appointment_${appointment.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
