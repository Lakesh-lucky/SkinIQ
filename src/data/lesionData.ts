// DermaClass-Net: Clinical & Research Knowledge Base

import { 
  LesionClassId, 
  LesionClassInfo, 
  ClinicalCase, 
  BaselineBenchmark, 
  ConfusionMatrixData, 
  AblationStudyStage 
} from '../types';

export const LESION_CLASSES: Record<LesionClassId, LesionClassInfo> = {
  MEL: {
    id: 'MEL',
    name: 'Melanoma',
    fullName: 'Malignant Melanoma',
    category: 'Malignant',
    severity: 'high',
    description: 'Highly aggressive malignant neoplasm arising from melanocytes. Early dermoscopic detection of asymmetrical pigment networks, atypical dots/globules, and blue-white veil structures is critical for patient survival.',
    dermoscopicFeatures: [
      'Atypical pigment network with thickened lines',
      'Asymmetric structural distribution',
      'Irregular brown-black dots & peripheral globules',
      'Blue-white veil & regression structures',
      'Polymorphous / atypical vascular patterns'
    ],
    recommendedAction: 'Urgent dermatologic surgical excision with 5mm initial margins and histopathological confirmation.',
    typicalColor: '#f43f5e'
  },
  BCC: {
    id: 'BCC',
    name: 'Basal Cell Carcinoma',
    fullName: 'Basal Cell Carcinoma',
    category: 'Malignant',
    severity: 'high',
    description: 'Slow-growing, locally invasive non-melanoma epidermal malignancy. Key dermoscopic indicators include arborizing (tree-like) telangiectasias, shiny white-red structureless areas, and blue-grey ovoid nests.',
    dermoscopicFeatures: [
      'Arborizing (branching tree-like) telangiectasias',
      'Large blue-grey ovoid nests & multiple globules',
      'Spoke-wheel areas & leaf-like peripheral structures',
      'Ulceration with crusting without pigment network',
      'Shiny white lines under polarized light'
    ],
    recommendedAction: 'Complete dermatologic surgical excision or Mohs micrographic surgery depending on anatomical location.',
    typicalColor: '#fb7185'
  },
  SCC: {
    id: 'SCC',
    name: 'Squamous Cell Carcinoma',
    fullName: 'Squamous Cell Carcinoma / Bowen Disease',
    category: 'Malignant',
    severity: 'high',
    description: 'Invasive malignant proliferation of keratinizing epidermal cells. Features prominent central hyperkeratosis, keratin pearls, white circles around hair follicles, and looped or hairpin blood vessels.',
    dermoscopicFeatures: [
      'Central keratin masses and ulceration',
      'White circles and halos around follicular openings',
      'Hairpin / looped atypical vessels with white halo',
      'Targetoid appearance with crusting'
    ],
    recommendedAction: 'Wide surgical excision with clear histological margins and regional lymph node palpation.',
    typicalColor: '#f97316'
  },
  NV: {
    id: 'NV',
    name: 'Melanocytic Nevus',
    fullName: 'Melanocytic Nevus (Common / Dysplastic)',
    category: 'Benign',
    severity: 'low',
    description: 'Benign proliferation of cutaneous melanocytes arranged in clusters (nests). Characterized by symmetric geometric contours, uniform regular pigment networks, and homogeneous brown pigmentation.',
    dermoscopicFeatures: [
      'Uniform, delicate, regular reticular pigment network',
      'Symmetric round/oval architectural contour',
      'Centrally dense or peripheral regular globules',
      'Uniform homogeneous light-to-medium brown pigmentation'
    ],
    recommendedAction: 'Routine clinical surveillance. Digital dermoscopy follow-up in 12 months if atypical features arise.',
    typicalColor: '#10b981'
  },
  BKL: {
    id: 'BKL',
    name: 'Benign Keratosis',
    fullName: 'Benign Keratosis (Seborrheic / Solar Lentigo / LPLK)',
    category: 'Benign',
    severity: 'low',
    description: 'Common benign epidermal neoplasm including seborrheic keratosis and lichen planus-like keratosis. Key dermoscopic signs include milia-like cysts, crypts/comedo openings, and cerebriform (brain-like) ridges.',
    dermoscopicFeatures: [
      'Milia-like round white-yellow cysts',
      'Comedo-like openings and crypts',
      'Cerebriform / brain-like surface ridges and fissures',
      'Sharply demarcated "stuck-on" borders with moth-eaten edges'
    ],
    recommendedAction: 'Reassurance of benign nature. Optional cryotherapy or shave excision if mechanically irritated.',
    typicalColor: '#2dd4bf'
  },
  AK: {
    id: 'AK',
    name: 'Actinic Keratosis',
    fullName: 'Actinic Keratosis / Intraepidermal Carcinoma',
    category: 'Pre-malignant',
    severity: 'moderate',
    description: 'Sun-induced pre-malignant intraepidermal dysplastic lesion with potential transformation to invasive SCC. Presents with an erythematous pseudo-network (strawberry pattern) and surface scaling.',
    dermoscopicFeatures: [
      'Strawberry pattern (erythematous pseudo-network around targetoid follicles)',
      'Yellow-white surface scaling and keratotic plugs',
      'Linear-wavy and rosette structures under polarized light',
      'Rosy-pink background without true melanocytic network'
    ],
    recommendedAction: 'Field-directed topical therapy (5-FU, Imiquimod) or targeted cryotherapy to prevent SCC progression.',
    typicalColor: '#f59e0b'
  },
  DF: {
    id: 'DF',
    name: 'Dermatofibroma',
    fullName: 'Dermatofibroma (Benign Fibrous Histiocytoma)',
    category: 'Benign',
    severity: 'low',
    description: 'Firm, benign reactive dermal histiocytic lesion, commonly found on extremities. The pathognomonic dermoscopic signature is a central white scar-like patch surrounded by a fine, delicate pigment network.',
    dermoscopicFeatures: [
      'Central white shiny patch / scar-like structureless area',
      'Faint, delicate, regular peripheral pigment network',
      'Positive "pinch sign" clinically',
      'Ring-like or homogeneous brown rim'
    ],
    recommendedAction: 'Reassurance. Routine excision not required unless symptomatic or cosmetically desired.',
    typicalColor: '#00e5ff'
  },
  VASC: {
    id: 'VASC',
    name: 'Vascular Lesion',
    fullName: 'Vascular Lesion (Hemangioma / Angiokeratoma)',
    category: 'Benign',
    severity: 'low',
    description: 'Benign vascular malformation or proliferation composed of blood vessels. Distinguished by sharply demarcated round/oval red, dark-purple, or blue lacunae (lagoon-like spaces) without pigment networks.',
    dermoscopicFeatures: [
      'Red-to-violaceous round/oval lacunae',
      'Dark purple-black thrombosed lacunae in angiokeratomas',
      'Absence of true reticular pigment network',
      'White fibrous septa partitioning vascular spaces'
    ],
    recommendedAction: 'Reassurance. Clinical monitoring; pulsed-dye laser or excision if recurrent bleeding occurs.',
    typicalColor: '#8b5cf6'
  }
};

