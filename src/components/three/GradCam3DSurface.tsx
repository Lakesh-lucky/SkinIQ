import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface GradCam3DSurfaceProps {
  hotspotX?: number; // 0..1
  hotspotY?: number; // 0..1
  peakIntensity?: number; // e.g. 0.947
  imageUrl?: string;
}

export const GradCam3DSurface: React.FC<GradCam3DSurfaceProps> = ({
  hotspotX = 0.44,
  hotspotY = 0.48,
  peakIntensity = 0.947,
  imageUrl
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 4.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.8);
    scene.add(ambientLight);

    const topWhiteKey = new THREE.DirectionalLight(0xffffff, 3.2);
    topWhiteKey.position.set(0, 6, 4);
    scene.add(topWhiteKey);

    const greenLight = new THREE.PointLight(0x059669, 3.5, 12);
    greenLight.position.set(0, 2, 0);
    scene.add(greenLight);

    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // 3D Grad-CAM Terrain Geometry
    const gridRes = 54;
    const terrainGeo = new THREE.PlaneGeometry(3.6, 3.6, gridRes, gridRes);
    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const hx = (hotspotX - 0.5) * 3.6;
    const hy = -(hotspotY - 0.5) * 3.6;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const dist = Math.sqrt(Math.pow(vx - hx, 2) + Math.pow(vy - hy, 2));
      
      const zHeight = Math.exp(-Math.pow(dist / 0.85, 2)) * 0.95 * peakIntensity;
      pos.setZ(i, zHeight);

      const normH = Math.min(1.0, Math.max(0.0, zHeight / 0.95));
      if (normH > 0.6) {
        colors[i * 3] = 0.05;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.45;
      } else if (normH > 0.25) {
        colors[i * 3] = 0.15;
        colors[i * 3 + 1] = 0.55;
        colors[i * 3 + 2] = 0.35;
      } else {
        colors[i * 3] = 0.85;
        colors[i * 3 + 1] = 0.87;
        colors[i * 3 + 2] = 0.9;
      }
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const textureLoader = new THREE.TextureLoader();
    let lesionTexture: THREE.Texture | null = null;
    if (imageUrl) {
      lesionTexture = textureLoader.load(imageUrl);
    }

    const terrainMat = new THREE.MeshStandardMaterial({
      map: lesionTexture,
      vertexColors: lesionTexture ? false : true,
      color: lesionTexture ? 0xffffff : undefined,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2.5;
    terrainGroup.add(terrainMesh);

    // Glowing Wireframe Overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.28
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.rotation.x = -Math.PI / 2.5;
    wireMesh.position.y = 0.01;
    terrainGroup.add(wireMesh);

    // Contour base ring
    const ringGeo = new THREE.RingGeometry(1.8, 1.84, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const baseRing = new THREE.Mesh(ringGeo, ringMat);
    baseRing.rotation.x = -Math.PI / 2.5;
    terrainGroup.add(baseRing);

    // Mouse tracking & Orbit
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

      if (autoRotate) {
        targetX += 0.003;
      }

      targetX += (mouseX * 0.4 - targetX) * 0.05;
      targetY += (mouseY * 0.3 - targetY) * 0.05;

      terrainGroup.rotation.z = targetX;
      terrainGroup.rotation.x = targetY + Math.sin(elapsedTime * 0.6) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 480;
      const newHeight = container.clientHeight || 360;
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
  }, [hotspotX, hotspotY, peakIntensity, imageUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
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
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#059669',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {imageUrl ? '3D Topography with Uploaded Lesion' : '3D Grad-CAM Activation Topography'}
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
            padding: '4px 10px',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <RotateCcw size={12} />
          <span>{autoRotate ? 'Pause' : 'Rotate'}</span>
        </button>
      </div>
    </div>
  );
};
