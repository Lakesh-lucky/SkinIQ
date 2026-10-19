import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

export const ArchitecturePipeline3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState<number>(3);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  const stagesInfo = [
    {
      id: 1,
      name: 'Stage 1: Input & Preprocessing Tensor',
      dims: '1024 × 1024 × 3',
      desc: 'Dermoscopic contact/polarized input passing through DullRazor hair removal and Wallis contrast normalization.',
      accent: '#059669'
    },
    {
      id: 2,
      name: 'Stage 2A: DenseNet-121 Backbone',
      dims: '1024-D Spatial Vector',
      desc: 'Dense block feature reuse capturing fine reticular pigment patterns, micro-dots, and localized lesion borders.',
      accent: '#059669'
    },
    {
      id: 3,
      name: 'Stage 3: Adaptive Attention Fusion Core (Proposed)',
      dims: '2304-D → Gated Joint Space',
      desc: 'Dynamic attention gating matrix W_g computes sample-specific coefficients [α₁, α₂] + residual refinement.',
      accent: '#059669'
    },
    {
      id: 4,
      name: 'Stage 2B: EfficientNet-B4 Backbone',
      dims: '1280-D Compound Vector',
      desc: 'Compound depth/width/resolution scaled MBConv blocks capturing multi-scale global contour and vascular trees.',
      accent: '#059669'
    },
    {
      id: 5,
      name: 'Stage 4: Dual Output Heads',
      dims: '8-Class Softmax + Grad-CAM Heatmap',
      desc: 'Joint classification probability distribution across 8 ISIC classes + 3D Gradient-weighted Class Activation Map.',
      accent: '#000000'
    }
  ];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    // 1. Scene & Setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 2. White Studio Illumination with Green Accents
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(0, 8, 6);
    scene.add(keyLight);

    const greenFillLight = new THREE.PointLight(0x059669, 3.5, 18);
    greenFillLight.position.set(0, 2, 4);
    scene.add(greenFillLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Stage 1: Input Image Plane & Slices (Leftmost)
    const inputGroup = new THREE.Group();
    inputGroup.position.set(-4.8, 0, 0);
    rootGroup.add(inputGroup);

    for (let i = 0; i < 3; i++) {
      const sliceGeo = new THREE.BoxGeometry(0.12, 1.6, 1.6);
      const sliceMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.75 - i * 0.15
      });
      const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
      sliceMesh.position.set(i * 0.25 - 0.25, 0, 0);
      inputGroup.add(sliceMesh);
    }

    // Stage 2A: DenseNet-121 Branch (Top Left - Black with Green Edges)
    const denseGroup = new THREE.Group();
    denseGroup.position.set(-2.4, 1.2, 0);
    rootGroup.add(denseGroup);

    for (let i = 0; i < 4; i++) {
      const bGeo = new THREE.BoxGeometry(0.5, 0.9, 0.9);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(i * 0.35 - 0.5, 0, 0);
      denseGroup.add(bMesh);

      const edgeGeo = new THREE.EdgesGeometry(bGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x059669, opacity: 0.9, transparent: true });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.copy(bMesh.position);
      denseGroup.add(edges);
    }

    // Stage 2B: EfficientNet-B4 Branch (Bottom Left - Light Metal with Green Edges)
    const effGroup = new THREE.Group();
    effGroup.position.set(-2.4, -1.2, 0);
    rootGroup.add(effGroup);

    for (let i = 0; i < 4; i++) {
      const scale = 0.7 + i * 0.12;
      const bGeo = new THREE.CylinderGeometry(scale * 0.45, scale * 0.45, 0.4, 24);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.rotation.z = Math.PI / 2;
      bMesh.position.set(i * 0.38 - 0.6, 0, 0);
      effGroup.add(bMesh);
    }

    // Stage 3: Central Adaptive Attention Fusion Core (Center - Emerald Green Accent)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0.6, 0, 0);
    rootGroup.add(coreGroup);

    const coreGeo = new THREE.IcosahedronGeometry(0.9, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.15
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Black & Green Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(1.35, 0.04, 16, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(1.35, 0.04, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x059669 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    coreGroup.add(ring2);

    // Stage 4: Output Heads (Rightmost)
    const outputGroup = new THREE.Group();
    outputGroup.position.set(3.8, 0, 0);
    rootGroup.add(outputGroup);

    const classGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const classMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      metalness: 0.8,
      roughness: 0.2
    });
    const classMesh = new THREE.Mesh(classGeo, classMat);
    classMesh.position.set(0, 0.9, 0);
    outputGroup.add(classMesh);

    const camGeo = new THREE.PlaneGeometry(1.0, 1.0, 16, 16);
    const camMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const camMesh = new THREE.Mesh(camGeo, camMat);
    camMesh.position.set(0, -0.9, 0);
    outputGroup.add(camMesh);

    // Synaptic Particle Stream (Emerald Green)
    const pCount = 100;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 8.5;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      pColors[i * 3] = 0.02;
      pColors[i * 3 + 1] = 0.59;
      pColors[i * 3 + 2] = 0.41;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    const particles = new THREE.Points(pGeo, pMat);
    rootGroup.add(particles);

    // Interactive Mouse Tracking & Orbit
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / height - 0.5) * 2;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      if (autoRotate) {
        rootGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.18 + targetX * 0.35;
        rootGroup.rotation.x = Math.cos(elapsed * 0.25) * 0.1 - targetY * 0.25;
      } else {
        rootGroup.rotation.y = targetX * 0.5;
        rootGroup.rotation.x = -targetY * 0.35;
      }

      coreMesh.rotation.x = elapsed * 0.5;
      coreMesh.rotation.y = elapsed * 0.7;
      ring1.rotation.y = elapsed * 0.9;
      ring2.rotation.z = elapsed * 0.9;

      denseGroup.position.y = 1.2 + Math.sin(elapsed * 2) * 0.06;
      effGroup.position.y = -1.2 + Math.cos(elapsed * 2) * 0.06;

      classMesh.rotation.y = elapsed * 0.6;
      camMesh.rotation.y = elapsed * 0.4;

      const positions = pGeo.attributes.position;
      for (let i = 0; i < pCount; i++) {
        let x = positions.getX(i);
        x += 0.025;
        if (x > 4.5) x = -4.8;
        positions.setX(i, x);
      }
      positions.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate]);

  const currentStage = stagesInfo.find(s => s.id === activeStage) || stagesInfo[2];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%'
      }}
    >
      {/* 3D Viewport Box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* Top Control Bar */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            right: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #e5e7eb',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span className="status-dot" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000000' }}>
              Interactive 3D Pipeline Topology
            </span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              setAutoRotate(!autoRotate);
            }}
            className="btn btn-sm"
            style={{
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #d1d5db',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RotateCcw size={13} color="#059669" />
            <span>{autoRotate ? 'Pause 3D' : 'Rotate 3D'}</span>
          </button>
        </div>

        {/* Bottom Interactive Stage Selector Chips */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            background: '#ffffff',
            padding: '6px 10px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid #e5e7eb',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '92%',
            overflowX: 'auto',
            zIndex: 10
          }}
        >
          {stagesInfo.map((stg) => (
            <button
              key={stg.id}
              onClick={() => {
                soundFx.playClick();
                setActiveStage(stg.id);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.72rem',
                fontWeight: activeStage === stg.id ? 800 : 600,
                background: activeStage === stg.id ? '#059669' : 'transparent',
                color: activeStage === stg.id ? '#ffffff' : '#374151',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              Stage {stg.id}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Stage Detail Readout Card */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          borderLeft: '4px solid #059669',
          background: '#ffffff',
          color: '#000000',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#000000' }}>
            {currentStage.name}
          </h4>
          <span
            className="mono"
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#047857'
            }}
          >
            {currentStage.dims}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', margin: 0, color: '#4b5563' }}>
          {currentStage.desc}
        </p>
      </div>
    </div>
  );
};
