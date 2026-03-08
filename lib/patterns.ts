export type CreaseType = 'mountain' | 'valley' | 'flat';

export interface CreaseDef {
  edge: [number, number];
  type: CreaseType;
}

export interface Pattern {
  id: string;
  name: string;
  vertices: [number, number][];
  faces: [number, number, number][];
  creases: CreaseDef[];
}

export const patterns: Pattern[] = [
  {
    id: 'simple',
    name: 'Simple Valley Fold',
    vertices: [
      [-1, 1], [1, 1],
      [-1, 0], [1, 0],
      [-1, -1], [1, -1]
    ],
    faces: [
      [0, 2, 3], [0, 3, 1],
      [2, 4, 5], [2, 5, 3]
    ],
    creases: [
      { edge: [2, 3], type: 'valley' }
    ]
  },
  {
    id: 'accordion',
    name: 'Accordion Fold',
    vertices: [
      [-1, 1], [-0.5, 1], [0, 1], [0.5, 1], [1, 1],
      [-1, -1], [-0.5, -1], [0, -1], [0.5, -1], [1, -1]
    ],
    faces: [
      [0, 1, 6], [0, 6, 5],
      [1, 2, 7], [1, 7, 6],
      [2, 3, 8], [2, 8, 7],
      [3, 4, 9], [3, 9, 8]
    ],
    creases: [
      { edge: [1, 6], type: 'valley' },
      { edge: [2, 7], type: 'mountain' },
      { edge: [3, 8], type: 'valley' }
    ]
  },
  {
    id: 'waterbomb',
    name: 'Waterbomb Base',
    vertices: [
      [-1, 1], [0, 1], [1, 1],
      [-1, 0], [0, 0], [1, 0],
      [-1, -1], [0, -1], [1, -1]
    ],
    faces: [
      [0, 1, 4], [1, 2, 4],
      [2, 5, 4], [5, 8, 4],
      [8, 7, 4], [7, 6, 4],
      [6, 3, 4], [3, 0, 4]
    ],
    creases: [
      { edge: [0, 4], type: 'valley' },
      { edge: [2, 4], type: 'valley' },
      { edge: [6, 4], type: 'valley' },
      { edge: [8, 4], type: 'valley' },
      { edge: [1, 4], type: 'mountain' },
      { edge: [3, 4], type: 'mountain' },
      { edge: [5, 4], type: 'mountain' },
      { edge: [7, 4], type: 'mountain' }
    ]
  },
  {
    id: 'preliminary',
    name: 'Preliminary Fold (Square Base)',
    vertices: [
      [-1, 1], [0, 1], [1, 1],
      [-1, 0], [0, 0], [1, 0],
      [-1, -1], [0, -1], [1, -1]
    ],
    faces: [
      [0, 1, 4], [1, 2, 4],
      [2, 5, 4], [5, 8, 4],
      [8, 7, 4], [7, 6, 4],
      [6, 3, 4], [3, 0, 4]
    ],
    creases: [
      { edge: [0, 4], type: 'mountain' },
      { edge: [2, 4], type: 'mountain' },
      { edge: [6, 4], type: 'mountain' },
      { edge: [8, 4], type: 'mountain' },
      { edge: [1, 4], type: 'valley' },
      { edge: [3, 4], type: 'valley' },
      { edge: [5, 4], type: 'valley' },
      { edge: [7, 4], type: 'valley' }
    ]
  },
  {
    id: 'miura',
    name: 'Miura-ori (2x2)',
    vertices: [
      [-1, 1], [0, 1.2], [1, 1],
      [-1, 0], [0, 0.2], [1, 0],
      [-1, -1], [0, -0.8], [1, -1]
    ],
    faces: [
      [0, 1, 4], [0, 4, 3],
      [1, 2, 5], [1, 5, 4],
      [3, 4, 7], [3, 7, 6],
      [4, 5, 8], [4, 8, 7]
    ],
    creases: [
      { edge: [1, 4], type: 'mountain' },
      { edge: [4, 7], type: 'mountain' },
      { edge: [3, 4], type: 'valley' },
      { edge: [4, 5], type: 'mountain' }
    ]
  },
  {
    id: 'bird_base',
    name: 'Bird Base',
    vertices: [
      [-1, 1], [0, 1], [1, 1],
      [-1, 0], [0, 0], [1, 0],
      [-1, -1], [0, -1], [1, -1],
      [-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]
    ],
    faces: [
      [0, 9, 3], [0, 1, 9], [1, 4, 9], [3, 9, 4],
      [1, 10, 4], [1, 2, 10], [2, 5, 10], [4, 10, 5],
      [3, 4, 11], [3, 11, 6], [6, 11, 7], [4, 7, 11],
      [4, 5, 12], [5, 8, 12], [8, 7, 12], [4, 12, 7]
    ],
    creases: [
      { edge: [1, 4], type: 'mountain' },
      { edge: [3, 4], type: 'mountain' },
      { edge: [5, 4], type: 'mountain' },
      { edge: [7, 4], type: 'mountain' },
      { edge: [0, 9], type: 'valley' },
      { edge: [9, 4], type: 'valley' },
      { edge: [2, 10], type: 'valley' },
      { edge: [10, 4], type: 'valley' },
      { edge: [6, 11], type: 'valley' },
      { edge: [11, 4], type: 'valley' },
      { edge: [8, 12], type: 'valley' },
      { edge: [12, 4], type: 'valley' },
      { edge: [1, 9], type: 'mountain' },
      { edge: [3, 9], type: 'mountain' },
      { edge: [1, 10], type: 'mountain' },
      { edge: [5, 10], type: 'mountain' },
      { edge: [3, 11], type: 'mountain' },
      { edge: [7, 11], type: 'mountain' },
      { edge: [5, 12], type: 'mountain' },
      { edge: [7, 12], type: 'mountain' }
    ]
  },
  {
    id: 'hypar',
    name: 'Hyperbolic Paraboloid',
    vertices: [
      [-1, 1], [-0.5, 1], [0, 1], [0.5, 1], [1, 1],
      [-1, 0.5], [-0.5, 0.5], [0, 0.5], [0.5, 0.5], [1, 0.5],
      [-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0],
      [-1, -0.5], [-0.5, -0.5], [0, -0.5], [0.5, -0.5], [1, -0.5],
      [-1, -1], [-0.5, -1], [0, -1], [0.5, -1], [1, -1]
    ],
    faces: [
      [0, 1, 6], [0, 6, 5], [1, 2, 7], [1, 7, 6], [2, 3, 8], [2, 8, 7], [3, 4, 9], [3, 9, 8],
      [5, 6, 11], [5, 11, 10], [6, 7, 12], [6, 12, 11], [7, 8, 13], [7, 13, 12], [8, 9, 14], [8, 14, 13],
      [10, 11, 16], [10, 16, 15], [11, 12, 17], [11, 17, 16], [12, 13, 18], [12, 18, 17], [13, 14, 19], [13, 19, 18],
      [15, 16, 21], [15, 21, 20], [16, 17, 22], [16, 22, 21], [17, 18, 23], [17, 23, 22], [18, 19, 24], [18, 24, 23]
    ],
    creases: [
      { edge: [1, 6], type: 'mountain' }, { edge: [6, 11], type: 'mountain' }, { edge: [11, 16], type: 'mountain' }, { edge: [16, 21], type: 'mountain' },
      { edge: [2, 7], type: 'valley' }, { edge: [7, 12], type: 'valley' }, { edge: [12, 17], type: 'valley' }, { edge: [17, 22], type: 'valley' },
      { edge: [3, 8], type: 'mountain' }, { edge: [8, 13], type: 'mountain' }, { edge: [13, 18], type: 'mountain' }, { edge: [18, 23], type: 'mountain' },
      { edge: [5, 6], type: 'valley' }, { edge: [6, 7], type: 'valley' }, { edge: [7, 8], type: 'valley' }, { edge: [8, 9], type: 'valley' },
      { edge: [10, 11], type: 'mountain' }, { edge: [11, 12], type: 'mountain' }, { edge: [12, 13], type: 'mountain' }, { edge: [13, 14], type: 'mountain' },
      { edge: [15, 16], type: 'valley' }, { edge: [16, 17], type: 'valley' }, { edge: [17, 18], type: 'valley' }, { edge: [18, 19], type: 'valley' }
    ]
  }
];
