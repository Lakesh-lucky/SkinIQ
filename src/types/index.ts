// DermaClass-Net → SkinLesion-ResNet18: Core Domain Types & Schemas

// The active model (SkinLesion-ResNet18) classifies 2 classes: BCC and MEL.
// Legacy 8-class type is preserved for the static demo cases in lesionData.ts.
export type LesionClassId = 'MEL' | 'BCC' | 'SCC' | 'NV' | 'BKL' | 'AK' | 'DF' | 'VASC';
export type ActiveModelClassId = 'BCC' | 'MEL';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface DoctorProfile {
  doctor_code: string; // e.g. DR001
  license_number: string;
  specialization: string;
  hospital_affiliation: string;
  department: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface PatientProfile {
  assigned_patient_code?: string; // e.g. PAT01-DR001
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  doctor_profile?: DoctorProfile;
  patient_profile?: PatientProfile;
}

export interface RegisteredPatient {
  id: string;
  patient_code: string; // e.g. PAT01-DR001
  doctor_id: string;
  doctor_name?: string;
  patient_name: string;
  date_of_birth: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  area: string;
  city: string;
  district: string;
  status: string;
  medical_notes?: string;
  created_at: string;
  scans_count?: number;
}

export type RiskLevel = 
  | 'Low (Benign Indication)' 
  | 'Moderate (Clinical Follow-up)' 
  | 'High (Atypical / Biopsy Recommended)';

export type ReviewStatus = 
  | 'PENDING' 
  | 'REVIEWED' 
  | 'FOLLOW_UP_REQUIRED'
  | 'Pending Clinician Review'
  | 'Clinician Confirmed'
  | 'Biopsy Requested';

export interface LesionClassInfo {
  id: LesionClassId;
  name: string;
  fullName: string;
  description: string;
  category: 'Malignant' | 'Benign' | 'Pre-malignant' | 'Indeterminate';
  severity: 'low' | 'moderate' | 'high';
  dermoscopicFeatures: string[];
  recommendedAction: string;
  typicalColor: string;
}

export interface ClassProbability {
  classId: LesionClassId;
  className: string;
  fullName: string;
  probability: number; // 0.0 to 1.0
  severity: 'low' | 'moderate' | 'high';
}

export interface MorphologicalMetrics {
  asymmetryScore: number; // 0 - 2
  borderIrregularity: number; // 0 - 8
  colorVariabilityCount: number; // 1 - 6
  diameterMm: number; // e.g. 7.4 mm
  dermoscopicStructures: string[];
}

export interface AdaptiveFusionWeights {
  denseNet121Weight: number; // e.g. 0.62
  efficientNetWeight: number; // e.g. 0.38
  denseNetConfidence: number;
  efficientNetConfidence: number;
  fusedConfidence: number;
  spatialAttentionPeak: { x: number; y: number };
  gatingEntropy: number;
}

export interface ExplainabilityMetrics {
  gradCamTargetLayer: string;
  localizationIoU: number;
  diceCoefficient: number;
  attentionEnergyInsideLesion: number;
  peakAttentionCentroid: { x: number; y: number };
  activeContourPerimeterMm: number;
  segmentationAreaMm2: number;
}

export type ModelChoice = 'resnet18' | 'dermaclass_final' | 'both';

export interface SingleModelOutput {
  model_name: string;
  model_version: string;
  predicted_class: string;
  predicted_class_name: string;
  top_probability: number;
  epistemic_uncertainty: number;
  probabilities: Record<string, number>;
  evidence?: Record<string, number>;
  fusion_weights: Record<string, number>;
  risk_level: string;
  severity?: string;
  is_malignant?: boolean;
}

export interface ModelComparisonData {
  concordance: boolean;
  concordance_type: 'FULL_CONCORDANCE' | 'MALIGNANCY_CONCORDANCE' | 'BENIGN_RESOLUTION' | 'DISCORDANT_FINDINGS';
  exact_class_match: boolean;
  risk_concordance: boolean;
  consensus_summary: string;
  confidence_delta: number;
  uncertainty_comparison: {
    resnet18: number;
    dermaclass_final: number;
  };
  models: {
    resnet18: SingleModelOutput;
    dermaclass_final: SingleModelOutput;
  };
}

export interface ModelPredictionResult {
  is_valid_skin?: boolean;
  status?: string;
  error?: string;
  scan_id?: string;
  scan_code?: string;
  model_choice?: ModelChoice;
  model_version?: string;
  model_architecture?: string;
  predicted_class: string;
  predicted_class_name: string;
  top_probability: number;
  epistemic_uncertainty: number;
  risk_level?: string;
  probabilities: Record<string, number>;
  evidence?: Record<string, number>;
  fusion_weights: Record<string, number>;
  comparison?: ModelComparisonData;
  processing_time_ms?: number;
  gatekeeper_details?: Record<string, any>;
  image_url?: string;
  created_at?: string;
  disclaimer?: string;
}

export interface DoctorReviewData {
  id?: string;
  scan_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  review_status: 'PENDING' | 'REVIEWED' | 'FOLLOW_UP_REQUIRED';
  doctor_diagnosis?: string;
  clinical_notes: string;
  recommended_action?: string;
  reviewed_at?: string;
}

export interface ClinicalCase {
  id: string; // e.g. 'SCN-2026-0001' or 'DCN-2026-0841'
  patientCode: string; // e.g. 'PAT01-DR001'
  patientName?: string;
  ageGroup: string;
  anatomicalSite: string;
  acquisitionDate: string;
  imageThumbnailUrl?: string;
  imageUrl?: string;
  svgPresetKey?: LesionClassId;
  imageMetadata: {
    dimensions: string;
    magnification: string;
    illumination: 'Cross-Polarized' | 'Contact Non-Polarized';
    modality: 'Dermoscopy (Epiluminescence)';
  };
  predictedClassId: LesionClassId;
  predictedClassName: string;
  confidence: number; // percentage, e.g. 94.7
  riskLevel: RiskLevel;
  probabilities: ClassProbability[];
  morphology: MorphologicalMetrics;
  fusionWeights: AdaptiveFusionWeights;
  explainability: ExplainabilityMetrics;
  aiInterpretation: string;
  reviewStatus: ReviewStatus;
  doctorReview?: DoctorReviewData;
  clinicianNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AppointmentRecord {
  id: string;
  appointment_code: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  booker_name: string;
  booker_relation: string;
  contact_phone: string;
  patient_email?: string;
  appointment_date: string;
  appointment_time: string;
  consultation_type: string;
  urgency: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  patient_notes?: string;
  doctor_notes?: string;
  created_at: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportMessageRecord {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export interface SupportTicketRecord {
  id: string;
  ticket_code: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  priority: string;
  assigned_admin_name?: string;
  created_at: string;
  updated_at: string;
  messages: SupportMessageRecord[];
}

export interface MedicalReportRecord {
  scan_id: string;
  scan_code: string;
  scan_date: string;
  image_url: string;
  anatomical_site: string;
  patient_code?: string;
  patient_name?: string;
  patient_age: number;
  patient_gender?: string;
  doctor_name?: string;
  ai_predicted_class: string;
  ai_predicted_class_name: string;
  ai_confidence: number;
  ai_uncertainty: number;
  ai_risk_level: string;
  ai_probabilities: Record<string, number>;
  ai_fusion_weights: Record<string, number>;
  model_version: string;
  doctor_review_status: string;
  doctor_diagnosis?: string;
  doctor_clinical_notes?: string;
  doctor_recommended_action?: string;
  doctor_reviewed_at?: string;
  pdf_download_url: string;
  created_at: string;
  disclaimer: string;
}

// Research Benchmarks & Federated Types
export interface BaselineBenchmark {
  modelName: string;
  isProposed?: boolean;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sensitivity: number;
  specificity: number;
  rocAuc: number;
  inferenceLatencyMs: number;
  parameterCountM: number;
  keyCharacteristic: string;
}

export interface ConfusionMatrixData {
  classes: LesionClassId[];
  matrix: number[][];
  totalSamples: number;
}

export interface AblationStudyStage {
  stageName: string;
  architecture: string;
  accuracy: number;
  f1Score: number;
  melanomaSensitivity: number;
  deltaF1: string;
  description: string;
}

export interface FederatedHospitalNode {
  node_id: string;
  node_name: string;
  location: string;
  specialty: string;
  sample_count: number;
  percentage: number;
  class_distribution: Record<string, number>;
  badge_color: string;
}

export interface FederatedRoundRecord {
  round: number;
  macro_roc_auc: number;
  accuracy: number;
  macro_sensitivity: number;
  macro_specificity: number;
  macro_f1: number;
  global_loss: number;
  mean_uncertainty: number;
  client_drift: number;
  node_msk_loss: number;
  node_ham_loss: number;
  node_bcn_loss: number;
  node_smdc_loss: number;
  cumulative_mb_exchanged: number;
}

export interface FederatedMetricsResponse {
  status: string;
  algorithm: string;
  num_communication_rounds: number;
  local_epochs_per_round: number;
  num_hospital_nodes: number;
  total_cohort_samples: number;
  peak_global_macro_roc_auc: number;
  final_global_accuracy: number;
  final_global_specificity: number;
  final_global_sensitivity: number;
  final_global_f1: number;
  total_data_exchanged_mb: number;
  privacy_guarantee: string;
  hospital_nodes: FederatedHospitalNode[];
  comparison_benchmarks: {
    centralized_training: {
      macro_roc_auc: number;
      accuracy: number;
      specificity: number;
      privacy_preserved: string;
      data_transmission_gb: number;
    };
    federated_derma_fl: {
      macro_roc_auc: number;
      accuracy: number;
      specificity: number;
      privacy_preserved: string;
      data_transmission_gb: number;
    };
    isolated_local_only: {
      macro_roc_auc: number;
      accuracy: number;
      specificity: number;
      privacy_preserved: string;
      data_transmission_gb: number;
    };
  };
  history: FederatedRoundRecord[];
}

// Legacy In-Memory / Notification Types
export type BookerRelation = string;
export type ConsultationType = string;
export type UrgencyLevel = string;

export interface DoctorEmailNotification {
  id?: string;
  toEmail?: string;
  fromEmail?: string;
  sentToDoctorName?: string;
  sentToEmail?: string;
  subject: string;
  bodyHtml?: string;
  emailHtmlContent?: string;
  messageId?: string;
  sentAt: string;
  isRead: boolean;
  deliveryStatus: string;
  previewSnippet?: string;
}

export interface Appointment {
  id: string;
  caseId: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  bookerName: string;
  bookerRelation: BookerRelation;
  contactPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: ConsultationType;
  urgency: UrgencyLevel;
  patientNotes?: string;
  doctorName: string;
  doctorEmail: string;
  lesionDiagnosis: string;
  riskLevel: string;
  confidencePct?: number;
  status: string;
  createdAt: string;
  emailNotification: DoctorEmailNotification;
}

export interface DoctorUser {
  role: 'doctor';
  id: string;
  name: string;
  drEmail: string;
  licenseNumber: string;
  hospitalAffiliation: string;
  department: string;
  avatarInitials: string;
}

export interface PatientUser {
  role: 'patient';
  id: string;
  name: string;
  daughterOrRelativeName?: string;
  pacificNumberOrPhone?: string;
  dateOfBirth?: string;
  assignedCaseId?: string;
  avatarInitials: string;
}

