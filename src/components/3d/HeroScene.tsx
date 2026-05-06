import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus, Dodecahedron, Octahedron } from "@react-three/drei";
import * as THREE from "three";

const BrainSphere = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <Sphere ref={meshRef} args={[1, 64, 64]} position={position}>
        <MeshDistortMaterial
          color="#C70110"
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={2}
        />
      </Sphere>
    </Float>
  );
};

const FloatingTorus = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.2;
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <Torus ref={meshRef} args={[0.6, 0.2, 16, 32]} position={position}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
      </Torus>
    </Float>
  );
};

const FloatingGem = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.2}>
      <Octahedron ref={meshRef} args={[0.5]} position={position}>
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} transparent opacity={0.85} />
      </Octahedron>
    </Float>
  );
};

const FloatingDodecahedron = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1}>
      <Dodecahedron ref={meshRef} args={[0.4]} position={position}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </Dodecahedron>
    </Float>
  );
};

const ParticleField = () => {
  const points = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return positions;
  }, []);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    ref.current.rotation.x = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#F7941D" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const ConnectingLines = () => {
  const linePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 30; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 5
        )
      );
    }
    return pts;
  }, []);

  const ref = useRef<THREE.Line>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
    return geo;
  }, [linePoints]);

  return (
    <line ref={ref as any}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#006600" transparent opacity={0.15} />
    </line>
  );
};

export const HeroScene = () => {
  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        style={{ pointerEvents: "auto" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-3, 2, 2]} intensity={0.5} color="#C70110" />
        <pointLight position={[3, -2, 2]} intensity={0.4} color="#F7941D" />
        <pointLight position={[0, 3, -2]} intensity={0.3} color="#006600" />

        {/* Main brain sphere */}
        <BrainSphere position={[3, 0.5, 0]} />

        {/* Floating shapes */}
        <FloatingTorus position={[-3.5, 1.5, -1]} color="#F7941D" />
        <FloatingTorus position={[2, -2, -2]} color="#006600" />
        <FloatingGem position={[-2, -1.5, 0.5]} color="#C70110" />
        <FloatingGem position={[4, 2, -1.5]} color="#F7941D" />
        <FloatingDodecahedron position={[-4, 0, -1]} color="#006600" />
        <FloatingDodecahedron position={[1, 2.5, -0.5]} color="#C70110" />

        {/* Particle systems */}
        <ParticleField />
        <ConnectingLines />
      </Canvas>
    </div>
  );
};
