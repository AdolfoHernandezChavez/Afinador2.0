import { state, CONFIG } from './state.js';

// --- GRABACIÓN ---
export async function toggleGrabacion() {

    if (!state.isRecording && !state.isRunning) {
        const { iniciarAudio } = await import('./audio.js');
        await iniciarAudio();
    }

    if (state.audioContext?.state === 'suspended') {
        await state.audioContext.resume();
    }

    state.isRecording = !state.isRecording;
    const btn = document.getElementById('btn-rec');

    if (state.isRecording) {
        btn.innerHTML = "DETENER";
        btn.classList.add('recording');
        limpiarNotas();
    } else {
        btn.innerHTML = "GRABAR MICRO";
        btn.classList.remove('recording');
    }
}

export function limpiarNotas() {
    document.getElementById('sheet-music').innerHTML = '';
    state.notasGrabadas = [];
    state.lastCandidate = '';
    state.framesHeld = 0;
}

// --- DETECCIÓN ---
export function analizarMelodia(freq) {
    const nota = getNoteAndOctave(freq);

    if (nota === state.lastCandidate) state.framesHeld++;
    else {
        state.framesHeld = 0;
        state.lastCandidate = nota;
    }

    if (state.framesHeld === CONFIG.MELODY_THRESHOLD) {
        escribirNota(nota);
    }
}

// --- ESCRITURA ---
function escribirNota(nota) {
    state.notasGrabadas.push(nota);

    const span = document.createElement('span');
    span.className = 'note-bubble';
    span.innerText = nota;

    const sheet = document.getElementById('sheet-music');
    sheet.appendChild(span);
    sheet.scrollTop = sheet.scrollHeight;
}

// --- UTIL ---
function getNoteAndOctave(freq) {
    const noteNum = 12 * (Math.log(freq / state.frecuenciaReferencia) / Math.log(2)) + 69;
    const rounded = Math.round(noteNum);
    const noteIndex = ((rounded % 12) + 12) % 12;
    const octave = Math.floor(rounded / 12) - 1;
    return NOTAS[noteIndex] + octave;
}