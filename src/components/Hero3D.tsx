import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, MeshDistortMaterial, OrbitControls, Sphere, Stars, Torus } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

const Blob = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ mouse }) => {
    if (!ref.current) return;
    ref.current.rotation.x += 0.002;
    ref.current.rotation.y += 0.003;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, mouse.x * 0.6, 0.05);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, mouse.y * 0.4, 0.05);
  });
  return (
    <Sphere ref={ref} args={[1.1, 64, 64]}>
      {/* @ts-ignore */}
      <MeshDistortMaterial color="#C70110" distort={0.45} speed={2} roughness={0.2} metalness={0.4} />
    </Sphere>
  );
};

const Orbiters = () => {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
        <mesh position={[2.2, 0.6, 0]}>
          <icosahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial color="#F7941D" metalness={0.6} roughness={0.2} />
        </mesh>
      </Float>
      <Float speed={1.5} rotationIntensity={1.2} floatIntensity={1.2}>
        <mesh position={[-2.3, -0.4, 0.5]}>
          <torusGeometry args={[0.35, 0.12, 16, 64]} />
          <meshStandardMaterial color="#006600" metalness={0.5} roughness={0.3} />
        </mesh>
      </Float>
      <Float speed={2.5} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[1.5, -1.4, -0.3]}>
          <dodecahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#C70110" metalness={0.7} roughness={0.2} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.8}>
        <mesh position={[-1.6, 1.3, 0.2]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#F7941D" metalness={0.6} roughness={0.25} />
        </mesh>
      </Float>
    </group>
  );
};

export const Hero3D = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="#F7941D" />
          <Stars radius={50} depth={50} count={1200} factor={3} fade speed={1} />
          <Blob />
          <Orbiters />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.6}
            rotateSpeed={0.4}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
