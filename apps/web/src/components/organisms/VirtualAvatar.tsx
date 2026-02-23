import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';

/**
 * Placeholder component for the VRM Avatar.
 * In a full implementation, this would use @pixiv/three-vrm to load a .vrm file
 * and animate blendshapes for lip-syncing based on audio frequencies.
 */
function AvatarPlaceholder({ speaking }: { speaking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  // Simple animation: rotate and pulse if speaking
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      if (speaking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.lerp({ x: 1, y: 1, z: 1 } as any, 0.1);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      position={[0, 0, 0]}
    >
      <capsuleGeometry args={[0.5, 1, 4, 8]} />
      <meshStandardMaterial color={hovered ? '#4f46e5' : (speaking ? '#ec4899' : '#3b82f6')} />
    </mesh>
  );
}

interface VirtualAvatarProps {
  isSpeaking?: boolean;
}

export default function VirtualAvatar({ isSpeaking = false }: VirtualAvatarProps) {
  return (
    <div className="w-full h-full relative z-0">
      <Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <AvatarPlaceholder speaking={isSpeaking} />
        <Environment preset="city" />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
}
