import * as THREE from 'three';
import { Pattern, CreaseType } from './patterns';

export class Vertex {
  pos: THREE.Vector3;
  oldPos: THREE.Vector3;
  originalPos: THREE.Vector2;
  fixed: boolean = false;

  constructor(x: number, y: number) {
    this.pos = new THREE.Vector3(x, y, 0);
    this.oldPos = new THREE.Vector3(x, y, 0);
    this.originalPos = new THREE.Vector2(x, y);
  }
}

export class DistanceConstraint {
  v1: Vertex;
  v2: Vertex;
  restLength: number;

  constructor(v1: Vertex, v2: Vertex) {
    this.v1 = v1;
    this.v2 = v2;
    this.restLength = v1.originalPos.distanceTo(v2.originalPos);
  }

  solve() {
    const delta = new THREE.Vector3().subVectors(this.v2.pos, this.v1.pos);
    const dist = delta.length();
    if (dist === 0) return;
    const diff = (dist - this.restLength) / dist;
    const correction = delta.multiplyScalar(diff * 0.5);
    
    if (!this.v1.fixed && !this.v2.fixed) {
      this.v1.pos.add(correction);
      this.v2.pos.sub(correction);
    } else if (!this.v1.fixed) {
      this.v1.pos.add(correction.multiplyScalar(2));
    } else if (!this.v2.fixed) {
      this.v2.pos.sub(correction.multiplyScalar(2));
    }
  }
}

export class CreaseConstraint {
  vA: Vertex;
  vB: Vertex;
  vC: Vertex; // hinge
  vD: Vertex; // hinge
  type: CreaseType;
  
  d: number;
  vA_len: number;
  vB_len: number;

  constructor(vA: Vertex, vB: Vertex, vC: Vertex, vD: Vertex, type: CreaseType) {
    this.vA = vA;
    this.vB = vB;
    this.vC = vC;
    this.vD = vD;
    this.type = type;

    const C = vC.originalPos;
    const D = vD.originalPos;
    const A = vA.originalPos;
    const B = vB.originalPos;

    const CD = new THREE.Vector2().subVectors(D, C);
    const hingeLen = CD.length();
    const hingeDir = CD.clone().divideScalar(hingeLen);
    
    const CA = new THREE.Vector2().subVectors(A, C);
    const CB = new THREE.Vector2().subVectors(B, C);
    
    const projA_len = CA.dot(hingeDir);
    const projB_len = CB.dot(hingeDir);
    
    this.d = Math.abs(projA_len - projB_len);
    
    this.vA_len = Math.sqrt(Math.max(0, CA.lengthSq() - projA_len * projA_len));
    this.vB_len = Math.sqrt(Math.max(0, CB.lengthSq() - projB_len * projB_len));
  }

  solve(foldPercent: number) {
    let theta = 0;
    const maxAngle = Math.PI * 0.85; // Prevent folding completely flat to stop self-intersection
    if (this.type === 'mountain') theta = foldPercent * maxAngle;
    if (this.type === 'valley') theta = -foldPercent * maxAngle;
    
    // Target distance
    const L_sq = this.d * this.d + this.vA_len * this.vA_len + this.vB_len * this.vB_len + 2 * this.vA_len * this.vB_len * Math.cos(theta);
    const targetDist = Math.sqrt(Math.max(0, L_sq));

    // Apply distance constraint between A and B
    const delta = new THREE.Vector3().subVectors(this.vB.pos, this.vA.pos);
    const dist = delta.length();
    if (dist === 0) return;
    const diff = (dist - targetDist) / dist;
    const correction = delta.multiplyScalar(diff * 0.5);
    
    // We can use a slightly lower stiffness for creases to allow the structural springs to dominate
    const stiffness = 0.5; 
    correction.multiplyScalar(stiffness);

    if (!this.vA.fixed) this.vA.pos.add(correction);
    if (!this.vB.fixed) this.vB.pos.sub(correction);

    // Apply bias force if needed
    if (this.type !== 'flat' && foldPercent > 0.001) {
      const hingeDir = new THREE.Vector3().subVectors(this.vD.pos, this.vC.pos).normalize();
      const n1 = new THREE.Vector3().subVectors(this.vA.pos, this.vC.pos).cross(hingeDir).normalize();
      const n2 = hingeDir.clone().cross(new THREE.Vector3().subVectors(this.vB.pos, this.vC.pos)).normalize();
      
      const dot = n1.dot(n2);
      if (dot > 0.99 || isNaN(dot)) { // almost flat
        const forceDir = this.type === 'mountain' ? 1 : -1;
        const push = new THREE.Vector3(0, 0, forceDir * 0.02); // Global Z push
        
        if (!this.vA.fixed) this.vA.pos.sub(push);
        if (!this.vB.fixed) this.vB.pos.sub(push);
        if (!this.vC.fixed) this.vC.pos.add(push);
        if (!this.vD.fixed) this.vD.pos.add(push);
      }
    }
  }
}

export class OrigamiSimulation {
  vertices: Vertex[] = [];
  structuralSprings: DistanceConstraint[] = [];
  creases: CreaseConstraint[] = [];
  faces: number[][] = [];
  
