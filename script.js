let audioContext;
let analyser;
let isRunning = false;
let isRecording = false;
let sourceFileNode = null;

const MELODY_THRESHOLD = 4;
const MAX_TRASTE = 15;
const IN_TUNE_THRESHOLD_HZ = 1.5;
const GAUGE_MAX_ANGLE = 60;
const GAUGE_SCALE = GAUGE_MAX_ANGLE / 20;

let framesHeld = 0;
let lastCandidate = '';
let notasGrabadas = [];
let instrumentoActualData = [];
let targetFrequency = 587.33; 

let smoothedFrequency = 0; // Almacenará la frecuencia suavizada
const SMOOTHING_FACTOR = 0.15; // Cuanto más bajo, más lenta y estable es la aguja (0.1 a 0.2 es ideal)

const TEMPERAMENTOS = { estandar: 440.0, orquestal: 442.0, tradicional: 435.0 };
let frecuenciaReferencia = TEMPERAMENTOS.estandar;

window.addEventListener('load', () => {
    cambiarInstrumento('timple');
    configurarEventosUI();
    document.getElementById('temperamento-select').value = 'estandar';
});

// --- UI Y CONFIGURACIÓN ---
function cambiarTemperamento() {
    const select = document.getElementById('temperamento-select');
    frecuenciaReferencia = TEMPERAMENTOS[select.value];
    document.getElementById('status').innerText = `Afina: ${document.getElementById('note-name').innerText} (${frecuenciaReferencia.toFixed(0)} Hz)`;
}

function configurarEventosUI() {
    const tabAfinador = document.getElementById('tab-afinador');
    const tabTranscriptor = document.getElementById('tab-transcriptor');

    tabAfinador.addEventListener('click', () => cambiarVista('afinador'));
    tabTranscriptor.addEventListener('click', () => cambiarVista('transcriptor'));

    const tabs = [tabAfinador, tabTranscriptor];
    tabs.forEach((tab, index) => {
        tab.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                const nextIndex = (index + dir + tabs.length) % tabs.length;
                tabs[nextIndex].click();
                tabs[nextIndex].focus();
            }
        });
    });

    document.getElementById('btn-start').addEventListener('click', iniciarAudio);
    document.getElementById('btn-timple').addEventListener('click', () => cambiarInstrumento('timple'));
    document.getElementById('btn-contra').addEventListener('click', () => cambiarInstrumento('contra'));
    document.getElementById('btn-guitarra').addEventListener('click', () => cambiarInstrumento('guitarra'));
    document.getElementById('btn-bandurria').addEventListener('click', () => cambiarInstrumento('bandurria'));
    document.getElementById('btn-laud').addEventListener('click', () => cambiarInstrumento('laud'));
    document.getElementById('btn-rec').addEventListener('click', toggleGrabacion);
    document.getElementById('btn-clear').addEventListener('click', limpiarNotas);
    document.getElementById('btn-download').addEventListener('click', descargarTablatura);
    document.getElementById('audio-file').addEventListener('change', cargarAudio);
}

function cambiarVista(vista) {
    const vistas = ['afinador', 'metronomo', 'transcriptor'];
    
    vistas.forEach(v => {
        document.getElementById('vista-' + v).classList.add('hidden');
        document.getElementById('tab-' + v).classList.remove('active');
    });

    document.getElementById('vista-' + vista).classList.remove('hidden');
    document.getElementById('tab-' + vista).classList.add('active');

    const btnStart = document.getElementById('btn-start');
    if (vista === 'metronomo') btnStart.classList.add('hidden');
    else btnStart.classList.remove('hidden');

    if (vista !== 'transcriptor' && typeof isRecording !== 'undefined' && isRecording) toggleGrabacion();
    if (vista !== 'metronomo' && typeof isMetronomePlaying !== 'undefined' && isMetronomePlaying) detenerMetronomo(false);
}

function cambiarInstrumento(inst) {
    document.querySelectorAll('.toggle-container .toggle-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-' + inst);
    if (btn) btn.classList.add('active');

    instrumentoActualData = INSTRUMENTOS[inst] || INSTRUMENTOS.timple;
    generarBotones(instrumentoActualData);
}

function generarBotones(datos) {
    const contenedor = document.getElementById('cuerdas-container');
    contenedor.innerHTML = '';

    datos.forEach((cuerda, index) => {
        const btn = document.createElement('button');
        btn.className = 'string-btn';
        btn.type = 'button';
        btn.innerText = cuerda.num;
        btn.addEventListener('click', () => seleccionarCuerda(cuerda, btn));
        contenedor.appendChild(btn);
        if (index === 0) btn.click();
    });
}