export const PRESET_CASES: ClinicalCase[] = [
  {
    id: 'DCN-2026-0841',
    patientCode: 'PT-8942-F',
    ageGroup: '54-60',
    anatomicalSite: 'Back',
    acquisitionDate: '2026-08-28 09:42 EST',
    svgPresetKey: 'MEL',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'MEL',
    predictedClassName: 'Melanoma',
    confidence: 94.7,
    riskLevel: 'High (Atypical / Biopsy Recommended)',
    probabilities: [
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.947, severity: 'high' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.024, severity: 'low' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.012, severity: 'low' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.008, severity: 'high' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.004, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.003, severity: 'high' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.001, severity: 'low' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.001, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 1.8,
      borderIrregularity: 6.4,
      colorVariabilityCount: 4,
      diameterMm: 8.6,
      dermoscopicStructures: ['Atypical Pigment Network', 'Off-Center Blue-White Veil', 'Irregular Dark Brown Globules']
    },
    fusionWeights: {
      denseNet121Weight: 0.68,
      efficientNetWeight: 0.32,
      denseNetConfidence: 0.912,
      efficientNetConfidence: 0.884,
      fusedConfidence: 0.947,
      spatialAttentionPeak: { x: 0.44, y: 0.48 },
      gatingEntropy: 0.38
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.884,
      diceCoefficient: 0.938,
      attentionEnergyInsideLesion: 0.912,
      peakAttentionCentroid: { x: 0.44, y: 0.48 },
      activeContourPerimeterMm: 27.2,
      segmentationAreaMm2: 58.4
    },
    aiInterpretation: 'The dual-backbone model demonstrates intense spatial attention over the superior-lateral quadrant exhibiting atypical pigment network disruption and focal blue-white veil. DenseNet121 spatial feature extraction received 68% attention gating weight due to dense reticular micro-structure resolution, while EfficientNet provided complementary multi-scale contextual boundary constraint.',
    reviewStatus: 'Pending Clinician Review',
    clinicianNotes: '',
    reviewedBy: undefined,
    reviewedAt: undefined
  },
  {
    id: 'DCN-2026-0839',
    patientCode: 'PT-4102-M',
    ageGroup: '66-72',
    anatomicalSite: 'Head/Neck',
    acquisitionDate: '2026-08-27 14:15 EST',
    svgPresetKey: 'BCC',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'BCC',
    predictedClassName: 'Basal Cell Carcinoma',
    confidence: 92.4,
    riskLevel: 'High (Atypical / Biopsy Recommended)',
    probabilities: [
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.924, severity: 'high' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.041, severity: 'high' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.018, severity: 'high' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.009, severity: 'low' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.004, severity: 'moderate' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.002, severity: 'low' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.001, severity: 'low' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.001, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 1.4,
      borderIrregularity: 4.8,
      colorVariabilityCount: 3,
      diameterMm: 6.2,
      dermoscopicStructures: ['Arborizing Telangiectasia', 'Blue-Grey Ovoid Nest', 'Ulcerative Crusting']
    },
    fusionWeights: {
      denseNet121Weight: 0.44,
      efficientNetWeight: 0.56,
      denseNetConfidence: 0.871,
      efficientNetConfidence: 0.905,
      fusedConfidence: 0.924,
      spatialAttentionPeak: { x: 0.52, y: 0.46 },
      gatingEntropy: 0.44
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.862,
      diceCoefficient: 0.926,
      attentionEnergyInsideLesion: 0.887,
      peakAttentionCentroid: { x: 0.52, y: 0.46 },
      activeContourPerimeterMm: 19.8,
      segmentationAreaMm2: 30.2
    },
    aiInterpretation: 'Strong localized activation over arborizing vascular branching and peripheral focal nest translucency. EfficientNet received 56% attention weight, capturing multi-scale depth receptive fields for branching vascular continuity.',
    reviewStatus: 'Clinician Confirmed',
    clinicianNotes: 'Confirmed classic nodular BCC features on nasal dorsum. Scheduled for Mohs micrographic resection.',
    reviewedBy: 'Dr. Evelyn Vance, MD',
    reviewedAt: '2026-08-27 16:30 EST'
  },
  {
    id: 'DCN-2026-0834',
    patientCode: 'PT-1988-F',
    ageGroup: '28-34',
    anatomicalSite: 'Torso',
    acquisitionDate: '2026-08-26 11:20 EST',
    svgPresetKey: 'NV',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Contact Non-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'NV',
    predictedClassName: 'Melanocytic Nevus',
    confidence: 96.8,
    riskLevel: 'Low (Benign Indication)',
    probabilities: [
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.968, severity: 'low' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.016, severity: 'low' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.008, severity: 'high' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.004, severity: 'low' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.002, severity: 'high' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.001, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.001, severity: 'high' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 0.2,
      borderIrregularity: 0.8,
      colorVariabilityCount: 1,
      diameterMm: 4.1,
      dermoscopicStructures: ['Uniform Reticular Pattern', 'Symmetric Geometric Boundary', 'Peripheral Regular Fading']
    },
    fusionWeights: {
      denseNet121Weight: 0.62,
      efficientNetWeight: 0.38,
      denseNetConfidence: 0.952,
      efficientNetConfidence: 0.941,
      fusedConfidence: 0.968,
      spatialAttentionPeak: { x: 0.50, y: 0.50 },
      gatingEntropy: 0.35
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.915,
      diceCoefficient: 0.956,
      attentionEnergyInsideLesion: 0.942,
      peakAttentionCentroid: { x: 0.50, y: 0.50 },
      activeContourPerimeterMm: 12.9,
      segmentationAreaMm2: 13.2
    },
    aiInterpretation: 'Homogeneous, symmetric central attention distribution matching benign reticular pigment symmetry. High confidence benign profile across both backbones.',
    reviewStatus: 'Clinician Confirmed',
    clinicianNotes: 'Typical benign compound nevus. Reassured patient; routine annual full-body check.',
    reviewedBy: 'Dr. Marcus Sterling, MD',
    reviewedAt: '2026-08-26 13:00 EST'
  },
  {
    id: 'DCN-2026-0829',
    patientCode: 'PT-3114-M',
    ageGroup: '60-66',
    anatomicalSite: 'Torso',
    acquisitionDate: '2026-08-25 15:40 EST',
    svgPresetKey: 'BKL',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'BKL',
    predictedClassName: 'Benign Keratosis',
    confidence: 93.1,
    riskLevel: 'Low (Benign Indication)',
    probabilities: [
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.931, severity: 'low' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.032, severity: 'high' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.021, severity: 'low' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.008, severity: 'high' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.005, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.002, severity: 'high' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.001, severity: 'low' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 0.6,
      borderIrregularity: 2.1,
      colorVariabilityCount: 2,
      diameterMm: 9.4,
      dermoscopicStructures: ['Milia-like Cysts', 'Comedo-like Crypts', 'Cerebriform Ridges', 'Moth-eaten Border']
    },
    fusionWeights: {
      denseNet121Weight: 0.58,
      efficientNetWeight: 0.42,
      denseNetConfidence: 0.915,
      efficientNetConfidence: 0.898,
      fusedConfidence: 0.931,
      spatialAttentionPeak: { x: 0.48, y: 0.52 },
      gatingEntropy: 0.41
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.892,
      diceCoefficient: 0.943,
      attentionEnergyInsideLesion: 0.918,
      peakAttentionCentroid: { x: 0.48, y: 0.52 },
      activeContourPerimeterMm: 29.5,
      segmentationAreaMm2: 69.4
    },
    aiInterpretation: 'Focus localized over cerebriform keratin folds and punctate milia-like cysts. Sharp peripheral drop-off characteristic of seborrheic keratosis.',
    reviewStatus: 'Clinician Confirmed',
    clinicianNotes: 'Seborrheic keratosis with mechanical friction at belt line. Optional cryo given to patient.',
    reviewedBy: 'Dr. Evelyn Vance, MD',
    reviewedAt: '2026-08-25 17:10 EST'
  },
  {
    id: 'DCN-2026-0820',
    patientCode: 'PT-7721-F',
    ageGroup: '70-76',
    anatomicalSite: 'Head/Neck',
    acquisitionDate: '2026-08-24 10:05 EST',
    svgPresetKey: 'AK',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'AK',
    predictedClassName: 'Actinic Keratosis',
    confidence: 89.5,
    riskLevel: 'Moderate (Clinical Follow-up)',
    probabilities: [
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.895, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.068, severity: 'high' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.018, severity: 'high' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.011, severity: 'low' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.005, severity: 'high' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.002, severity: 'low' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.001, severity: 'low' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 1.1,
      borderIrregularity: 3.8,
      colorVariabilityCount: 2,
      diameterMm: 5.5,
      dermoscopicStructures: ['Strawberry Pattern', 'Erythematous Pseudonetwork', 'Hyperkeratotic Follicular Scales']
    },
    fusionWeights: {
      denseNet121Weight: 0.52,
      efficientNetWeight: 0.48,
      denseNetConfidence: 0.862,
      efficientNetConfidence: 0.874,
      fusedConfidence: 0.895,
      spatialAttentionPeak: { x: 0.51, y: 0.49 },
      gatingEntropy: 0.49
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.841,
      diceCoefficient: 0.914,
      attentionEnergyInsideLesion: 0.871,
      peakAttentionCentroid: { x: 0.51, y: 0.49 },
      activeContourPerimeterMm: 17.3,
      segmentationAreaMm2: 23.8
    },
    aiInterpretation: 'Erythematous background pseudo-network with surface scaling highlights actinic dysplasia. Dual-backbone weights are evenly distributed (52% / 48%) capturing both fine scale follicular plugs and broad erythema.',
    reviewStatus: 'Pending Clinician Review',
    clinicianNotes: '',
    reviewedBy: undefined,
    reviewedAt: undefined
  },
  {
    id: 'DCN-2026-0815',
    patientCode: 'PT-5091-M',
    ageGroup: '42-48',
    anatomicalSite: 'Lower Extremity',
    acquisitionDate: '2026-08-22 14:00 EST',
    svgPresetKey: 'DF',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Contact Non-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'DF',
    predictedClassName: 'Dermatofibroma',
    confidence: 95.3,
    riskLevel: 'Low (Benign Indication)',
    probabilities: [
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.953, severity: 'low' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.027, severity: 'low' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.010, severity: 'low' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.006, severity: 'high' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.002, severity: 'high' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.001, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.001, severity: 'high' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 0.3,
      borderIrregularity: 1.2,
      colorVariabilityCount: 2,
      diameterMm: 5.0,
      dermoscopicStructures: ['Central White Scar Patch', 'Delicate Peripheral Pigment Reticulum', 'Homogeneous Ring']
    },
    fusionWeights: {
      denseNet121Weight: 0.65,
      efficientNetWeight: 0.35,
      denseNetConfidence: 0.941,
      efficientNetConfidence: 0.912,
      fusedConfidence: 0.953,
      spatialAttentionPeak: { x: 0.50, y: 0.50 },
      gatingEntropy: 0.36
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.898,
      diceCoefficient: 0.946,
      attentionEnergyInsideLesion: 0.925,
      peakAttentionCentroid: { x: 0.50, y: 0.50 },
      activeContourPerimeterMm: 15.7,
      segmentationAreaMm2: 19.6
    },
    aiInterpretation: 'Diagnostic attention focuses on the contrast gradient between the central fibrotic white patch and the delicate peripheral reticular network. DenseNet121 spatial density feature maps dominated gating with 65% contribution.',
    reviewStatus: 'Clinician Confirmed',
    clinicianNotes: 'Classic positive dimple/pinch sign on left pretibial region. Benign reassurance given.',
    reviewedBy: 'Dr. Marcus Sterling, MD',
    reviewedAt: '2026-08-22 16:00 EST'
  },
  {
    id: 'DCN-2026-0808',
    patientCode: 'PT-6330-F',
    ageGroup: '35-41',
    anatomicalSite: 'Upper Extremity',
    acquisitionDate: '2026-08-20 09:10 EST',
    svgPresetKey: 'VASC',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'VASC',
    predictedClassName: 'Vascular Lesion',
    confidence: 97.4,
    riskLevel: 'Low (Benign Indication)',
    probabilities: [
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.974, severity: 'low' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.012, severity: 'high' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.007, severity: 'high' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.004, severity: 'low' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.002, severity: 'low' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.001, severity: 'moderate' },
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.000, severity: 'high' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 0.4,
      borderIrregularity: 0.9,
      colorVariabilityCount: 2,
      diameterMm: 4.8,
      dermoscopicStructures: ['Red-Violaceous Lacunae', 'Well-Demarcated Round Compartments', 'Fibrous Septa']
    },
    fusionWeights: {
      denseNet121Weight: 0.40,
      efficientNetWeight: 0.60,
      denseNetConfidence: 0.938,
      efficientNetConfidence: 0.965,
      fusedConfidence: 0.974,
      spatialAttentionPeak: { x: 0.50, y: 0.50 },
      gatingEntropy: 0.32
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.924,
      diceCoefficient: 0.961,
      attentionEnergyInsideLesion: 0.958,
      peakAttentionCentroid: { x: 0.50, y: 0.50 },
      activeContourPerimeterMm: 15.1,
      segmentationAreaMm2: 18.1
    },
    aiInterpretation: 'Homogeneous high activation confined strictly to multi-lacunar blood pools with high chromatic selectivity. EfficientNet multi-scale branch weighted at 60% for optimal chromatic blob geometry.',
    reviewStatus: 'Clinician Confirmed',
    clinicianNotes: 'Cherry hemangioma. Benign.',
    reviewedBy: 'Dr. Marcus Sterling, MD',
    reviewedAt: '2026-08-20 11:30 EST'
  },
  {
    id: 'DCN-2026-0801',
    patientCode: 'PT-9204-M',
    ageGroup: '68-74',
    anatomicalSite: 'Lower Extremity',
    acquisitionDate: '2026-08-18 16:25 EST',
    svgPresetKey: 'SCC',
    imageMetadata: {
      dimensions: '1024 × 1024 px',
      magnification: '10× Contact Epiluminescence',
      illumination: 'Cross-Polarized',
      modality: 'Dermoscopy (Epiluminescence)'
    },
    predictedClassId: 'SCC',
    predictedClassName: 'Squamous Cell Carcinoma',
    confidence: 91.8,
    riskLevel: 'High (Atypical / Biopsy Recommended)',
    probabilities: [
      { classId: 'SCC', className: 'Squamous Cell Carcinoma', fullName: 'Squamous Cell Carcinoma', probability: 0.918, severity: 'high' },
      { classId: 'AK', className: 'Actinic Keratosis', fullName: 'Actinic Keratosis', probability: 0.045, severity: 'moderate' },
      { classId: 'BCC', className: 'Basal Cell Carcinoma', fullName: 'Basal Cell Carcinoma', probability: 0.021, severity: 'high' },
      { classId: 'MEL', className: 'Melanoma', fullName: 'Malignant Melanoma', probability: 0.010, severity: 'high' },
      { classId: 'BKL', className: 'Benign Keratosis', fullName: 'Benign Keratosis', probability: 0.004, severity: 'low' },
      { classId: 'NV', className: 'Melanocytic Nevus', fullName: 'Melanocytic Nevus', probability: 0.001, severity: 'low' },
      { classId: 'DF', className: 'Dermatofibroma', fullName: 'Dermatofibroma', probability: 0.001, severity: 'low' },
      { classId: 'VASC', className: 'Vascular Lesion', fullName: 'Vascular Lesion', probability: 0.000, severity: 'low' }
    ],
    morphology: {
      asymmetryScore: 1.5,
      borderIrregularity: 5.2,
      colorVariabilityCount: 3,
      diameterMm: 11.2,
      dermoscopicStructures: ['Central Hyperkeratotic Mass', 'Keratin Pearls', 'Hairpin Vessels with White Halo']
    },
    fusionWeights: {
      denseNet121Weight: 0.55,
      efficientNetWeight: 0.45,
      denseNetConfidence: 0.882,
      efficientNetConfidence: 0.895,
      fusedConfidence: 0.918,
      spatialAttentionPeak: { x: 0.47, y: 0.45 },
      gatingEntropy: 0.46
    },
    explainability: {
      gradCamTargetLayer: 'Adaptive_Fusion_ConvHead',
      localizationIoU: 0.854,
      diceCoefficient: 0.921,
      attentionEnergyInsideLesion: 0.882,
      peakAttentionCentroid: { x: 0.47, y: 0.45 },
      activeContourPerimeterMm: 35.2,
      segmentationAreaMm2: 98.5
    },
    aiInterpretation: 'Elevated Grad-CAM intensity centered on ulcerated central keratinous crater and peripheral hairpin vascular loops. High malignant risk index.',
    reviewStatus: 'Biopsy Requested',
    clinicianNotes: 'Ulcerated hyperkeratotic nodule on pretibial area. 4mm punch biopsy ordered to confirm invasion depth.',
    reviewedBy: 'Dr. Evelyn Vance, MD',
    reviewedAt: '2026-08-19 08:45 EST'
  }
];

