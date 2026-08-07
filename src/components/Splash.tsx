import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const blueSpot = new THREE.SpotLight(0x0047AB, 2);
    blueSpot.position.set(-5, 5, 5);
    blueSpot.angle = Math.PI / 4;
    blueSpot.penumbra = 1;
    scene.add(blueSpot);

    const goldSpot = new THREE.SpotLight(0xFFD700, 1.8);
    goldSpot.position.set(5, -5, 5);
    goldSpot.angle = Math.PI / 4;
    goldSpot.penumbra = 1;
    scene.add(goldSpot);

    // 3D Logo Monogram "Z"
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const goldMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      shininess: 100,
      specular: 0xffffff,
      reflectivity: 1
    });

    const blueMaterial = new THREE.MeshPhongMaterial({
      color: 0x0047AB,
      shininess: 80,
      specular: 0x4444ff
    });

    // Torus Ring frame (luxury look)
    const ringGeom = new THREE.TorusGeometry(1.2, 0.05, 16, 100);
    const ring = new THREE.Mesh(ringGeom, goldMaterial);
    logoGroup.add(ring);

    // Diagonal "Z" bar
    const diagGeom = new THREE.BoxGeometry(0.16, 1.45, 0.22);
    const diagonalBar = new THREE.Mesh(diagGeom, blueMaterial);
    diagonalBar.rotation.z = -Math.PI / 4.8;
    logoGroup.add(diagonalBar);

    // Top horizontal "Z" bar
    const topBarGeom = new THREE.BoxGeometry(0.9, 0.16, 0.22);
    const topBar = new THREE.Mesh(topBarGeom, goldMaterial);
    topBar.position.set(0.24, 0.54, 0);
    logoGroup.add(topBar);

    // Bottom horizontal "Z" bar
    const bottomBarGeom = new THREE.BoxGeometry(0.9, 0.16, 0.22);
    const bottomBar = new THREE.Mesh(bottomBarGeom, goldMaterial);
    bottomBar.position.set(-0.24, -0.54, 0);
    logoGroup.add(bottomBar);

    // Particles (Golden Sparkles)
    const particleCount = 200;
    const particlesGeom = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 8;
    }

    particlesGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xFFD700,
      transparent: true,
      opacity: 0.65
    });

    const particleMesh = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particleMesh);

    // Animation State
    const startTime = Date.now();
    logoGroup.scale.set(0, 0, 0);
    logoGroup.position.z = -2;

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      // Scale in animation
      if (elapsed < 4) {
        const t = Math.min(elapsed / 2.5, 1);
        const scale = t * 1.1;
        logoGroup.scale.set(scale, scale, scale);
        logoGroup.position.z = -2 + (t * 2);
        
        blueSpot.intensity = Math.sin(elapsed * 2.5) * 2 + 1.5;
        goldSpot.intensity = Math.cos(elapsed * 2.5) * 1.8 + 0.6;

        logoGroup.rotation.y = elapsed * 0.7;
        logoGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.12;
      } else {
        logoGroup.rotation.y += 0.005;
      }

      // Floating motion
      logoGroup.position.y = Math.sin(elapsed * 0.9) * 0.08;
      particleMesh.rotation.y += 0.003;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Timeout trigger transition complete after 3.8 seconds
    const timeoutId = setTimeout(() => {
      onComplete();
    }, 3800);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 w-full h-full bg-white flex flex-col items-center justify-center z-[9999] overflow-hidden select-none">
      {/* 3D Animation viewport */}
      <div 
        ref={containerRef} 
        className="relative w-full h-[380px] sm:h-[480px] max-w-md mx-auto flex items-center justify-center z-10"
      />

      {/* Typography Section */}
      <div className="z-25 flex flex-col items-center justify-center -mt-4 pb-8 w-full px-6 text-center">
        <h1 className="font-royal text-4xl sm:text-5xl text-primary font-black tracking-tight mb-1">
          Zamvo
        </h1>
        <p className="font-sans text-[10px] sm:text-xs uppercase tracking-[0.25em] font-extrabold text-secondary">
          Smart QR Dining
        </p>
      </div>

      {/* Ambient subtle background glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] bg-primary-fixed-dim rounded-full blur-[110px]" />
      </div>
    </div>
  );
}