function seleccionarCuerda(cuerda, btn) {
    targetFrequency = cuerda.freq;
    document.querySelectorAll('.string-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const noteName = document.getElementById('note-name');
    const status = document.getElementById('status');

    noteName.innerText = cuerda.nota;
    noteName.style.color = '#fff';
    status.innerText = 'Afina: ' + cuerda.nota;
    status.style.color = '#aaa';
}

// --- TRANSCRIPTOR ---
async function toggleGrabacion() {
    // 1. Si vamos a empezar a grabar y el motor general está apagado, lo encendemos
    if (!isRecording && !isRunning) {
        await iniciarAudio();
    }

    // 2. Por si el navegador "duerme" el audio, lo despertamos a la fuerza
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    // 3. Cambiamos el estado de grabación
    isRecording = !isRecording;
    const btn = document.getElementById('btn-rec');

    if (isRecording) {
        // MODO GRABANDO: Botón en rojo
        btn.innerHTML = "<span class='material-icons' aria-hidden='true'>stop_circle</span> DETENER";
        btn.classList.add('recording');
        btn.style.background = '#F44336'; // Forzamos el color rojo por si falla el CSS
        btn.style.color = '#fff';
        limpiarNotas();
    } else {
        // MODO DETENIDO: Botón normal
        btn.innerHTML = "<span class='material-icons' aria-hidden='true'>mic</span> GRABAR MICRO";
        btn.classList.remove('recording');
        btn.style.background = ''; // Quitamos el color rojo
        detenerFuenteArchivo();
    }
}

function limpiarNotas() {
    document.getElementById('sheet-music').innerHTML = '<span class="placeholder">Graba o sube un audio...</span>';
    lastCandidate = '';
    framesHeld = 0;
    notasGrabadas = [];
}

function detenerFuenteArchivo() {
    if (sourceFileNode) {
        try { sourceFileNode.stop(); } catch (e) {}
        sourceFileNode = null;
    }
}

function notaAMidi(notaStr) {
    const nota = notaStr.slice(0, -1);
    const octava = parseInt(notaStr.slice(-1), 10);
    const index = NOTAS.indexOf(nota);
    if (index === -1 || Number.isNaN(octava)) return null;
    return (octava + 1) * 12 + index;
}

function calcularPosicion(notaStr) {
    const midiNotaDetectada = notaAMidi(notaStr);
    if (midiNotaDetectada === null) return [];

    const opciones = [];
    instrumentoActualData.forEach(cuerda => {
        const midiCuerdaAlAire = notaAMidi(cuerda.nota);
        const traste = midiNotaDetectada - midiCuerdaAlAire;
        if (traste >= 0 && traste <= MAX_TRASTE) {
            opciones.push({ cuerda: cuerda.num, traste, numCuerda: parseInt(cuerda.num, 10) });
        }
    });

    if (opciones.length === 0) return [];

    const opcionesAgudas = opciones.filter(o => o.numCuerda <= 3).sort((a, b) => a.traste - b.traste);
    const opcionesGraves = opciones.filter(o => o.numCuerda > 3).sort((a, b) => a.traste - b.traste);
    const resultadoFinal = [];

    if (opcionesAgudas.length > 0) {
        resultadoFinal.push(opcionesAgudas[0]);
        if (opcionesGraves.length > 0 && opcionesGraves[0].traste < opcionesAgudas[0].traste) {
            resultadoFinal.push(opcionesGraves[0]);
        }
    } else if (opcionesGraves.length > 0) {
        resultadoFinal.push(opcionesGraves[0]);
    }

    return resultadoFinal;
}

function escribirNota(texto) {
    const sheet = document.getElementById('sheet-music');
    if (sheet.querySelector('.placeholder')) sheet.innerHTML = '';

    const opciones = calcularPosicion(texto);
    notasGrabadas.push({ nota: texto, opciones });

    const span = document.createElement('span');
    span.className = 'note-bubble';

    if (opciones && opciones.length > 0) {
        const primaria = opciones[0];
        let txtVisual = `${texto} (${primaria.cuerda} T${primaria.traste})`;
        if (opciones.length > 1) {
            const alternativa = opciones[1];
            txtVisual = `${texto} (${primaria.cuerda} T${primaria.traste} ó ${alternativa.cuerda} T${alternativa.traste})`;
        }
        span.innerText = txtVisual;
    } else {
        span.innerText = texto;
    }

    sheet.appendChild(span);
    sheet.scrollTop = sheet.scrollHeight;
}

function descargarTablatura() {
    if (notasGrabadas.length === 0) {
        alert('¡No has grabado ninguna nota todavía!');
        return;
    }

    let txt = '========================================\n TABLATURA CANARIA (DIGITACIÓN INTELIGENTE)\n========================================\n * Las notas normales (ej: -3-) son la sugerencia principal.\n * Las notas en paréntesis (ej: -(0)-) son opciones alternativas.\n\n';
    const notasPorRenglon = 20;

    for (let i = 0; i < notasGrabadas.length; i += notasPorRenglon) {
        const bloqueNotas = notasGrabadas.slice(i, i + notasPorRenglon);
        instrumentoActualData.forEach(cuerdaInst => {
            const notaCorta = cuerdaInst.nota.split(' ')[0].padEnd(2, ' ');
            let linea = `${cuerdaInst.num} (${notaCorta}) ||`;

            bloqueNotas.forEach(notaGrabada => {
                const opciones = notaGrabada.opciones;
                let bloqueVisual = '------';

                if (opciones && opciones.length > 0) {
                    const esPrimaria = opciones[0].cuerda === cuerdaInst.num;
                    const esAlternativa = opciones.slice(1).find(opt => opt.cuerda === cuerdaInst.num);

                    if (esPrimaria) {
                        bloqueVisual = '-' + opciones[0].traste.toString().padEnd(2, '-') + '---';
                    } else if (esAlternativa) {
                        bloqueVisual = '-(' + esAlternativa.traste.toString() + ')-'.padEnd(4, '-') + '-';
                    }
                }
                linea += bloqueVisual;
            });
            txt += linea + '|\n';
        });
        txt += '\n';
    }

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mi_tablatura_canaria.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function cargarAudio(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (isRecording) toggleGrabacion();
    if (sourceFileNode) { try { sourceFileNode.stop(); } catch(e){} }

    const sheet = document.getElementById('sheet-music');
    limpiarNotas(); 
    
    const oldProg = document.getElementById('prog-container');
    if (oldProg) oldProg.remove();

    sheet.insertAdjacentHTML('beforebegin', `
        <div id="prog-container" style="width: 100%; text-align: center; padding: 12px; margin-bottom: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #444;">
            <div style="color: var(--ocean-blue); margin-bottom: 8px; font-weight: bold; font-size: 0.95rem;">
                Analizando partitura... <span id="prog-txt">0%</span>
            </div>
            <div style="width: 100%; background: #222; height: 12px; border-radius: 10px; overflow: hidden; border: 1px solid #111;">
                <div id="prog-bar" style="width: 0%; background: var(--canary-yellow); height: 100%; transition: width 0.1s;"></div>
            </div>
        </div>
    `);
    
    const progContainer = document.getElementById('prog-container');
    const progTxt = document.getElementById('prog-txt');
    const progBar = document.getElementById('prog-bar');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0); 
        const sampleRate = audioBuffer.sampleRate;
        const chunkSize = 2048; 
        const step = 1024; 
        
        let localFramesHeld = 0;
        let localLastCandidate = "";
        let ultimaNotaGuardada = "";
        let silenceFrames = 0; 
        const totalSamples = channelData.length;
        let currentSample = 0;

        function procesarLote() {
            try {
                const limiteLote = Math.min(currentSample + (sampleRate / 4), totalSamples); 
                for (; currentSample < limiteLote; currentSample += step) {
                    const chunk = channelData.slice(currentSample, currentSample + chunkSize);
                    if (chunk.length < chunkSize) { currentSample = totalSamples; break; }

                    const freq = autoCorrelate(chunk, sampleRate);

                    if (freq !== -1) {
                        silenceFrames = 0; 
                        const nota = getNoteAndOctave(freq);
                        if (nota === localLastCandidate) localFramesHeld++;
                        else { localFramesHeld = 0; localLastCandidate = nota; }

                        if (localFramesHeld === 2 && nota !== ultimaNotaGuardada) {
                            escribirNota(nota); 
                            ultimaNotaGuardada = nota;
                        }
                    } else {
                        silenceFrames++;
                        if (localFramesHeld > 0) localFramesHeld--;
                        if (silenceFrames > 5) ultimaNotaGuardada = ""; 
                    }
                }

                const porcentaje = Math.floor((currentSample / totalSamples) * 100);
                if(progTxt && progBar) {
                    progTxt.innerText = Math.min(porcentaje, 100) + "%"; 
                    progBar.style.width = Math.min(porcentaje, 100) + "%";
                }

                if (currentSample < totalSamples) setTimeout(procesarLote, 5); 
                else {
                    if (progContainer) progContainer.remove();
                    if (notasGrabadas.length === 0) sheet.innerHTML = '<span class="placeholder">No se detectaron notas.</span>';
                    event.target.value = ''; 
                }
            } catch (err) { console.error("Error:", err); }
        }
        setTimeout(procesarLote, 50);

    } catch (error) {
        sheet.innerHTML = '<span class="placeholder" style="color:#ff4d4d;">Error al decodificar el audio.</span>';
    }
}

