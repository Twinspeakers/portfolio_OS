"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export function SceneHeroOrb() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.7;
    meshRef.current.rotation.x += delta * 0.2;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0e7490" metalness={0.4} roughness={0.2} />
      </mesh>
    </group>
  );
}