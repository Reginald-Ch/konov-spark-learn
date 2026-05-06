import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Trail } from "@react-three/drei";
import * as THREE from "three";

const InteractiveBrain = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { pointer } = useThree();
  
  useFrame((state) => {
    // Follow mouse gently
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      pointer.y * 0.5 + state.clock.elapsedTime * 0.1,
      0.05
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      pointer.x * 0.5 + state.clock.elapsedTime * 0.15,
      0.05
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[1.8, 64, 64]}>
        <MeshDistortMaterial
          color="#C70110"
          roughness={0.15}
          metalness={0.9}
          distort={0.25}
          speed={1.5}
          envMapIntensity={0.5}
        />
      </Sphere>
    </Float>
  );
};

const OrbitingNode = ({ 
  radius, 
  speed, 
  color, 
  size = 0.12,
  offset = 0 
}: { 
  radius: number; 
  speed: number; 
  color: string; 
  size?: number;
  offset?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t * 0.7) * radius * 0.6;
    ref.current.position.z = Math.sin(t) * radius * 0.5;
  });

  return (
    <Trail width={0.3} length={6} color={color} attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </Trail>
  );
};

const NeuralConnections = () => {
  const points = useMemo(() => {
    const pts = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 2.5 + Math.random() * 2;
      pts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pts[i * 3 + 2] = r * Math.cos(phi);
    }
    return pts;
  }, []);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={150} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#F7941D" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

export const InteractiveAIBrain = () => {
  return (
    <div className="w-full h-[300px] md:h-[400px] relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.7} />
        <pointLight position={[-3, 2, 3]} intensity={0.6} color="#C70110" />
        <pointLight position={[3, -2, 3]} intensity={0.4} color="#F7941D" />
        <pointLight position={[0, 3, -2]} intensity={0.3} color="#006600" />

        <InteractiveBrain />

        {/* Orbiting nodes — like neural signals */}
        <OrbitingNode radius={2.8} speed={0.8} color="#F7941D" offset={0} />
        <OrbitingNode radius={3.2} speed={0.6} color="#006600" offset={2} />
        <OrbitingNode radius={2.5} speed={1.0} color="#C70110" offset={4} size={0.08} />
        <OrbitingNode radius={3.5} speed={0.5} color="#F7941D" offset={1} size={0.06} />

        <NeuralConnections />
      </Canvas>
    </div>
  );
};