// --- MICRO Y AFINADOR ---
async function iniciarAudio() {
    if (isRunning) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Creamos el filtro
        const filtroSordina = audioContext.createBiquadFilter();
        filtroSordina.type = 'bandpass'; 
        filtroSordina.frequency.value = 600; // Centrado en el rango musical útil
        filtroSordina.Q.value = 1.0;         // Ancho de banda moderado

        // 2. Configuramos el analizador como antes
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        // 3. LA CADENA DE CONEXIÓN (IMPORTANTE):
        // Micro -> Filtro -> Analizador
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(filtroSordina);
        filtroSordina.connect(analyser);

        isRunning = true;
        actualizarBotonMicro();
        buclePrincipal();
    } catch (e) { 
        console.error(e);
        alert('Error: No se detecta micrófono o el acceso fue denegado.'); 
    }
}

function actualizarBotonMicro() {
    const btn = document.getElementById('btn-start');
    if (!btn) return;
    if (isRunning) {
        btn.innerHTML = "<span class='material-icons' aria-hidden='true'>mic</span> MICRO ACTIVO";
        btn.style.background = '#222';
        btn.setAttribute('aria-pressed', 'true');
    } else {
        btn.innerHTML = "<span class='material-icons' aria-hidden='true'>mic</span> ACTIVAR MICRO";
        btn.style.background = '';
        btn.setAttribute('aria-pressed', 'false');
    }
}

