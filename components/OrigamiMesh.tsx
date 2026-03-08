'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrigamiSimulation } from '@/lib/physics';
import { Pattern } from '@/lib/patterns';

interface OrigamiMeshProps {
  pattern: Pattern;
  foldPercent: number;
}

export function OrigamiMesh({ pattern, foldPercent }: OrigamiMeshProps) {
  const sim = useMemo(() => new OrigamiSimulation(pattern), [pattern]);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const mountainLinesRef = useRef<THREE.BufferGeometry>(null);
  const valleyLinesRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    sim.step(foldPercent);
    
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      sim.faces.forEach((face, i) => {
        for (let j = 0; j < 3; j++) {
          const v = sim.vertices[face[j]].pos;
          positions[i * 9 + j * 3] = v.x;
          positions[i * 9 + j * 3 + 1] = v.y;
          positions[i * 9 + j * 3 + 2] = v.z;
        }
      });
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }

    if (mountainLinesRef.current && valleyLinesRef.current) {
      const mPos = mountainLinesRef.current.attributes.position.array as Float32Array;
      const vPos = valleyLinesRef.current.attributes.position.array as Float32Array;
      let mIdx = 0;
      let vIdx = 0;
      
      sim.creases.forEach(crease => {
        if (crease.type === 'mountain') {
          mPos[mIdx++] = crease.vC.pos.x;
          mPos[mIdx++] = crease.vC.pos.y;
          mPos[mIdx++] = crease.vC.pos.z;
          mPos[mIdx++] = crease.vD.pos.x;
          mPos[mIdx++] = crease.vD.pos.y;
          mPos[mIdx++] = crease.vD.pos.z;
        } else if (crease.type === 'valley') {
          vPos[vIdx++] = crease.vC.pos.x;
          vPos[vIdx++] = crease.vC.pos.y;
          vPos[vIdx++] = crease.vC.pos.z;
          vPos[vIdx++] = crease.vD.pos.x;
          vPos[vIdx++] = crease.vD.pos.y;
          vPos[vIdx++] = crease.vD.pos.z;
        }
      });
      
      mountainLinesRef.current.attributes.position.needsUpdate = true;
      valleyLinesRef.current.attributes.position.needsUpdate = true;
    }
  });

  const { initialPositions, numMountains, numValleys } = useMemo(() => {
    const pos = new Float32Array(sim.faces.length * 9);
    sim.faces.forEach((face, i) => {
      for (let j = 0; j < 3; j++) {
        const v = sim.vertices[face[j]].pos;
        pos[i * 9 + j * 3] = v.x;
        pos[i * 9 + j * 3 + 1] = v.y;
        pos[i * 9 + j * 3 + 2] = v.z;
      }
    });

    let numMountains = 0;
    let numValleys = 0;
    sim.creases.forEach(c => {
      if (c.type === 'mountain') numMountains++;
      if (c.type === 'valley') numValleys++;
    });

    return { initialPositions: pos, numMountains, numValleys };
  }, [sim]);

  return (
    <group>
      <mesh>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
          />
        </bufferGeometry>
        <meshStandardMaterial 
          color="#f5f5f5" 
          side={THREE.DoubleSide} 
          flatShading 
          roughness={0.8}
        />
      </mesh>

      {numMountains > 0 && (
        <lineSegments>
          <bufferGeometry ref={mountainLinesRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(numMountains * 6), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ef4444" linewidth={2} depthTest={false} />
        </lineSegments>
      )}

      {numValleys > 0 && (
        <lineSegments>
          <bufferGeometry ref={valleyLinesRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(numValleys * 6), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3b82f6" linewidth={2} depthTest={false} />
        </lineSegments>
      )}
    </group>
  );
}
