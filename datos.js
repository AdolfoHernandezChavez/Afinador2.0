const datosTimple = [ { num: '1ª', nota: 'D5', freq: 587.33 }, { num: '2ª', nota: 'A4', freq: 440.0 }, { num: '3ª', nota: 'E4', freq: 329.63 }, { num: '4ª', nota: 'C5', freq: 523.25 }, { num: '5ª', nota: 'G4', freq: 392.0 } ];
const datosContra = [ { num: '1ª', nota: 'G4', freq: 392.0 }, { num: '2ª', nota: 'D4', freq: 293.66 }, { num: '3ª', nota: 'A3', freq: 220.0 }, { num: '4ª', nota: 'F4', freq: 349.23 }, { num: '5ª', nota: 'C4', freq: 261.63 } ];
const datosGuitarra = [ { num: '1ª', nota: 'E4', freq: 329.63 }, { num: '2ª', nota: 'B3', freq: 246.94 }, { num: '3ª', nota: 'G3', freq: 196.0 }, { num: '4ª', nota: 'D3', freq: 146.83 }, { num: '5ª', nota: 'A2', freq: 110.0 }, { num: '6ª', nota: 'E2', freq: 82.41 } ];
const datosBandurria = [ { num: '1ª', nota: 'A5', freq: 880.0 }, { num: '2ª', nota: 'E5', freq: 659.25 }, { num: '3ª', nota: 'B4', freq: 493.88 }, { num: '4ª', nota: 'F#4', freq: 369.99 }, { num: '5ª', nota: 'C#4', freq: 277.18 }, { num: '6ª', nota: 'G#3', freq: 207.65 } ];
const datosLaud = [ { num: '1ª', nota: 'A4', freq: 440.0 }, { num: '2ª', nota: 'E4', freq: 329.63 }, { num: '3ª', nota: 'B3', freq: 246.94 }, { num: '4ª', nota: 'F#3', freq: 185.0 }, { num: '5ª', nota: 'C#3', freq: 138.59 }, { num: '6ª', nota: 'G#2', freq: 103.83 } ];

const INSTRUMENTOS = {
    timple: datosTimple,
    contra: datosContra,
    guitarra: datosGuitarra,
    bandurria: datosBandurria,
    laud: datosLaud
};

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const notasLatinas = {
    'C': 'Do', 'C#': 'Do#', 'D': 'Re', 'D#': 'Re#', 'E': 'Mi', 'F': 'Fa',
    'F#': 'Fa#', 'G': 'Sol', 'G#': 'Sol#', 'A': 'La', 'A#': 'La#', 'B': 'Si'
};

const afinacionesFretboard = {
    timple: ['D', 'A', 'E', 'C', 'G'],
    contra: ['G', 'D', 'A', 'F', 'C'],
    guitarra: ['E', 'B', 'G', 'D', 'A', 'E'],
    bandurria: ['A', 'E', 'B', 'F#', 'C#', 'G#'],
    laud: ['A', 'E', 'B', 'F#', 'C#', 'G#']
};

const cuerdasConOctava = {
    timple: ['D5', 'A4', 'E4', 'C5', 'G4'],
    contra: ['G4', 'D4', 'A3', 'F4', 'C4'],
    guitarra: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
    bandurria: ['A4', 'E4', 'B3', 'F#3', 'C#3', 'G#2'],
    laud: ['A4', 'E4', 'B3', 'F#3', 'C#3', 'G#2']
};

const diccionarioAcordes = [
    { nombre: "C", notas: ["C", "E", "G"] },
    { nombre: "D", notas: ["D", "F#", "A"] },
    { nombre: "E", notas: ["E", "G#", "B"] },
    { nombre: "F", notas: ["F", "A", "C"] },
    { nombre: "G", notas: ["G", "B", "D"] },
    { nombre: "A", notas: ["A", "C#", "E"] },
    { nombre: "B", notas: ["B", "D#", "F#"] },
    { nombre: "Cm", notas: ["C", "D#", "G"] },
    { nombre: "Dm", notas: ["D", "F", "A"] },
    { nombre: "Em", notas: ["E", "G", "B"] },
    { nombre: "Fm", notas: ["F", "G#", "C"] },
    { nombre: "Gm", notas: ["G", "A#", "D"] },
    { nombre: "Am", notas: ["A", "C", "E"] },
    { nombre: "Bm", notas: ["B", "D", "F#"] }
];

const posturasAcordesVisuales = {
    timple: {
        // --- MAYORES (Tabla BienMeSabe) ---
        "C": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 3} ], // Do Mayor
        "D": [ {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 2} ], // Re Mayor
        "E": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 3, traste: 4}, {cuerdaIndex: 4, traste: 1} ], // Mi Mayor
        "F": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 4, traste: 2} ], // Fa Mayor
        "G": [ {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 2, traste: 3}, {cuerdaIndex: 3, traste: 2} ], // Sol Mayor
        "A": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 3, traste: 1}, {cuerdaIndex: 4, traste: 2} ], // La Mayor
        "B": [ {cuerdaIndex: 0, traste: 1}, {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 3}, {cuerdaIndex: 4, traste: 4} ], // Si Mayor
        
        // --- MENORES (Tabla BienMeSabe) ---
        "Cm": [ {cuerdaIndex: 0, traste: 1}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 3} ], // Do menor
        "Dm": [ {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 2} ], // Re menor
        "Em": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 3, traste: 4} ], // Mi menor
        "Fm": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 4, traste: 1} ], // Fa menor
        "Gm": [ {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 2, traste: 3}, {cuerdaIndex: 3, traste: 2} ], // Sol menor
        "Am": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 4, traste: 2} ], // La menor
        "Bm": [ {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 4} ] // Si menor
    },
    guitarra: {
        // --- MAYORES ---
        "C": [ {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 3} ], 
        "D": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 2} ], 
        "E": [ {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 2} ], 
        "F": [ {cuerdaIndex: 0, traste: 1}, {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 3}, {cuerdaIndex: 4, traste: 3}, {cuerdaIndex: 5, traste: 1} ], 
        "G": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 4, traste: 2}, {cuerdaIndex: 5, traste: 3} ], 
        "A": [ {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 2} ], 
        "B": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 4}, {cuerdaIndex: 2, traste: 4}, {cuerdaIndex: 3, traste: 4}, {cuerdaIndex: 4, traste: 2} ], 
        
        // --- MENORES ---
        "Cm": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 1, traste: 4}, {cuerdaIndex: 2, traste: 5}, {cuerdaIndex: 3, traste: 5}, {cuerdaIndex: 4, traste: 3} ], 
        "Dm": [ {cuerdaIndex: 0, traste: 1}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 2} ], 
        "Em": [ {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 2} ], 
        "Fm": [ {cuerdaIndex: 0, traste: 1}, {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 3, traste: 3}, {cuerdaIndex: 4, traste: 3}, {cuerdaIndex: 5, traste: 1} ], 
        "Gm": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 3}, {cuerdaIndex: 3, traste: 5}, {cuerdaIndex: 4, traste: 5}, {cuerdaIndex: 5, traste: 3} ], 
        "Am": [ {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 2, traste: 2}, {cuerdaIndex: 3, traste: 2} ], 
        "Bm": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 4}, {cuerdaIndex: 3, traste: 4}, {cuerdaIndex: 4, traste: 2} ]
    },
    contra: {},
    bandurria: {},
    laud: {}
};