function buclePrincipal() {
    if (!analyser || !audioContext || !isRunning) return requestAnimationFrame(buclePrincipal);

    const bufferTime = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(bufferTime);
    const freq = autoCorrelate(bufferTime, audioContext.sampleRate);

    if (freq !== -1) {
        actualizarAguja(freq);
        if (isRecording) analizarMelodia(freq);
    } else {
        if (framesHeld > 0) framesHeld--;
    }
    requestAnimationFrame(buclePrincipal);
}

function actualizarAguja(freq) {
    // 1. Aplicamos el suavizado (EMA)
    // Si es la primera vez que detectamos algo, igualamos directamente
    if (smoothedFrequency === 0) {
        smoothedFrequency = freq;
    } else {
        // La magia: 15% del valor nuevo + 85% del valor anterior
        smoothedFrequency = (freq * SMOOTHING_FACTOR) + (smoothedFrequency * (1 - SMOOTHING_FACTOR));
    }

    // Usamos la frecuencia suavizada para el resto de cálculos
    const diff = smoothedFrequency - targetFrequency;
    let angulo = diff * GAUGE_SCALE;
    
    if (angulo > GAUGE_MAX_ANGLE) angulo = GAUGE_MAX_ANGLE;
    if (angulo < -GAUGE_MAX_ANGLE) angulo = -GAUGE_MAX_ANGLE;

    const needle = document.getElementById('needle');
    const frequency = document.getElementById('frequency');
    const status = document.getElementById('status');
    const noteName = document.getElementById('note-name');

    // Aplicamos la rotación con el valor suavizado
    needle.style.transform = `translateX(-50%) rotate(${angulo}deg)`;
    
    // Mostramos la frecuencia real detectada (para que el usuario vea el número exacto)
    // o puedes usar smoothedFrequency.toFixed(1) para que el número también sea estable
    frequency.innerText = smoothedFrequency.toFixed(1) + ' Hz';
    const cuerdaDetectada = encontrarCuerdaMasCercana(smoothedFrequency);

    if (cuerdaDetectada) {
        targetFrequency = cuerdaDetectada.freq;

    // Actualizar UI automáticamente
        const noteName = document.getElementById('note-name');
        noteName.innerText = cuerdaDetectada.nota;

    // Marcar botón visual (opcional pero PRO)
        document.querySelectorAll('.string-btn').forEach(b => b.classList.remove('selected'));
        const botones = document.querySelectorAll('.string-btn');
        const index = instrumentoActualData.indexOf(cuerdaDetectada);
    if (botones[index]) botones[index].classList.add('selected');
    }
    
    if (Math.abs(diff) < IN_TUNE_THRESHOLD_HZ) {
        needle.style.background = 'var(--canary-yellow)';
        status.innerText = '¡PERFECTO! 🇮🇨';
        status.style.color = 'var(--canary-yellow)';
        noteName.style.color = 'var(--canary-yellow)';
        needle.style.boxShadow = '0 0 15px var(--canary-yellow)';
    } else {
        needle.style.background = '#ff4d4d';
        needle.style.boxShadow = 'none';
        noteName.style.color = '#fff';
        status.innerText = diff < 0 ? 'Aprieta (Sube) 🔼' : 'Afloja (Baja) 🔽';
        status.style.color = '#ff9999';
    }
}

function analizarMelodia(freq) {
    const nota = getNoteAndOctave(freq);
    if (nota === lastCandidate) framesHeld++;
    else { framesHeld = 0; lastCandidate = nota; }

    if (framesHeld === MELODY_THRESHOLD) {
        const ultimaNota = notasGrabadas.length ? notasGrabadas[notasGrabadas.length - 1].nota : '';
        if (nota !== ultimaNota) escribirNota(nota);
    }
}

