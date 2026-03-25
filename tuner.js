import { state, CONFIG } from './state.js';

export function actualizarAguja(freq) {

    // suavizado
    if (state.smoothedFrequency === 0) {
        state.smoothedFrequency = freq;
    } else {
        state.smoothedFrequency =
            freq * CONFIG.SMOOTHING_FACTOR +
            state.smoothedFrequency * (1 - CONFIG.SMOOTHING_FACTOR);
    }

    // auto detección cuerda
    const cuerda = encontrarCuerdaMasCercana(state.smoothedFrequency);
    if (cuerda) {
        state.targetFrequency = cuerda.freq;
        actualizarNotaUI(cuerda.nota);
    }

    const diff = state.smoothedFrequency - state.targetFrequency;
    actualizarGauge(diff);
}

// 🔥 NUEVAS FUNCIONES LIMPIAS

function actualizarGauge(diff) {
    const needle = document.getElementById('needle');
    const status = document.getElementById('status');

    let angulo = diff * (CONFIG.GAUGE_MAX_ANGLE / 20);

    needle.style.transform = `translateX(-50%) rotate(${angulo}deg)`;

    if (Math.abs(diff) < CONFIG.IN_TUNE_THRESHOLD_HZ) {
        status.innerText = '¡PERFECTO!';
    } else {
        status.innerText = diff < 0 ? 'Sube' : 'Baja';
    }
}

function actualizarNotaUI(nota) {
    document.getElementById('note-name').innerText = nota;
}

// 🔥 DETECCIÓN

export function encontrarCuerdaMasCercana(freq) {
    let mejor = null;
    let min = Infinity;

    state.instrumentoActualData.forEach(c => {
        const diff = Math.abs(freq - c.freq);
        if (diff < min) {
            min = diff;
            mejor = c;
        }
    });

    return mejor;
}