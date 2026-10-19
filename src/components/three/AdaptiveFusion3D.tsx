import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface AdaptiveFusion3DProps {
  denseNetWeight?: number; // e.g. 0.68
  efficientNetWeight?: number; // e.g. 0.32
}

export const AdaptiveFusion3D: React.FC<AdaptiveFusion3DProps> = ({
  denseNetWeight = 0.68,
  efficientNetWeight = 0.32
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Pure White Studio Ambient & Key Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const keyWhiteLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyWhiteLight.position.set(0, 5, 5);
    scene.add(keyWhiteLight);

    const greenCenterGlow = new THREE.PointLight(0x059669, 4.0, 14);
    greenCenterGlow.position.set(0, 0, 2);
    scene.add(greenCenterGlow);

    const fusionGroup = new THREE.Group();
    scene.add(fusionGroup);

    // Left Branch: DenseNet121 Group (Black Boxes with Green Accents)
    const leftGroup = new THREE.Group();
    leftGroup.position.set(-3.2, 0, 0);
    fusionGroup.add(leftGroup);

    for (let i = 0; i < 4; i++) {
      const planeGeo = new THREE.BoxGeometry(0.8, 1.4, 0.05);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        transparent: true,
        opacity: 0.8 + i * 0.05,
        metalness: 0.8,
        roughness: 0.2
      });
      const box = new THREE.Mesh(planeGeo, planeMat);
      box.position.set(i * 0.25 - 0.35, 0, 0);
      leftGroup.add(box);
    }

    // Right Branch: EfficientNet Group (Charcoal Boxes)
    const rightGroup = new THREE.Group();
    rightGroup.position.set(3.2, 0, 0);
    fusionGroup.add(rightGroup);

    for (let i = 0; i < 4; i++) {
      const planeGeo = new THREE.BoxGeometry(0.8, 1.4, 0.05);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x374151,
        transparent: true,
        opacity: 0.8 + i * 0.05,
        metalness: 0.8,
        roughness: 0.2
      });
      const box = new THREE.Mesh(planeGeo, planeMat);
      box.position.set(-i * 0.25 + 0.35, 0, 0);
      rightGroup.add(box);
    }

    // Central Fusion Core (Emerald Green Accent Sphere)
    const coreGroup = new THREE.Group();
    fusionGroup.add(coreGroup);

    const coreGeo = new THREE.IcosahedronGeometry(0.85, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.15
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    const ringGeo = new THREE.TorusGeometry(1.2, 0.035, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    coreGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x059669 }));
    ring2.rotation.x = Math.PI / 2;
    coreGroup.add(ring2);

    // Green Synaptic Stream Particles
    const particleCount = 80;
    const streamGeo = new THREE.BufferGeometry();
    const streamPos = new Float32Array(particleCount * 3);
    const streamColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      const progress = Math.random();
      const startX = isLeft ? -3.0 : 3.0;
      const x = startX * (1 - progress);
      const y = (Math.random() - 0.5) * 0.8 * (1 - progress);
      const z = (Math.random() - 0.5) * 0.6;

      streamPos[i * 3] = x;
      streamPos[i * 3 + 1] = y;
      streamPos[i * 3 + 2] = z;

      streamColors[i * 3] = 0.02;
      streamColors[i * 3 + 1] = 0.59;
      streamColors[i * 3 + 2] = 0.41;
    }

    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
    streamGeo.setAttribute('color', new THREE.BufferAttribute(streamColors, 3));

    const streamMat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const streamField = new THREE.Points(streamGeo, streamMat);
    fusionGroup.add(streamField);

    // Mouse tracking
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
        fusionGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.15 + targetX * 0.35;
        fusionGroup.rotation.x = Math.cos(elapsed * 0.2) * 0.08 - targetY * 0.25;
      } else {
        fusionGroup.rotation.y = targetX * 0.45;
        fusionGroup.rotation.x = -targetY * 0.35;
      }

      coreMesh.rotation.x = elapsed * 0.4;
      coreMesh.rotation.y = elapsed * 0.6;
      ring1.rotation.y = elapsed * 0.8;
      ring2.rotation.z = elapsed * 0.8;

      leftGroup.scale.setScalar(0.9 + denseNetWeight * 0.3 + Math.sin(elapsed * 2) * 0.03);
      rightGroup.scale.setScalar(0.9 + efficientNetWeight * 0.3 + Math.sin(elapsed * 2 + 1) * 0.03);

      const posAttr = streamGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const isLeft = i % 2 === 0;
        let x = posAttr.getX(i);
        const speed = isLeft ? 0.03 * (denseNetWeight + 0.3) : 0.03 * (efficientNetWeight + 0.3);

        if (isLeft) {
          x += speed;
          if (x >= 0) x = -3.2;
        } else {
          x -= speed;
          if (x <= 0) x = 3.2;
        }
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;

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
  }, [denseNetWeight, efficientNetWeight, autoRotate]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '340px',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
    >
      {/* Control Top Right */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10
        }}
      >
        <button
          onClick={() => {
            soundFx.playClick();
            setAutoRotate(!autoRotate);
          }}
          className="btn btn-sm"
          style={{
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            fontWeight: 600,
            fontSize: '0.72rem',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={12} color="#059669" />
          <span>{autoRotate ? 'Pause 3D' : 'Rotate 3D'}</span>
        </button>
      </div>

      {/* Left Annotation */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          fontSize: '0.75rem',
          color: '#047857',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          background: '#ffffff',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        DenseNet121 Branch ({Math.round(denseNetWeight * 100)}%)
      </div>

      {/* Center Annotation */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          color: '#000000',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          background: '#ffffff',
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          border: '1.5px solid #059669',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        Adaptive Attention Gating Matrix (W_g)
      </div>

      {/* Right Annotation */}
      <div
        style={{
          position: 'absolute',
          top: '52px',
          right: '16px',
          fontSize: '0.75rem',
          color: '#111827',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          background: '#ffffff',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #d1d5db',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        EfficientNet Branch ({Math.round(efficientNetWeight * 100)}%)
      </div>
    </div>
  );
};