function getNoteAndOctave(freq) {
    const noteNum = 12 * (Math.log(freq / frecuenciaReferencia) / Math.log(2)) + 69;
    const rounded = Math.round(noteNum);
    const noteIndex = ((rounded % 12) + 12) % 12;
    const octave = Math.floor(rounded / 12) - 1;
    return NOTAS[noteIndex] + octave;
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;

    // 1. Cálculo de la energía (RMS)
    for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // SUBIMOS EL UMBRAL: Si el sonido es muy débil (ruido de fondo), lo ignoramos.
    // Antes tenías 0.008 o 0.01. Subirlo a 0.02 o 0.03 ayuda mucho.
    if (rms < 0.025) return -1; 

    // 2. Recorte de silencio en los extremos del buffer (Mejora la precisión)
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    // 3. Autocorrelación
    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    // 4. Encontrar el primer pico significativo
    let d = 0; 
    while (c[d] > c[d + 1]) d++; // Bajamos desde el origen (lag 0)
    
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    
    let T0 = maxpos;

    // --- NUEVA MEJORA: CONFIDENCE CHECK ---
    // Si el valor del pico encontrado no es al menos el 90% de la energía total,
    // probablemente sea ruido aleatorio y no una nota musical clara.
    let confidence = maxval / c[0];
    if (confidence < 0.9) return -1; 

    // 5. Interpolación parabólica para máxima precisión
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

// --- METRÓNOMO ---
let bpm = 120;
let isMetronomePlaying = false;
let metronomeIntervalId = null;

function cambiarBPM(delta) {
    let nuevoBPM = Math.max(40, Math.min(240, bpm + delta));
    actualizarUIBPM(nuevoBPM);
}

function actualizarSlider(valor) { actualizarUIBPM(parseInt(valor)); }

function actualizarUIBPM(nuevoBPM) {
    bpm = nuevoBPM;
    document.getElementById('bpm-value').innerText = bpm;
    document.getElementById('bpm-slider').value = bpm;
    if (isMetronomePlaying) {
        detenerMetronomo(true);
        iniciarMetronomo();
    }
}

function toggleMetronomo() {
    if (isMetronomePlaying) detenerMetronomo(false);
    else iniciarMetronomo();
}

function iniciarMetronomo() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();

    isMetronomePlaying = true;
    const btn = document.getElementById('btn-play-metronomo');
    btn.innerHTML = "<span class='material-icons'>stop</span> DETENER";
    btn.classList.add('playing');

    const intervaloMs = (60 / bpm) * 1000;
    hacerTick(); 
    metronomeIntervalId = setInterval(hacerTick, intervaloMs);
}

function detenerMetronomo(esCambioAlVuelo) {
    isMetronomePlaying = false;
    clearInterval(metronomeIntervalId);
    if (!esCambioAlVuelo) {
        const btn = document.getElementById('btn-play-metronomo');
        btn.innerHTML = "<span class='material-icons'>play_arrow</span> INICIAR RITMO";
        btn.classList.remove('playing');
    }
}

function hacerTick() {
    tocarBeep();
    const circle = document.getElementById('visual-beat');
    circle.classList.remove('tick');
    void circle.offsetWidth; 
    circle.classList.add('tick');
    setTimeout(() => circle.classList.remove('tick'), 100); 
}

function tocarBeep() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(800, audioContext.currentTime); 
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
}

// --- CONTRASEÑA BETA ---
let transcriptorDesbloqueado = false; 

function generarHash(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = ((hash << 5) - hash) + texto.charCodeAt(i);
        hash = hash & hash; 
    }
    return hash;
}

function comprobarPassword() {
    const input = document.getElementById('input-pass').value.toLowerCase();
    const errorMsg = document.getElementById('msg-error');
    const cajaBloqueo = document.getElementById('pantalla-bloqueo');
    
    if (generarHash(input) === 97613083) {
        transcriptorDesbloqueado = true;
        cajaBloqueo.classList.add('hidden');
        document.getElementById('contenido-transcriptor').classList.remove('hidden');
    } else {
        errorMsg.classList.remove('hidden');
        cajaBloqueo.classList.add('vibrar');
        setTimeout(() => {
            cajaBloqueo.classList.remove('vibrar');
            errorMsg.classList.add('hidden');
        }, 500);
        document.getElementById('input-pass').value = ""; 
    }
}

function verificarEnter(event) { if (event.key === "Enter") comprobarPassword(); }

// --- MODO JUEGO: UI ---
let instrumentoJuegoActual = 'timple';
let modoJuegoSeleccionado = ''; 
let nivelJuegoActual = '';
let notaObjetivoActual = { nombre: 'C5', notaBase: 'C', octava: '5', cuerdaIndex: 1, traste: 3 }; 

function abrirJuego() {
    document.getElementById('pantalla-juego').classList.remove('hidden');
    if (typeof isRecording !== 'undefined' && isRecording) toggleGrabacion();
    if (typeof isMetronomePlaying !== 'undefined' && isMetronomePlaying) detenerMetronomo(false);
}

function cerrarJuego() { document.getElementById('pantalla-juego').classList.add('hidden'); }

function seleccionarInstrumentoJuego(botonClicado, instrumento) {
    instrumentoJuegoActual = instrumento;
    document.getElementById('game-instrument-selector').querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    botonClicado.classList.add('active');
}

function iniciarJuegoTablatura() { modoJuegoSeleccionado = 'tablatura'; prepararPantallaDificultad(); }
function iniciarJuegoAcordes() { modoJuegoSeleccionado = 'acordes'; prepararPantallaDificultad(); }

