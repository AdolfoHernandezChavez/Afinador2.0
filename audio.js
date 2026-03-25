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

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++)
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}