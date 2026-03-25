import { state } from './state.js';

let puntos = 0;
let activo = false;
let notaObjetivo = '';

export function iniciarJuego() {
    puntos = 0;
    activo = true;
    nuevaNota();
}

function nuevaNota() {
    const notas = ['C4','D4','E4','F4','G4','A4','B4'];
    notaObjetivo = notas[Math.floor(Math.random() * notas.length)];

    document.getElementById('nota-pantalla').innerText = notaObjetivo;
}

export function detectarJuego(freq) {
    if (!activo) return;

    const nota = getNoteAndOctave(freq);

    document.getElementById('nota-escuchada').innerText = nota;

    if (nota === notaObjetivo) {
        acierto();
    }
}

function acierto() {
    puntos++;
    document.getElementById('puntos-texto').innerText = puntos;

    setTimeout(() => {
        nuevaNota();
    }, 800);
}

function getNoteAndOctave(freq) {
    const noteNum = 12 * (Math.log(freq / state.frecuenciaReferencia) / Math.log(2)) + 69;
    const rounded = Math.round(noteNum);
    const noteIndex = ((rounded % 12) + 12) % 12;
    const octave = Math.floor(rounded / 12) - 1;
    return NOTAS[noteIndex] + octave;
}