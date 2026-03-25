import { iniciarAudio } from './audio.js';
import { toggleGrabacion } from './transcriptor.js';
import { toggleMetronomo } from './metronomo.js';
import { state, TEMPERAMENTOS } from './state.js';
import { INSTRUMENTOS } from './datos.js';

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

// 🔥 CONTROL DE PESTAÑAS (MENÚ SUPERIOR)
window.cambiarVista = function(vista) {
    // 1. Lista de todas las vistas posibles en tu web
    const todasLasVistas = ['afinador', 'metronomo', 'transcriptor', 'juego']; 
    
    // 2. Ocultamos todas las vistas y desactivamos todas las pestañas
    todasLasVistas.forEach(v => {
        const divVista = document.getElementById('vista-' + v);
        if (divVista) divVista.classList.add('hidden');
        
        const tab = document.getElementById('tab-' + v);
        if (tab) tab.classList.remove('active');
    });

    // 3. Mostramos solo la vista seleccionada y activamos su pestaña
    const vistaSeleccionada = document.getElementById('vista-' + vista);
    if (vistaSeleccionada) vistaSeleccionada.classList.remove('hidden');

    const tabSeleccionada = document.getElementById('tab-' + vista);
    if (tabSeleccionada) tabSeleccionada.classList.add('active');
};