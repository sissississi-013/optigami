'use client';

import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';
import { Pattern } from '@/lib/patterns';
import { parseFoldFile } from '@/lib/foldParser';

interface LLMPromptProps {
  onPatternGenerated: (pattern: Pattern) => void;
}

export function LLMPrompt({ onPatternGenerated }: LLMPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      const systemInstruction = `You are an expert origami designer. The user will ask you to create an origami crease pattern for a specific object.
You must respond with a valid JSON object representing the origami crease pattern in the FOLD format.
Keep the pattern EXTREMELY simple (under 20 vertices) so it can be generated quickly and simulated in real-time.
The FOLD format must contain:
- "vertices_coords": Array of [x, y] coordinates.
- "faces_vertices": Array of faces (array of vertex indices).
- "edges_vertices": Array of edges (array of two vertex indices).
- "edges_assignment": Array of strings ("M" for mountain, "V" for valley, "F" for flat, "B" for boundary).

Example of a simple diagonal fold:
{
  "vertices_coords": [[0,0], [1,0], [1,1], [0,1]],
  "faces_vertices": [[0,1,2], [0,2,3]],
  "edges_vertices": [[0,1], [1,2], [2,3], [3,0], [0,2]],
  "edges_assignment": ["B", "B", "B", "B", "V"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vertices_coords: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER }
                }
              },
              faces_vertices: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER }
                }
              },
              edges_vertices: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER }
                }
              },
              edges_assignment: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['vertices_coords', 'faces_vertices', 'edges_vertices', 'edges_assignment']
          }
        }
      });

      let jsonStr = response.text;
      if (!jsonStr) {
        throw new Error("No response from AI");
      }

      // Strip markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      const parsedPattern = parseFoldFile(jsonStr, prompt);
      if (parsedPattern) {
        onPatternGenerated(parsedPattern);
        setPrompt('');
      } else {
        throw new Error("Failed to parse the generated FOLD data.");
      }
    } catch (err: any) {
      console.error("Error generating pattern:", err);
      setError(err.message || "An error occurred while generating the pattern.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex flex-col gap-3">
      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
        AI Pattern Generator
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., Make a simple paper plane"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
        disabled={isGenerating}
      />
      {error && (
        <div className="text-red-400 text-xs">{error}</div>
      )}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm py-2 rounded-lg transition-colors font-medium"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Pattern
          </>
        )}
      </button>
    </div>
  );
}
