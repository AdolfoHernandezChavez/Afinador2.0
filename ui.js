import { iniciarAudio } from './audio.js';
import { toggleGrabacion } from './transcriptor.js';
import { toggleMetronomo } from './metronomo.js';
import { state, TEMPERAMENTOS } from './state.js';

export function initUI() {

    // 🎤 MICRO
    document.getElementById('btn-start')
        ?.addEventListener('click', iniciarAudio);

    // 🎙️ GRABAR
    document.getElementById('btn-rec')
        ?.addEventListener('click', toggleGrabacion);

    // ⏱️ METRÓNOMO
    document.getElementById('btn-play-metronomo')
        ?.addEventListener('click', toggleMetronomo);

    // 🎸 INSTRUMENTOS
    document.getElementById('btn-timple')
        ?.addEventListener('click', () => cambiarInstrumento('timple'));

    document.getElementById('btn-contra')
        ?.addEventListener('click', () => cambiarInstrumento('contra'));

    document.getElementById('btn-guitarra')
        ?.addEventListener('click', () => cambiarInstrumento('guitarra'));

    document.getElementById('btn-bandurria')
        ?.addEventListener('click', () => cambiarInstrumento('bandurria'));

    document.getElementById('btn-laud')
        ?.addEventListener('click', () => cambiarInstrumento('laud'));

    document.getElementById('btn-mandolina')
        ?.addEventListener('click', () => cambiarInstrumento('mandolina'));

    // 🎼 TEMPERAMENTO
    document.getElementById('temperamento-select')
        ?.addEventListener('change', cambiarTemperamento);
}

// 🔥 FUNCIONES

function cambiarTemperamento() {
    const select = document.getElementById('temperamento-select');
    state.frecuenciaReferencia = TEMPERAMENTOS[select.value];
}

function cambiarInstrumento(inst) {
    document.querySelectorAll('.toggle-btn')
        .forEach(b => b.classList.remove('active'));

    document.getElementById('btn-' + inst)
        ?.classList.add('active');

    state.instrumentoActualData = INSTRUMENTOS[inst];
}