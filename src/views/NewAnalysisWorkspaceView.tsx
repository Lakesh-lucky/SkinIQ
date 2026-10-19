import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Search, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  FileCheck2, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';
import { RegisteredPatient, ModelPredictionResult, ModelChoice } from '../types';
import { DoctorNavTab } from '../components/DoctorAppShell';
import { AiLaserScannerHUD } from '../components/dermoscopy/AiLaserScannerHUD';

interface NewAnalysisWorkspaceViewProps {
  initialPatientId?: string;
  onNavigate: (tab: DoctorNavTab, param?: any) => void;
}

export const NewAnalysisWorkspaceView: React.FC<NewAnalysisWorkspaceViewProps> = ({
  initialPatientId,
  onNavigate
}) => {
  // Stepper State: 1 to 5
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Patient Selection
  const [patients, setPatients] = useState<RegisteredPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<RegisteredPatient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Step 2: Upload Lesion Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Clinical Metadata & AI Model Selection
  const [anatomicalSite, setAnatomicalSite] = useState('posterior torso');
  const [patientAge, setPatientAge] = useState<number>(55);
  const [patientSex, setPatientSex] = useState<string>('male');
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('both');

  // Step 4 & 5: Validation & Execution Status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<string | null>(null);

  // Load patients list on mount
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const res = await api.patients.list();
        if (res.success && res.patients) {
          setPatients(res.patients);
          if (initialPatientId) {
            const matched = res.patients.find(p => p.id === initialPatientId || p.patient_code === initialPatientId);
            if (matched) {
              setSelectedPatient(matched);
              setPatientAge(matched.age);
              setPatientSex(matched.gender.toLowerCase());
              setCurrentStep(2); // Jump to image upload if patient pre-selected
            }
          }
        }
      } catch {
        // Silently handle
      } finally {
        setLoadingPatients(false);
      }
    };
    loadPatients();
  }, [initialPatientId]);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please upload a valid image file (JPG, JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setAnalysisError('File size exceeds the 15 MB clinical maximum.');
      return;
    }

    soundFx.playSuccess();
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setAnalysisError(null);
    setCurrentStep(3); // Advance to preview & metadata
  };

  // Preset Sample Images for Quick Dermoscopy Testing
  const handleLoadSamplePreset = async (presetName: string, defaultClass: string) => {
    try {
      // Create a colored SVG mock for dermoscopic testing if needed
      soundFx.playClick();
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw realistic clinical skin and lesion background
        ctx.fillStyle = '#dfaf85';
        ctx.fillRect(0, 0, 400, 400);

        // Lesion pigment
        const grad = ctx.createRadialGradient(200, 200, 15, 200, 200, 140);
        if (defaultClass === 'MEL') {
          grad.addColorStop(0, '#2d1810');
          grad.addColorStop(0.5, '#4a2511');
          grad.addColorStop(0.8, '#8c4b28');
          grad.addColorStop(1, '#dfaf85');
        } else {
          grad.addColorStop(0, '#663311');
          grad.addColorStop(0.6, '#995522');
          grad.addColorStop(1, '#dfaf85');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(200, 200, 130, 0, Math.PI * 2);
        ctx.fill();

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `${presetName}.jpg`, { type: 'image/jpeg' });
            handleFileSelected(file);
          }
        }, 'image/jpeg');
      }
    } catch {
      // Ignore
    }
  };

  // Run Real Multimodal Inference via Backend
  const handleRunInference = async () => {
    if (!imageFile) {
      setAnalysisError('Please select or upload a lesion image first.');
      return;
    }

    soundFx.playInferenceStart();
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCurrentStep(4);
    setValidationStatus('Running dermoscopic skin gatekeeper filter...');

    try {
      setTimeout(async () => {
        try {
          const modelLabel = selectedModel === 'both' 
            ? 'Dual-Model Engine (ResNet-18 & DERMAClass-Net)' 
            : selectedModel === 'dermaclass_final' 
              ? 'DERMAClass-Net Multi-Modal EDL (8-Class)' 
              : 'SkinLesion-ResNet18 (2-Class)';

          setValidationStatus(`Gatekeeper passed. Running ${modelLabel} ONNX inference...`);
          
          const result: ModelPredictionResult = await api.scans.predict(
            imageFile,
            Number(patientAge),
            patientSex,
            anatomicalSite,
            selectedPatient?.id,
            selectedModel
          );

          if (!result.is_valid_skin && result.status === 'REJECTED') {
            soundFx.playError();
            setAnalysisError(result.error || 'The uploaded image was rejected by the non-skin gatekeeper.');
            setIsAnalyzing(false);
            return;
          }

          setValidationStatus(
            selectedModel === 'both' 
              ? 'Synthesizing dual-model cross-validation and agreement telemetry...' 
              : 'Computing Dirichlet evidential uncertainty distribution...'
          );
          
          setTimeout(() => {
            soundFx.playSuccess();
            setIsAnalyzing(false);
            // Navigate directly to result view with scanId
            onNavigate('analysisResult', result.scan_id);
          }, 600);

        } catch (err: any) {
          soundFx.playError();
          setAnalysisError(err.message || 'AI inference pipeline encountered an error.');
          setIsAnalyzing(false);
        }
      }, 500);

    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to submit analysis.');
      setIsAnalyzing(false);
    }
  };

  // Filtered patients for Step 1
  const filteredPatients = patients.filter(p => {
    const q = patientSearch.toLowerCase().trim();
    return !q || p.patient_name.toLowerCase().includes(q) || p.patient_code.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* ---------------- WORKSTATION HEADER ---------------- */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
            Workstation v3.1 • Multi-Model AI Engine • ResNet-18 & DERMAClass-Net
          </span>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          AI Skin Lesion Analysis
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
          Upload a dermoscopic image for AI-assisted classification with SkinLesion-ResNet18, DERMAClass-Net Multi-Modal EDL, or Dual-Model consensus.
        </p>
      </div>

      {/* ---------------- 6-STEP PIPELINE PROGRESS BAR ---------------- */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          padding: '16px 20px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        {[
          { step: 1, label: 'Select Patient' },
          { step: 2, label: 'Upload Lesion' },
          { step: 3, label: 'Metadata & Preview' },
          { step: 4, label: 'Image Validation' },
          { step: 5, label: 'AI Inference' },
          { step: 6, label: 'Clinical Result' },
        ].map((item, idx) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          return (
            <div key={item.step} style={{ display: 'flex', alignItems: 'center', flex: idx < 5 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isDone ? '#059669' : isCurrent ? '#0f172a' : '#f1f5f9',
                    color: isDone || isCurrent ? '#ffffff' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isDone ? <CheckCircle2 size={16} /> : item.step}
                </div>
                <span 
                  style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: isCurrent ? 700 : 500, 
                    color: isCurrent ? '#0f172a' : '#64748b' 
                  }}
                  className="hidden-mobile"
                >
                  {item.label}
                </span>
              </div>
              {idx < 5 && (
                <div 
                  style={{ 
                    flex: 1, 
                    height: '2px', 
                    background: isDone ? '#059669' : '#e2e8f0', 
                    margin: '0 12px' 
                  }} 
                  className="hidden-mobile"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ---------------- ERROR BANNER ---------------- */}
      {analysisError && (
        <div 
          style={{ 
            padding: '16px 20px', 
            borderRadius: '10px', 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="#dc2626" />
            <span>{analysisError}</span>
          </div>
          <button 
            onClick={() => setAnalysisError(null)}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------------- STEP 1: SELECT PATIENT ---------------- */}
      {currentStep === 1 && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                Step 1: Select or Search Clinical Patient
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Link this diagnostic scan to an official registered Patient ID.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search patient name or ID..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Patients Selection Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '12px',
              maxHeight: '380px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}
          >
            {filteredPatients.map(p => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedPatient(p);
                    setPatientAge(p.age);
                    setPatientSex(p.gender.toLowerCase());
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: isSelected ? '#059669' : '#e2e8f0',
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      {p.patient_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                      {p.patient_code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    {p.gender}, {p.age} yrs • {p.city}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button
              onClick={() => {
                // Anonymous or Unlinked Scan Option
                setSelectedPatient(null);
                setCurrentStep(2);
              }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Proceed without linked patient ID (Anonymous Trial)
            </button>

            <button
              disabled={!selectedPatient}
              onClick={() => {
                soundFx.playClick();
                setCurrentStep(2);
              }}
              className="btn btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Next: Upload Lesion Image</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STEP 2: UPLOAD IMAGE ---------------- */}
      {currentStep === 2 && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              Step 2: Upload Skin Lesion Imagery
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              {selectedPatient ? `Uploading for patient: ${selectedPatient.patient_name} (${selectedPatient.patient_code})` : 'Uploading for clinical assessment'}
            </p>
          </div>

          {/* Professional Drag-and-Drop Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed',
              borderColor: isDragging ? '#059669' : '#cbd5e1',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              background: isDragging ? '#ecfdf5' : '#f8fafc',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s ease'
            }}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/jpg" 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div 
              style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: '#e2e8f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px',
                color: '#475569'
              }}
            >
              <Upload size={28} />
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Drag and drop dermoscopy lesion image here
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px' }}>
              or click to browse local medical imagery files
            </p>

            {/* Formats, Max Size, Requirements */}
            <div 
              style={{ 
                display: 'inline-flex', 
                gap: '16px', 
                fontSize: '0.75rem', 
                color: '#64748b', 
                background: '#ffffff', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0' 
              }}
            >
              <span><strong>Formats:</strong> JPG, JPEG, PNG, WEBP</span>
              <span>•</span>
              <span><strong>Max Size:</strong> 15 MB</span>
              <span>•</span>
              <span><strong>Modality:</strong> Contact / Non-Contact Dermoscopy</span>
            </div>
          </div>

          {/* Quick Benchmark Presets */}
          <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#059669" />
              <span>Or Select Quick Benchmark Test Case:</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleLoadSamplePreset('ISIC_BCC_Sample', 'BCC')}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                🔬 Sample BCC Lesion
              </button>
              <button
                type="button"
                onClick={() => handleLoadSamplePreset('ISIC_Melanoma_Sample', 'MEL')}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                🔍 Sample Melanoma Lesion
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentStep(1)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Patient Selection</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STEP 3: IMAGE PREVIEW & METADATA ---------------- */}
      {currentStep === 3 && imagePreviewUrl && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* Left: Image Preview Card with AI Laser Scanner HUD */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
              Dermoscopic Target Preview
            </h3>
            
            <AiLaserScannerHUD
              isAnalyzing={isAnalyzing}
              imageUrl={imagePreviewUrl}
              progressStep="Specimen centered • Ready for ResNet-18"
            />

            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span>File: {imageFile?.name}</span>
              <span>Size: {imageFile ? (imageFile.size / 1024).toFixed(1) : 0} KB</span>
            </div>

            <button
              onClick={() => {
                setImageFile(null);
                setImagePreviewUrl(null);
                setCurrentStep(2);
              }}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', marginTop: '10px', padding: 0 }}
            >
              Replace Image
            </button>
          </div>

          {/* Right: Clinical Metadata Form */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Clinical Correlates & Metadata
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px' }}>
              Metadata is logged for audit purposes. The ResNet-18 model performs image-only classification.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Anatomical Site
              </label>
              <select
                value={anatomicalSite}
                onChange={(e) => setAnatomicalSite(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="anterior torso">Anterior Torso (Chest / Abdomen)</option>
                <option value="posterior torso">Posterior Torso (Back)</option>
                <option value="upper extremity">Upper Extremity (Arm / Shoulder / Hand)</option>
                <option value="lower extremity">Lower Extremity (Leg / Foot)</option>
                <option value="head/neck">Head / Neck</option>
                <option value="palms/soles">Palms / Soles (Acral)</option>
                <option value="oral/genital">Mucosal / Oral</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Patient Age
                </label>
                <input 
                  type="number"
                  min={1}
                  max={120}
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Biological Sex
                </label>
                <select
                  value={patientSex}
                  onChange={(e) => setPatientSex(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* AI Model Architecture Selector */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                <span>Diagnostic AI Model Engine</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Select inference pipeline</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Dual-Model Consensus (Both) */}
                <div
                  onClick={() => setSelectedModel('both')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: selectedModel === 'both' ? '#059669' : '#e2e8f0',
                    background: selectedModel === 'both' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid', borderColor: selectedModel === 'both' ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedModel === 'both' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedModel === 'both' ? '#065f46' : '#1e293b' }}>
                        Dual-Model Comparative Consensus
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                      Recommended
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0 22px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                    Simultaneous inference with both models. Evaluates ResNet-18 binary triage alongside DERMAClass-Net 8-class multimodal diagnosis with automated consensus metrics.
                  </p>
                </div>

                {/* 2. DERMAClass-Net Multi-Modal EDL */}
                <div
                  onClick={() => setSelectedModel('dermaclass_final')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: selectedModel === 'dermaclass_final' ? '#2563eb' : '#e2e8f0',
                    background: selectedModel === 'dermaclass_final' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid', borderColor: selectedModel === 'dermaclass_final' ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedModel === 'dermaclass_final' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedModel === 'dermaclass_final' ? '#1e40af' : '#1e293b' }}>
                        DERMAClass-Net Multi-Modal EDL
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px' }}>
                      8 Classes + Epistemic Uncertainty
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0 22px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                    Full multimodal architecture fusing dermoscopy imagery with age, sex, and anatomical site. Features evidential Dirichlet uncertainty and dual-backbone adaptive fusion.
                  </p>
                </div>

                {/* 3. SkinLesion-ResNet18 Baseline */}
                <div
                  onClick={() => setSelectedModel('resnet18')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: selectedModel === 'resnet18' ? '#7c3aed' : '#e2e8f0',
                    background: selectedModel === 'resnet18' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid', borderColor: selectedModel === 'resnet18' ? '#7c3aed' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedModel === 'resnet18' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed' }} />}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedModel === 'resnet18' ? '#5b21b6' : '#1e293b' }}>
                        SkinLesion-ResNet18 Baseline
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '4px' }}>
                      2 Classes (BCC vs. MEL)
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0 22px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                    Image-only deep convolutional baseline model specialized in binary screening for Basal Cell Carcinoma (BCC) vs. Malignant Melanoma (MEL).
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Inference Action */}
            <button
              onClick={handleRunInference}
              disabled={isAnalyzing}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Sparkles size={18} />
              <span>
                {selectedModel === 'both' 
                  ? 'Run Dual-Model Comparative Analysis' 
                  : selectedModel === 'dermaclass_final' 
                    ? 'Run DERMAClass-Net Multimodal Inference' 
                    : 'Run SkinLesion-ResNet18 Inference'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STEP 4 & 5: VALIDATION & INFERENCE PROGRESS ---------------- */}
      {currentStep === 4 && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '60px 24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: '#ecfdf5', 
              color: '#059669', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}
          >
            <RefreshCw size={32} className="animate-spin" />
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            Processing AI Classification
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {validationStatus || 'Running SkinLesion-ResNet18 ONNX inference...'}
          </p>

          <div style={{ maxWidth: '320px', margin: '0 auto', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, #059669, #0d9488)', 
                width: '75%', 
                borderRadius: '10px',
                animation: 'pulse 1.5s infinite' 
              }} 
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px' }}>
            Model: SkinLesion-ResNet18 (ResNet-18 • 2-class: BCC / MEL • 224×224 • ImageNet normalization)
          </div>
        </div>
      )}
    </div>
  );
};
