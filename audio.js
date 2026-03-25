import { state } from './state.js';
import { actualizarAguja } from './tuner.js';
import { analizarMelodia } from './transcriptor.js';

export async function iniciarAudio() {
    if (state.isRunning) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const filtro = state.audioContext.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 600;

    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;

    const source = state.audioContext.createMediaStreamSource(stream);
    source.connect(filtro);
    filtro.connect(state.analyser);

    state.isRunning = true;

    bucle();
}

function bucle() {
    if (!state.isRunning) return;

    const buffer = new Float32Array(state.analyser.fftSize);
    state.analyser.getFloatTimeDomainData(buffer);

    const freq = autoCorrelate(buffer, state.audioContext.sampleRate);

    if (freq !== -1) {
        actualizarAguja(freq);
        if (state.isRecording) analizarMelodia(freq);
    }

    requestAnimationFrame(bucle);
}