import { state } from './state.js';

let bpm = 120;
let isPlaying = false;
let intervalId = null;

export function toggleMetronomo() {
    if (isPlaying) detener();
    else iniciar();
}

function iniciar() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (state.audioContext.state === 'suspended') {
        state.audioContext.resume();
    }

    isPlaying = true;

    const intervalo = (60 / bpm) * 1000;

    tick();
    intervalId = setInterval(tick, intervalo);
}

function detener() {
    isPlaying = false;
    clearInterval(intervalId);
}

function tick() {
    beep();

    const circle = document.getElementById('visual-beat');
    circle.classList.remove('tick');
    void circle.offsetWidth;
    circle.classList.add('tick');
}

function beep() {
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();

    osc.frequency.value = 800;
    gain.gain.setValueAtTime(1, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(state.audioContext.destination);

    osc.start();
    osc.stop(state.audioContext.currentTime + 0.05);
}