export const BASELINE_BENCHMARKS: BaselineBenchmark[] = [
  {
    modelName: 'DenseNet121 (Baseline)',
    accuracy: 88.4,
    precision: 87.6,
    recall: 88.1,
    f1Score: 87.8,
    sensitivity: 87.2,
    specificity: 92.4,
    rocAuc: 0.941,
    inferenceLatencyMs: 24,
    parameterCountM: 7.98,
    keyCharacteristic: 'Strong spatial density feature propagation; struggles with multi-scale lesion boundaries.'
  },
  {
    modelName: 'EfficientNet-B4 (Baseline)',
    accuracy: 89.8,
    precision: 89.1,
    recall: 89.5,
    f1Score: 89.3,
    sensitivity: 89.0,
    specificity: 93.8,
    rocAuc: 0.952,
    inferenceLatencyMs: 31,
    parameterCountM: 19.34,
    keyCharacteristic: 'Compound scaling captures global multi-scale semantics; loses subtle reticular line details.'
  },
  {
    modelName: 'Simple Concatenation Fusion',
    accuracy: 91.2,
    precision: 90.7,
    recall: 91.0,
    f1Score: 90.8,
    sensitivity: 90.5,
    specificity: 94.7,
    rocAuc: 0.963,
    inferenceLatencyMs: 36,
    parameterCountM: 27.32,
    keyCharacteristic: 'Naïve feature concatenation without dynamic weight assignment causes feature conflict.'
  },
  {
    modelName: 'Residual Feature Fusion',
    accuracy: 92.7,
    precision: 92.2,
    recall: 92.5,
    f1Score: 92.3,
    sensitivity: 92.1,
    specificity: 95.4,
    rocAuc: 0.972,
    inferenceLatencyMs: 37,
    parameterCountM: 28.15,
    keyCharacteristic: 'Static residual skip connection improves gradient flow but lacks lesion-specific gating.'
  },
  {
    modelName: 'DermaClass-Net (Adaptive Fusion + Refinement)',
    isProposed: true,
    accuracy: 94.4,
    precision: 93.8,
    recall: 94.5,
    f1Score: 94.1,
    sensitivity: 94.2,
    specificity: 96.6,
    rocAuc: 0.984,
    inferenceLatencyMs: 38,
    parameterCountM: 28.84,
    keyCharacteristic: 'Proposed dynamic attention gating mechanism dynamically weights DenseNet121 vs EfficientNet embeddings + residual refinement.'
  }
];

