import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface HeroLensSceneProps {
  imageUrl?: string;
  lesionName?: string;
}

export const HeroLensScene: React.FC<HeroLensSceneProps> = ({
  imageUrl,
  lesionName
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 580;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. Pure White Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const mainWhiteKey = new THREE.DirectionalLight(0xffffff, 3.0);
    mainWhiteKey.position.set(0, 6, 5);
    scene.add(mainWhiteKey);

    // Single Accent Color: Emerald Green Studio Point Light
    const greenPointLight = new THREE.PointLight(0x059669, 3.5, 16);
    greenPointLight.position.set(3, 3, 3);
    scene.add(greenPointLight);

    const bottomWhiteLight = new THREE.DirectionalLight(0xffffff, 1.2);
    bottomWhiteLight.position.set(0, -5, 2);
    scene.add(bottomWhiteLight);

    // 3. Floating Dermoscopy Lens Assembly
    const lensGroup = new THREE.Group();
    scene.add(lensGroup);

    // Lens Outer Metallic Black Bezel
    const bezelGeo = new THREE.TorusGeometry(2.1, 0.12, 24, 64);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.95,
      roughness: 0.15
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    lensGroup.add(bezel);

    // LED Emerald Green Emissive Ring on Lens
    const ledGeo = new THREE.TorusGeometry(1.95, 0.04, 16, 64);
    const ledMat = new THREE.MeshBasicMaterial({
      color: 0x059669
    });
    const ledRing = new THREE.Mesh(ledGeo, ledMat);
    lensGroup.add(ledRing);

    // Specimen Lesion Image inside the Lens
    const textureLoader = new THREE.TextureLoader();
    let specimenTexture: THREE.Texture | null = null;
    if (imageUrl) {
      specimenTexture = textureLoader.load(imageUrl);
    }

    const specimenGeo = new THREE.CircleGeometry(1.9, 64);
    const specimenMat = new THREE.MeshBasicMaterial({
      map: specimenTexture,
      color: specimenTexture ? 0xffffff : 0x374151,
      side: THREE.DoubleSide
    });
    const specimenMesh = new THREE.Mesh(specimenGeo, specimenMat);
    specimenMesh.position.z = -0.02;
    lensGroup.add(specimenMesh);

    // Optical Glass Core
    const glassGeo = new THREE.CylinderGeometry(1.92, 1.92, 0.18, 48);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf9fafb,
      transmission: 0.65,
      opacity: 0.6,
      transparent: true,
      roughness: 0.04,
      ior: 1.52,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.rotation.x = Math.PI / 2;
    lensGroup.add(glass);

    // Reticle Crosshairs inside Lens
    const reticleGeo = new THREE.RingGeometry(0.8, 0.82, 48);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    lensGroup.add(reticle);

    // Scanning Laser Line
    const laserGeo = new THREE.PlaneGeometry(3.6, 0.04);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const laserLine = new THREE.Mesh(laserGeo, laserMat);
    laserLine.position.z = 0.1;
    lensGroup.add(laserLine);

    // 4. Layered Epidermal / Dermal Base Surface (Below Lens)
    const skinGroup = new THREE.Group();
    skinGroup.position.set(0, -1.8, -0.5);
    scene.add(skinGroup);

    const planeGeo = new THREE.PlaneGeometry(8, 8, 36, 36);
    const pos = planeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      const zBump = Math.exp(-dist * 0.8) * 0.45 + Math.sin(vx * 3) * Math.cos(vy * 3) * 0.08;
      pos.setZ(i, zBump);
    }
    planeGeo.computeVertexNormals();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 0.1,
      roughness: 0.5,
      wireframe: false
    });
    const skinMesh = new THREE.Mesh(planeGeo, skinMat);
    skinMesh.rotation.x = -Math.PI / 2.3;
    skinGroup.add(skinMesh);

    // Glowing Wireframe Overlay on Lesion Surface
    const skinWireMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const skinWire = new THREE.Mesh(planeGeo, skinWireMat);
    skinWire.rotation.x = -Math.PI / 2.3;
    skinWire.position.y = 0.02;
    skinGroup.add(skinWire);

    // 5. Neural Network Nodes
    const neuralNodesGroup = new THREE.Group();
    scene.add(neuralNodesGroup);

    const nodeCount = 28;
    const nodeColors = [0x059669, 0x10b981, 0x34d399];
    const nodeGeo = new THREE.SphereGeometry(0.06, 16, 16);

    for (let i = 0; i < nodeCount; i++) {
      const radius = 2.4 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      const x = radius * Math.cos(theta) * Math.cos(phi);
      const y = radius * Math.sin(phi) + 0.3;
      const z = radius * Math.sin(theta) * Math.cos(phi);

      const color = nodeColors[i % nodeColors.length];
      const nMat = new THREE.MeshBasicMaterial({ color });
      const nodeMesh = new THREE.Mesh(nodeGeo, nMat);
      nodeMesh.position.set(x, y, z);
      neuralNodesGroup.add(nodeMesh);
    }

    // Interaction & Animation Loop
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

    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Laser sweep animation
      laserLine.position.y = Math.sin(elapsedTime * 2.2) * 1.5;

      if (autoRotate) {
        targetX += 0.003;
      }

      targetX += (mouseX * 0.4 - targetX) * 0.05;
      targetY += (mouseY * 0.3 - targetY) * 0.05;

      lensGroup.rotation.y = targetX;
      lensGroup.rotation.x = -targetY + Math.sin(elapsedTime * 0.8) * 0.04;
      lensGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.12;

      neuralNodesGroup.rotation.y = elapsedTime * 0.1;
      neuralNodesGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 580;
      const newHeight = container.clientHeight || 520;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [imageUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '420px' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
          <span>{imageUrl ? 'Active Uploaded Lesion Specimen' : '3D Optical Epiluminescence Scanner'}</span>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            setAutoRotate(prev => !prev);
          }}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <RotateCcw size={13} />
          <span>{autoRotate ? 'Pause Orbit' : 'Resume Orbit'}</span>
        </button>
      </div>
    </div>
  );
};