function prepararPantallaDificultad() {
    const titulo = document.getElementById('dif-titulo');
    const descFacil = document.getElementById('dif-desc-facil');
    const descMedio = document.getElementById('dif-desc-medio');
    const descDificil = document.getElementById('dif-desc-dificil');

    if (modoJuegoSeleccionado === 'tablatura') {
        titulo.innerHTML = '<span class="material-icons">music_video</span> Nivel: Caza-Tablaturas';
        descFacil.innerText = "Trastes del 0 al 5. Ideal para empezar a memorizar las primeras posiciones.";
        descMedio.innerText = "Trastes del 0 al 7. Ampliamos el rango de notas en el diapasón.";
        descDificil.innerText = "Trastes del 0 al 12+. ¡Domina el mástil completo a lo largo de toda la tablatura!";
    } else if (modoJuegoSeleccionado === 'acordes') {
        titulo.innerHTML = '<span class="material-icons">library_music</span> Nivel: Acordes';
        descFacil.innerText = "Acordes Mayores básicos (Do, Re, Mi, Fa, Sol, La).";
        descMedio.innerText = "Añadimos los acordes Menores (Dom, Rem, Mim...).";
        descDificil.innerText = "¡Todos los acordes! Incluyendo sostenidos, bemoles y séptimas.";
    }

    document.getElementById('menu-principal-juego').classList.add('hidden');
    document.getElementById('menu-dificultad-juego').classList.remove('hidden');
}

function volverMenuModos() {
    document.getElementById('menu-dificultad-juego').classList.add('hidden');
    document.getElementById('menu-principal-juego').classList.remove('hidden');
}

function arrancarJuegoFinal(nivel) {
    nivelJuegoActual = nivel;
    document.getElementById('menu-dificultad-juego').classList.add('hidden');
    document.getElementById('interfaz-juego-activa').classList.remove('hidden');
    document.getElementById('info-ronda').innerText = `${instrumentoJuegoActual.toUpperCase()} - ${nivel.toUpperCase()}`;
    
    const tituloPantalla = document.querySelector('.target-note-display p');
    if (modoJuegoSeleccionado === 'tablatura') tituloPantalla.innerText = "Toca esta nota:";
    else if (modoJuegoSeleccionado === 'acordes') tituloPantalla.innerText = "Toca este acorde:";

    document.getElementById('contenedor-mastil').classList.add('hidden');
    generarNuevaMeta();
}

function mostrarAyudaFretboard() {
    const contenedor = document.getElementById('contenedor-mastil');
    const fretboard = document.getElementById('fretboard');
    
    // Si ya está abierto, lo cerramos
    if (!contenedor.classList.contains('hidden')) {
        contenedor.classList.add('hidden');
        return;
    }
    
    fretboard.innerHTML = ''; 
    
    let numTrastes = nivelJuegoActual === 'dificil' ? 12 : (nivelJuegoActual === 'medio' ? 7 : 5);

    // 1. DIBUJAR NÚMEROS DE LOS TRASTES
    const filaNumeros = document.createElement('div');
    filaNumeros.className = 'fret-numbers-row';
    const espaciador = document.createElement('div');
    espaciador.className = 'fret-number-spacer';
    filaNumeros.appendChild(espaciador);

    for(let traste = 0; traste <= numTrastes; traste++) {
        const celdaNum = document.createElement('div');
        celdaNum.className = 'fret-number-cell';
        celdaNum.innerText = traste; 
        filaNumeros.appendChild(celdaNum);
    }
    fretboard.appendChild(filaNumeros);

    // ¡AQUÍ ESTABA EL ERROR! Ahora usamos cuerdasConOctava
    const cuerdas = cuerdasConOctava[instrumentoJuegoActual];
    let puntosADibujar = [];

    // --- LÓGICA INTELIGENTE PARA TABLATURA ---
    if (modoJuegoSeleccionado === 'tablatura') {
        const midiObjetivo = notaAMidi(notaObjetivoActual.nombre);
        let opciones = [];

        // Calculamos todas las posiciones posibles en el mástil visible
        cuerdas.forEach((notaAlAire, indexCuerda) => {
            const midiAire = notaAMidi(notaAlAire); // Ahora sí tiene la octava (ej: D5)
            
            if (midiObjetivo !== null && midiAire !== null) {
                const trasteCalc = midiObjetivo - midiAire;
                if (trasteCalc >= 0 && trasteCalc <= numTrastes) {
                    opciones.push({ cuerdaIndex: indexCuerda, traste: trasteCalc, numCuerda: indexCuerda + 1 });
                }
            }
        });

        // Separamos agudas (1-3) y graves (4-6)
        const opcionesAgudas = opciones.filter(o => o.numCuerda <= 3).sort((a, b) => a.traste - b.traste);
        const opcionesGraves = opciones.filter(o => o.numCuerda > 3).sort((a, b) => a.traste - b.traste);

        // Elegimos la mejor opción primaria y secundaria
        if (opcionesAgudas.length > 0) {
            puntosADibujar.push({ ...opcionesAgudas[0], tipo: 'primaria' });
            
            // Si en graves hay un traste más bajo (más fácil), lo añadimos como alternativa
            if (opcionesGraves.length > 0 && opcionesGraves[0].traste < opcionesAgudas[0].traste) {
                puntosADibujar.push({ ...opcionesGraves[0], tipo: 'secundaria' });
            }
        } else if (opcionesGraves.length > 0) {
            puntosADibujar.push({ ...opcionesGraves[0], tipo: 'primaria' });
        }

    } else if (modoJuegoSeleccionado === 'acordes') {
        const posturasInstrumento = posturasAcordesVisuales[instrumentoJuegoActual];
        if (posturasInstrumento && posturasInstrumento[notaObjetivoActual.nombre]) {
            puntosADibujar = posturasInstrumento[notaObjetivoActual.nombre].map(p => ({ ...p, tipo: 'primaria' }));
        } else {
            alert(`Falta la postura de ${notaObjetivoActual.nombre} para ${instrumentoJuegoActual}.`);
            return;
        }
    }

    // 2. DIBUJAR LAS CUERDAS Y LOS PUNTOS
    cuerdas.forEach((notaAlAire, indexCuerda) => {
        const filaCuerda = document.createElement('div');
        filaCuerda.className = 'string-row';
        
        const nombreCuerda = document.createElement('div');
        nombreCuerda.className = 'string-name';
        nombreCuerda.innerText = `${indexCuerda + 1}ª`;
        filaCuerda.appendChild(nombreCuerda);
        
        for(let traste = 0; traste <= numTrastes; traste++) {
            const celdaTraste = document.createElement('div');
            celdaTraste.className = 'fret-cell';
            
            // Comprobamos si hay que dibujar un punto en esta celda
            const puntoInfo = puntosADibujar.find(p => p.cuerdaIndex === indexCuerda && p.traste === traste);
            
            if (puntoInfo) {
                const punto = document.createElement('div');
                punto.className = 'punto-rojo';
                
                // Si es la alternativa (secundaria), la pintamos de azul claro
                if (puntoInfo.tipo === 'secundaria') {
                    punto.style.backgroundColor = '#2196F3'; 
                    punto.style.boxShadow = '0 0 10px #2196F3';
                }
                
                celdaTraste.appendChild(punto);
            }
            filaCuerda.appendChild(celdaTraste);
        }
        fretboard.appendChild(filaCuerda);
    });
    
    contenedor.classList.remove('hidden');
}

