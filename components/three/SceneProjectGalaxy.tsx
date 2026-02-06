"use client";

import { useMemo, useState } from "react";

type Node = {
  id: number;
  position: [number, number, number];
};

export function SceneProjectGalaxy() {
  const [hovered, setHovered] = useState<number | null>(null);
  const nodes = useMemo<Node[]>(
    () =>
      Array.from({ length: 14 }).map((_, index) => ({
        id: index,
        position: [
          Math.sin(index * 0.9) * 1.6,
          Math.cos(index * 1.2) * 1.2,
          (index % 4) * 0.35 - 0.7
        ]
      })),
    []
  );

  return (
    <group>
      {nodes.map((node) => (
        <mesh
          key={node.id}
          position={node.position}
          onPointerOver={() => setHovered(node.id)}
          onPointerOut={() => setHovered(null)}
          scale={hovered === node.id ? 1.3 : 1}
        >
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial color={hovered === node.id ? "#a5f3fc" : "#67e8f9"} emissive="#0f766e" />
        </mesh>
      ))}
    </group>
  );
}