export const CONFUSION_MATRIX_DATA: ConfusionMatrixData = {
  classes: ['MEL', 'BCC', 'SCC', 'NV', 'BKL', 'AK', 'DF', 'VASC'],
  matrix: [
    // MEL predicted row: MEL, BCC, SCC, NV, BKL, AK, DF, VASC
    [428, 6, 4, 12, 5, 2, 1, 0],   // True MEL (458 total) -> 93.4%
    [5, 478, 8, 3, 2, 4, 0, 0],    // True BCC (500 total) -> 95.6%
    [3, 9, 172, 1, 4, 11, 0, 0],   // True SCC (200 total) -> 86.0%
    [14, 2, 1, 1420, 18, 1, 4, 0], // True NV (1460 total) -> 97.3%
    [7, 3, 3, 19, 412, 5, 1, 0],   // True BKL (450 total) -> 91.6%
    [2, 5, 12, 1, 4, 174, 0, 0],   // True AK (198 total) -> 87.9%
    [1, 0, 0, 3, 2, 0, 114, 0],    // True DF (120 total) -> 95.0%
    [0, 1, 0, 1, 0, 0, 0, 98]      // True VASC (100 total) -> 98.0%
  ],
  totalSamples: 3486
};

export const ABLATION_STUDY: AblationStudyStage[] = [
  {
    stageName: 'Stage 1: Single Backbone Baseline',
    architecture: 'DenseNet121 Standalone',
    accuracy: 88.4,
    f1Score: 87.8,
    melanomaSensitivity: 86.2,
    deltaF1: 'Baseline',
    description: 'Direct classification from penultimate DenseNet-121 layer (1024-D).'
  },
  {
    stageName: 'Stage 2: Static Dual Backbone',
    architecture: 'DenseNet121 + EfficientNet (Simple Linear Concat)',
    accuracy: 91.2,
    f1Score: 90.8,
    melanomaSensitivity: 89.8,
    deltaF1: '+3.0%',
    description: 'Fixed 50/50 concatenation of feature vectors without attention mechanism.'
  },
  {
    stageName: 'Stage 3: Residual Fusion Block',
    architecture: 'Dual Backbone + Residual Bottleneck',
    accuracy: 92.7,
    f1Score: 92.3,
    melanomaSensitivity: 91.5,
    deltaF1: '+1.5%',
    description: 'Addition of 2-layer residual block with layer normalization to reduce feature mismatch.'
  },
  {
    stageName: 'Stage 4: Adaptive Attention Gating (Proposed)',
    architecture: 'DermaClass-Net: Dual Backbone + Adaptive Gating + Residual Refinement',
    accuracy: 94.4,
    f1Score: 94.1,
    melanomaSensitivity: 94.2,
    deltaF1: '+1.8%',
    description: 'Dynamic gating network computes sample-adaptive alpha weights for complementary representation learning.'
  }
];

export const DATASET_BENCHMARKS = {
  isic2019: {
    datasetName: 'ISIC 2019 Challenge (8 Classes)',
    samples: '25,331 training / 8,238 test',
    accuracy: '94.4%',
    macroF1: '0.941',
    aucRoc: '0.984',
    melanomaSensitivity: '94.2%'
  },
  ham10000: {
    datasetName: 'HAM10000 Benchmark (7 Classes)',
    samples: '10,015 dermatoscopic images',
    accuracy: '95.1%',
    macroF1: '0.948',
    aucRoc: '0.989',
    melanomaSensitivity: '95.0%'
  },
  isic2020: {
    datasetName: 'ISIC 2020 Melanoma Generalization',
    samples: '33,126 dermoscopy images (External Validation)',
    accuracy: '93.6%',
    macroF1: '0.932',
    aucRoc: '0.978',
    melanomaSensitivity: '93.8%'
  }
};