function terminarJuegoActual() {
    microJuegoActivo = false;
    if (typeof isRecording !== 'undefined' && isRecording) toggleGrabacion(); 
    
    const btn = document.getElementById('btn-escuchar-juego');
    btn.innerHTML = '<span class="material-icons">mic</span> ACTIVAR MICRO PARA JUGAR';
    btn.style.background = 'var(--ocean-blue)';
    
    document.getElementById('contenedor-mastil').classList.add('hidden');
    document.getElementById('interfaz-juego-activa').classList.add('hidden');
    document.getElementById('menu-dificultad-juego').classList.remove('hidden');
    
    puntosJuego = 0;
    document.getElementById('puntos-texto').innerText = "0";
    document.getElementById('nota-escuchada').innerText = "--";
}

// --- MODO JUEGO: MOTOR Y DETECCIÓN ---
let microJuegoActivo = false;
let puntosJuego = 0;
let enTransicionAcierto = false;
let candidatoActual = "--";
let fotogramasEstables = 0;
const UMBRAL_ESTABILIDAD = 15; 

async function activarMicroJuego() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        
        microJuegoActivo = true;
        const btn = document.getElementById('btn-escuchar-juego');
        btn.innerHTML = '<span class="material-icons">mic_off</span> MICRO ACTIVADO';
        btn.style.background = '#4CAF50';

        if (modoJuegoSeleccionado === 'tablatura') detectarNotaJuego();
        else if (modoJuegoSeleccionado === 'acordes') detectarAcordeJuego(); 
        
    } catch (err) { alert("Error al acceder al micrófono."); }
}

function detectarNotaJuego() {
    if (!microJuegoActivo || enTransicionAcierto || document.getElementById('interfaz-juego-activa').classList.contains('hidden')) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.sampleRate); 
    const visorNota = document.getElementById('nota-escuchada');

    if (ac !== -1) {
        const notaTocada = getNoteAndOctave(ac); 
        visorNota.innerText = notaTocada;

        if (notaTocada === notaObjetivoActual.nombre) {
            fotogramasEstables++;
            if (fotogramasEstables >= 10) return aciertoJuego();
        } else fotogramasEstables = 0;
    } else {
        visorNota.innerText = "--";
        fotogramasEstables = 0;
    }
    requestAnimationFrame(detectarNotaJuego);
}

