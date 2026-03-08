import { Pattern, CreaseDef } from './patterns';

export function parseFoldFile(jsonStr: string, filename: string): Pattern | null {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.vertices_coords || !data.faces_vertices) {
      throw new Error("Missing required FOLD fields (vertices_coords, faces_vertices)");
    }

    // Extract vertices and find bounding box for normalization
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const rawVertices: [number, number][] = data.vertices_coords.map((v: number[]) => {
      const x = v[0];
      const y = v[1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      return [x, y];
    });

    const width = maxX - minX;
    const height = maxY - minY;
    // Scale to fit nicely in the view (from -1 to 1)
    const scale = 2 / Math.max(width, height, 0.001);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const vertices: [number, number][] = rawVertices.map(v => [
      (v[0] - cx) * scale,
      (v[1] - cy) * scale
    ]);

    // Extract and triangulate faces
    const faces: [number, number, number][] = [];
    data.faces_vertices.forEach((face: number[]) => {
      if (face.length === 3) {
        faces.push([face[0], face[1], face[2]]);
      } else if (face.length > 3) {
        // Simple fan triangulation for convex polygons
        for (let i = 1; i < face.length - 1; i++) {
          faces.push([face[0], face[i], face[i + 1]]);
        }
      }
    });

    // Extract creases
    const creases: CreaseDef[] = [];
    if (data.edges_vertices && data.edges_assignment) {
      data.edges_vertices.forEach((edge: [number, number], i: number) => {
        const assignment = data.edges_assignment[i];
        if (assignment === 'M' || assignment === 'm') {
          creases.push({ edge, type: 'mountain' });
        } else if (assignment === 'V' || assignment === 'v') {
          creases.push({ edge, type: 'valley' });
        } else if (assignment === 'F' || assignment === 'f') {
          creases.push({ edge, type: 'flat' });
        }
      });
    }

    return {
      id: 'custom-' + Date.now(),
      name: filename.replace('.fold', ''),
      vertices,
      faces,
      creases
    };
  } catch (e) {
    console.error("Error parsing FOLD file:", e);
    return null;
  }
}
