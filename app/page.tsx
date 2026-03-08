'use client';

import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { patterns, Pattern } from '@/lib/patterns';
import { OrigamiMesh } from '@/components/OrigamiMesh';
import { Github, RefreshCw, Upload } from 'lucide-react';
import { parseFoldFile } from '@/lib/foldParser';
import { LLMPrompt } from '@/components/LLMPrompt';

export default function Optigami() {
  const [customPatterns, setCustomPatterns] = useState<Pattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState(patterns[0].id);
  const [foldPercent, setFoldPercent] = useState(0);
  const [key, setKey] = useState(0); // Used to force reset the simulation
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPatterns = [...patterns, ...customPatterns];
  const pattern = allPatterns.find(p => p.id === selectedPatternId) || allPatterns[0];

  const handleReset = () => {
    setFoldPercent(0);
    setKey(k => k + 1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedPattern = parseFoldFile(content, file.name);
      if (parsedPattern) {
        setCustomPatterns(prev => [...prev, parsedPattern]);
        setSelectedPatternId(parsedPattern.id);
        setFoldPercent(0);
        setKey(k => k + 1);
      } else {
        alert("Failed to parse .fold file. Please ensure it's a valid FOLD format with vertices_coords and faces_vertices.");
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePatternGenerated = (newPattern: Pattern) => {
    setCustomPatterns(prev => [...prev, newPattern]);
    setSelectedPatternId(newPattern.id);
    setFoldPercent(0);
    setKey(k => k + 1);
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-semibold tracking-tight mb-2">Optigami</h1>
          <p className="text-sm text-zinc-400">
            Optigami
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Crease Pattern
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedPatternId}
                  onChange={(e) => {
                    setSelectedPatternId(e.target.value);
                    setFoldPercent(0);
                    setKey(k => k + 1);
                  }}
                >
                  {allPatterns.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg border border-zinc-700 transition-colors flex-shrink-0 text-zinc-300"
                  title="Upload .fold file"
                >
                  <Upload size={18} />
                </button>
                <input 
                  type="file" 
                  accept=".fold" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Fold Angle
                </label>
                <span className="text-xs text-zinc-500 font-mono">
                  {Math.round(foldPercent * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={foldPercent}
                onChange={(e) => setFoldPercent(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded-lg transition-colors border border-zinc-700"
            >
              <RefreshCw size={14} />
              Reset Simulation
            </button>
            
            <LLMPrompt onPatternGenerated={handlePatternGenerated} />
          </div>

          {/* 2D View */}
          <div className="mt-auto">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              2D Crease Pattern
            </label>
            <div className="bg-zinc-800 rounded-lg p-4 aspect-square flex items-center justify-center border border-zinc-700 relative">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full">
                <g transform="scale(1, -1)">
                  {/* Draw faces */}
                  {pattern.faces.map((face, i) => {
                    const v1 = pattern.vertices[face[0]];
                    const v2 = pattern.vertices[face[1]];
                    const v3 = pattern.vertices[face[2]];
                    return (
                      <polygon
                        key={`face-${i}`}
                        points={`${v1[0]},${v1[1]} ${v2[0]},${v2[1]} ${v3[0]},${v3[1]}`}
                        fill="#3f3f46"
                        stroke="#52525b"
                        strokeWidth="0.01"
                      />
                    );
                  })}
                  {/* Draw creases */}
                  {pattern.creases.map((crease, i) => {
                    const v1 = pattern.vertices[crease.edge[0]];
                    const v2 = pattern.vertices[crease.edge[1]];
                    const color = crease.type === 'mountain' ? '#ef4444' : '#3b82f6';
                    return (
                      <line
                        key={`crease-${i}`}
                        x1={v1[0]}
                        y1={v1[1]}
                        x2={v2[0]}
                        y2={v2[1]}
                        stroke={color}
                        strokeWidth="0.03"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              </svg>
              <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] uppercase font-mono text-zinc-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-red-500"></div> Mountain
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-blue-500"></div> Valley
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative bg-zinc-950">
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, -5, -5]} intensity={0.2} />
          
          <group key={key}>
            <OrigamiMesh pattern={pattern} foldPercent={foldPercent} />
          </group>

          <OrbitControls makeDefault />
          <Grid 
            infiniteGrid 
            fadeDistance={10} 
            sectionColor="#333" 
            cellColor="#222" 
            position={[0, 0, -0.01]} 
          />
        </Canvas>
      </div>
    </div>
  );
}