  constructor(pattern: Pattern) {
    this.vertices = pattern.vertices.map(v => new Vertex(v[0], v[1]));
    this.faces = pattern.faces;

    // Fix the center vertex to prevent floating away
    let centerIdx = 0;
    let minDist = Infinity;
    this.vertices.forEach((v, i) => {
      const dist = v.originalPos.lengthSq();
      if (dist < minDist) {
        minDist = dist;
        centerIdx = i;
      }
    });
    this.vertices[centerIdx].fixed = true;

    // Fix another vertex connected to the center vertex to prevent rotation
    // Find an edge connected to centerIdx
    const connectedEdge = pattern.faces.find(f => f.includes(centerIdx));
    if (connectedEdge) {
      const otherIdx = connectedEdge.find(v => v !== centerIdx);
      if (otherIdx !== undefined) {
        this.vertices[otherIdx].fixed = true;
      }
      
      // Fix a third vertex to completely prevent spinning in 3D
      const thirdIdx = connectedEdge.find(v => v !== centerIdx && v !== otherIdx);
      if (thirdIdx !== undefined) {
        this.vertices[thirdIdx].fixed = true;
      }
    }

    // Build structural springs (edges of faces)
    const edgeMap = new Map<string, { faces: number[], v1: number, v2: number }>();
    
    const addEdge = (v1: number, v2: number, faceIdx: number) => {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { faces: [], v1, v2 });
        this.structuralSprings.push(new DistanceConstraint(this.vertices[v1], this.vertices[v2]));
      }
      edgeMap.get(key)!.faces.push(faceIdx);
    };

    this.faces.forEach((face, i) => {
      addEdge(face[0], face[1], i);
      addEdge(face[1], face[2], i);
      addEdge(face[2], face[0], i);
    });

    // Build creases
    edgeMap.forEach((edge, key) => {
      if (edge.faces.length === 2) {
        const f1 = this.faces[edge.faces[0]];
        const f2 = this.faces[edge.faces[1]];
        
        // Find opposite vertices
        const vA_idx = f1.find(v => v !== edge.v1 && v !== edge.v2)!;
        const vB_idx = f2.find(v => v !== edge.v1 && v !== edge.v2)!;
        
        // Check if this edge is in pattern.creases
        let type: CreaseType = 'flat';
        const creaseDef = pattern.creases.find(c => 
          (c.edge[0] === edge.v1 && c.edge[1] === edge.v2) || 
          (c.edge[0] === edge.v2 && c.edge[1] === edge.v1)
        );
        if (creaseDef) {
          type = creaseDef.type;
        }

        this.creases.push(new CreaseConstraint(
          this.vertices[vA_idx],
          this.vertices[vB_idx],
          this.vertices[edge.v1],
          this.vertices[edge.v2],
          type
        ));
      }
    });

    // Add initial noise to break symmetry
    this.vertices.forEach(v => {
      v.pos.z += (Math.random() - 0.5) * 0.01;
      v.oldPos.copy(v.pos);
    });
  }

  step(foldPercent: number) {
    const damping = 0.8; // Increased damping for stability

    for (const v of this.vertices) {
      if (v.fixed) continue;
      const velocity = new THREE.Vector3().subVectors(v.pos, v.oldPos).multiplyScalar(damping);
      v.oldPos.copy(v.pos);
      v.pos.add(velocity);
    }

    const _tri = new THREE.Triangle();
    const _closest = new THREE.Vector3();
    const _delta = new THREE.Vector3();
    const _faceCorrection = new THREE.Vector3();
    const thickness = 0.06; // Increased thickness for impenetrable paper
    const thicknessSq = thickness * thickness;

    // Solve constraints iteratively
    const iterations = 60; // More iterations for rigid collisions
    for (let i = 0; i < iterations; i++) {
      for (const crease of this.creases) {
        crease.solve(foldPercent);
      }
      for (const spring of this.structuralSprings) {
        spring.solve();
      }
      
      // Self-collision (Vertex-Face repulsion)
      for (let j = 0; j < this.vertices.length; j++) {
        const v = this.vertices[j];
        for (let f = 0; f < this.faces.length; f++) {
          const face = this.faces[f];
          if (face.includes(j)) continue;
          
          const vA = this.vertices[face[0]];
          const vB = this.vertices[face[1]];
          const vC = this.vertices[face[2]];
          
          _tri.set(vA.pos, vB.pos, vC.pos);
          _tri.closestPointToPoint(v.pos, _closest);
          
          _delta.subVectors(v.pos, _closest); // Vector FROM face TO vertex
          const distSq = _delta.lengthSq();
          
          if (distSq < thicknessSq) {
            let dist = Math.sqrt(distSq);
            let overlap = thickness - dist;
            
            if (dist < 0.0001) {
              _tri.getNormal(_delta); // Use normal if exactly touching
            } else {
              _delta.normalize();
            }
            
            // Apply strong repulsion force
            _delta.multiplyScalar(overlap * 0.9); 
            
            if (!v.fixed) v.pos.addScaledVector(_delta, 0.5);
            
            _faceCorrection.copy(_delta).multiplyScalar(-0.5 / 3);
            if (!vA.fixed) vA.pos.add(_faceCorrection);
            if (!vB.fixed) vB.pos.add(_faceCorrection);
            if (!vC.fixed) vC.pos.add(_faceCorrection);
          }
        }
      }
    }
  }
}
