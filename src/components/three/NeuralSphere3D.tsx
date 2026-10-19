import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface NeuralSphere3DProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * NeuralSphere3D - Premium Three.js 3D hero animation for SkinIQ splash screen.
 * Renders a floating neural-network sphere with animated glowing nodes,
 * connecting lines, orbiting particles, and mouse-based parallax.
 */
const NeuralSphere3D: React.FC<NeuralSphere3DProps> = ({ className, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.offsetWidth || 600;
    const height = canvas.offsetHeight || 600;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene setup
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
    } catch (e) {
      console.warn('WebGL not supported or context creation failed:', e);
      setWebglSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1e3a8a, 0.5);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0x06b6d4, 3, 15);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x818cf8, 2, 12);
    pointLight2.position.set(-3, -2, 2);
    scene.add(pointLight2);

    // ---- MAIN NEURAL SPHERE ----
    const group = new THREE.Group();
    scene.add(group);

    // Wireframe sphere representing skin surface
    const sphereGeo = new THREE.SphereGeometry(1.6, 18, 14);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.13,
      wireframe: true,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Solid inner glow sphere
    const innerGeo = new THREE.SphereGeometry(1.35, 24, 18);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1e40af,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.55,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerSphere);

    // ---- NEURAL NODES ----
    const nodeCount = 28;
    const nodes: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.95,
    });
    const nodeMat2 = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x818cf8,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9,
    });
    const nodeGeo = new THREE.SphereGeometry(0.05, 8, 8);

    // Distribute nodes on sphere surface using fibonacci lattice
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = 1.62 * Math.sin(phi) * Math.cos(theta);
      const y = 1.62 * Math.sin(phi) * Math.sin(theta);
      const z = 1.62 * Math.cos(phi);
      const pos = new THREE.Vector3(x, y, z);
      nodePositions.push(pos);

      const mat = i % 3 === 0 ? nodeMat2 : nodeMat;
      const node = new THREE.Mesh(nodeGeo, mat.clone());
      node.position.copy(pos);
      // Vary node sizes slightly
      const s = 0.7 + Math.random() * 0.9;
      node.scale.setScalar(s);
      group.add(node);
      nodes.push(node);
    }

    // ---- NEURAL CONNECTION LINES ----
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
    });
    const lineMat2 = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.2,
    });
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 1.4) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]]);
          const mat = (i + j) % 3 === 0 ? lineMat2 : lineMat;
          group.add(new THREE.Line(geo, mat));
        }
      }
    }

    // ---- ORBITING PARTICLES ----
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleAngles = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleInclinations = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = Math.random() * Math.PI * 2;
      particleSpeeds[i] = (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1);
      particleRadii[i] = 2.0 + Math.random() * 1.2;
      particleInclinations[i] = Math.random() * Math.PI;
      const x = particleRadii[i] * Math.sin(particleInclinations[i]) * Math.cos(particleAngles[i]);
      const y = particleRadii[i] * Math.sin(particleInclinations[i]) * Math.sin(particleAngles[i]);
      const z = particleRadii[i] * Math.cos(particleInclinations[i]);
      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.03,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---- SCANNING RING ----
    const ringGeo = new THREE.TorusGeometry(1.85, 0.006, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // ---- SECOND RING ----
    const ring2Geo = new THREE.TorusGeometry(1.85, 0.004, 8, 80);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.z = Math.PI / 3;
    group.add(ring2);

    // Mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation
    let time = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += prefersReducedMotion ? 0 : 0.008;

      // Gentle rotation of main group
      group.rotation.y += prefersReducedMotion ? 0 : 0.003;
      group.rotation.x += prefersReducedMotion ? 0 : 0.001;

      // Mouse-based tilt
      group.rotation.x += (mouseRef.current.y * 0.15 - group.rotation.x) * 0.04;
      group.rotation.y += (mouseRef.current.x * 0.15 - group.rotation.y) * 0.04;

      // Floating movement
      group.position.y = Math.sin(time * 0.6) * 0.12;

      // Pulsating inner sphere
      const pulse = 1 + Math.sin(time * 1.8) * 0.03;
      innerSphere.scale.setScalar(pulse);

      // Animate ring rotation
      ring.rotation.y = time * 0.5;
      ring2.rotation.x = time * 0.4;
      ring.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;

      // Animate particles
      const positions = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i];
        const x = particleRadii[i] * Math.sin(particleInclinations[i]) * Math.cos(particleAngles[i]);
        const y = particleRadii[i] * Math.sin(particleInclinations[i]) * Math.sin(particleAngles[i]);
        const z = particleRadii[i] * Math.cos(particleInclinations[i]);
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;

      // Node pulsing
      nodes.forEach((n, idx) => {
        const mat = n.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.0 + Math.sin(time * 2 + idx * 0.4) * 0.7;
      });

      // Animate lights
      pointLight1.position.x = 3 * Math.cos(time * 0.5);
      pointLight1.position.z = 3 * Math.sin(time * 0.5);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      // Dispose resources
      sphereGeo.dispose();
      innerGeo.dispose();
      nodeGeo.dispose();
      particleGeo.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    // CSS-only fallback
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 50%, rgba(79,70,229,0.3) 0%, rgba(6,182,212,0.2) 50%, transparent 100%)',
          borderRadius: '50%',
        }}
      >
        <div style={{ width: '200px', height: '200px', borderRadius: '50%', border: '2px solid rgba(6,182,212,0.5)', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      aria-label="AI skin analysis neural network visualization"
      role="img"
    />
  );
};

export default NeuralSphere3D;
