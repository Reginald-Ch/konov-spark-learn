import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, Torus, Box } from "@react-three/drei";
import * as THREE from "three";

const FloatingShape = ({
  position,
  color,
  shape,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  shape: "sphere" | "torus" | "box";
  scale?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  const speed = useMemo(() => 0.1 + Math.random() * 0.3, []);

  useFrame((state) => {
    ref.current.rotation.x = state.clock.elapsedTime * speed;
    ref.current.rotation.y = state.clock.elapsedTime * speed * 1.3;
  });

  const ShapeComponent = shape === "sphere" ? Sphere : shape === "torus" ? Torus : Box;
  const args: any = shape === "sphere" ? [0.3 * scale, 16, 16] : shape === "torus" ? [0.25 * scale, 0.08 * scale, 12, 24] : [0.35 * scale, 0.35 * scale, 0.35 * scale];

  return (
    <Float speed={1 + Math.random()} rotationIntensity={0.5} floatIntensity={1}>
      <ShapeComponent ref={ref} args={args} position={position}>
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.5}
        />
      </ShapeComponent>
    </Float>
  );
};

const SmallParticles = ({ count = 80 }: { count?: number }) => {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, [count]);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#F7941D" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
};

export const FloatingBackground = ({ intensity = "light" }: { intensity?: "light" | "medium" }) => {
  const colors = ["#C70110", "#F7941D", "#006600"];
  const shapes: Array<"sphere" | "torus" | "box"> = ["sphere", "torus", "box"];
  const shapeCount = intensity === "light" ? 6 : 10;

  const shapeData = useMemo(
    () =>
      Array.from({ length: shapeCount }, (_, i) => ({
        position: [
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4 - 2,
        ] as [number, number, number],
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        scale: 0.5 + Math.random() * 0.8,
      })),
    [shapeCount]
  );

  return (
    <div className="absolute inset-0 z-0 opacity-60" style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        {shapeData.map((s, i) => (
          <FloatingShape key={i} {...s} />
        ))}
        <SmallParticles count={intensity === "light" ? 60 : 100} />
      </Canvas>
    </div>
  );
};