function detectarAcordeJuego() {
    if (!microJuegoActivo || enTransicionAcierto || document.getElementById('interfaz-juego-activa').classList.contains('hidden')) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    let picos = [];
    for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > -40 && i > 0 && i < bufferLength - 1) {
            if (dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1]) {
                const freq = i * audioContext.sampleRate / analyser.fftSize;
                if (freq > 80 && freq < 1000) picos.push({ freq, volumen: dataArray[i] });
            }
        }
    }

    picos.sort((a, b) => b.volumen - a.volumen);
    let notasDetectadas = new Set();
    
    for (let i = 0; i < Math.min(5, picos.length); i++) {
        const noteNum = 12 * (Math.log(picos[i].freq / 440) / Math.log(2)) + 69;
        const index = Math.round(noteNum) % 12;
        if (index >= 0) notasDetectadas.add(NOTAS[index]); 
    }

    const arrayNotas = Array.from(notasDetectadas);
    let acordeEncontrado = "--";

    if (arrayNotas.length >= 2) {
        for (let acorde of diccionarioAcordes) {
            if (acorde.notas.every(nota => arrayNotas.includes(nota))) { 
                acordeEncontrado = acorde.nombre; 
                break; 
            }
        }
    }

    document.getElementById('nota-escuchada').innerText = acordeEncontrado;

    if (acordeEncontrado === candidatoActual && acordeEncontrado !== "--") fotogramasEstables++;
    else { candidatoActual = acordeEncontrado; fotogramasEstables = 0; }

    if (fotogramasEstables >= UMBRAL_ESTABILIDAD && acordeEncontrado === notaObjetivoActual.nombre) return aciertoJuego();

    requestAnimationFrame(detectarAcordeJuego);
}

function aciertoJuego() {
    enTransicionAcierto = true;
    puntosJuego++;
    document.getElementById('puntos-texto').innerText = puntosJuego;

    const pantallaNota = document.getElementById('nota-pantalla');
    pantallaNota.classList.add('iluminar-acierto');
    document.getElementById('mensaje-acierto').classList.remove('hidden');
    document.getElementById('contenedor-mastil').classList.add('hidden');

    setTimeout(() => {
        pantallaNota.classList.remove('iluminar-acierto');
        document.getElementById('mensaje-acierto').classList.add('hidden');
        generarNuevaMeta();
        enTransicionAcierto = false;
        
        if (modoJuegoSeleccionado === 'tablatura') detectarNotaJuego();
        else if (modoJuegoSeleccionado === 'acordes') detectarAcordeJuego();
    }, 1500);
}

function sumarTrastesANota(notaConOctava, semitonos) {
    let base = notaConOctava.slice(0, -1);
    if (!base) return { nombre: notaConOctava, base: notaConOctava, octava: 4 }; 
    const octava = parseInt(notaConOctava.slice(-1));
    let index = NOTAS.indexOf(base);
    
    let notaAbsoluta = octava * 12 + index + semitonos;
    let nuevaOctava = Math.floor(notaAbsoluta / 12);
    let nuevoIndex = notaAbsoluta % 12;
    
    return { nombre: NOTAS[nuevoIndex] + nuevaOctava, base: NOTAS[nuevoIndex], octava: nuevaOctava };
}

function generarNuevaMeta() {
    if (modoJuegoSeleccionado === 'tablatura') {
        let maxTraste = nivelJuegoActual === 'dificil' ? 12 : (nivelJuegoActual === 'medio' ? 7 : 5);
        const cuerdas = cuerdasConOctava[instrumentoJuegoActual];
        const indexCuerda = Math.floor(Math.random() * cuerdas.length);
        const traste = Math.floor(Math.random() * (maxTraste + 1));
        
        const notaCalculada = sumarTrastesANota(cuerdas[indexCuerda], traste);
        notaObjetivoActual = { nombre: notaCalculada.nombre, notaBase: notaCalculada.base, octava: notaCalculada.octava, cuerdaIndex: indexCuerda, traste: traste };

        const espanol = notasLatinas[notaObjetivoActual.notaBase] || notaObjetivoActual.notaBase;
        document.getElementById('nota-pantalla').innerHTML = `${notaObjetivoActual.nombre} <span class="nota-espanol">(${espanol}${notaObjetivoActual.octava})</span>`;

    } else if (modoJuegoSeleccionado === 'acordes') {
        let acordesFiltrados = diccionarioAcordes; // Por defecto (Difícil) coge todos
        
        if (nivelJuegoActual === 'facil') {
            // Nivel Fácil: Excluimos los menores ('m') y las séptimas ('7')
            acordesFiltrados = diccionarioAcordes.filter(a => !a.nombre.includes('m') && !a.nombre.includes('7'));
        } else if (nivelJuegoActual === 'medio') {
            // Nivel Medio: Excluimos solo los menores ('m'). Quedan Mayores y Séptimas.
            acordesFiltrados = diccionarioAcordes.filter(a => !a.nombre.includes('m'));
        }
        // Si es 'dificil', se queda con diccionarioAcordes entero (Mayores, 7 y Menores)

        const acordeAleatorio = acordesFiltrados[Math.floor(Math.random() * acordesFiltrados.length)];
        notaObjetivoActual = { nombre: acordeAleatorio.nombre }; 
        document.getElementById('nota-pantalla').innerHTML = `<span style="font-size: 1.5em; color: var(--canary-yellow);">${notaObjetivoActual.nombre}</span>`;
    }
}

function encontrarCuerdaMasCercana(freq) {
    if (!instrumentoActualData || instrumentoActualData.length === 0) return null;

    let mejorCuerda = null;
    let menorDiferencia = Infinity;

    instrumentoActualData.forEach(cuerda => {
        const diff = Math.abs(freq - cuerda.freq);
        if (diff < menorDiferencia) {
            menorDiferencia = diff;
            mejorCuerda = cuerda;
        }
    });

    return mejorCuerda;
}