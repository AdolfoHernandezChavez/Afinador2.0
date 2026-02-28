// Estados globales
let audioContext;
let analyser;
let isRunning = false;
let isRecording = false;
let sourceFileNode = null;

// Configuración
const MELODY_THRESHOLD = 4;
const MAX_TRASTE = 15;
const IN_TUNE_THRESHOLD_HZ = 1.5;
const MIN_RMS = 0.02;
const GAUGE_MAX_ANGLE = 60;
const GAUGE_SCALE = GAUGE_MAX_ANGLE / 20; // 20 Hz de margen total

let framesHeld = 0;
let lastCandidate = '';

// Memoria tablatura
let notasGrabadas = [];
let instrumentoActualData = [];

// Instrumentos
const datosTimple = [
  { num: '1ª', nota: 'D5', freq: 587.33 },
  { num: '2ª', nota: 'A4', freq: 440.0 },
  { num: '3ª', nota: 'E4', freq: 329.63 },
  { num: '4ª', nota: 'C5', freq: 523.25 },
  { num: '5ª', nota: 'G4', freq: 392.0 }
];

const datosContra = [
  { num: '1ª', nota: 'G4', freq: 392.0 },
  { num: '2ª', nota: 'D4', freq: 293.66 },
  { num: '3ª', nota: 'A3', freq: 220.0 },
  { num: '4ª', nota: 'F4', freq: 349.23 },
  { num: '5ª', nota: 'C4', freq: 261.63 }
];

const datosGuitarra = [
  { num: '1ª', nota: 'E4', freq: 329.63 },
  { num: '2ª', nota: 'B3', freq: 246.94 },
  { num: '3ª', nota: 'G3', freq: 196.0 },
  { num: '4ª', nota: 'D3', freq: 146.83 },
  { num: '5ª', nota: 'A2', freq: 110.0 },
  { num: '6ª', nota: 'E2', freq: 82.41 }
];

const datosBandurria = [
  { num: '1ª', nota: 'A5', freq: 880.0 },
  { num: '2ª', nota: 'E5', freq: 659.25 },
  { num: '3ª', nota: 'B4', freq: 493.88 },
  { num: '4ª', nota: 'F#4', freq: 369.99 },
  { num: '5ª', nota: 'C#4', freq: 277.18 },
  { num: '6ª', nota: 'G#3', freq: 207.65 }
];

const datosLaud = [
  { num: '1ª', nota: 'A4', freq: 440.0 },
  { num: '2ª', nota: 'E4', freq: 329.63 },
  { num: '3ª', nota: 'B3', freq: 246.94 },
  { num: '4ª', nota: 'F#3', freq: 185.0 },
  { num: '5ª', nota: 'C#3', freq: 138.59 },
  { num: '6ª', nota: 'G#2', freq: 103.83 }
];

const INSTRUMENTOS = {
  timple: datosTimple,
  contra: datosContra,
  guitarra: datosGuitarra,
  bandurria: datosBandurria,
  laud: datosLaud
};

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let targetFrequency = datosTimple[0].freq;

// Inicialización
window.addEventListener('load', () => {
  cambiarInstrumento('timple');
  configurarEventosUI();
  // Asegura que el selector esté en posición por defecto
  document.getElementById('temperamento-select').value = 'estandar';
});

// Temperamento (frecuencia de referencia para La4/A4)
const TEMPERAMENTOS = {
  estandar: 440.0,
  orquestal: 442.0,
  tradicional: 435.0
};

let frecuenciaReferencia = TEMPERAMENTOS.estandar;

// Nueva función para cambiar temperamento
function cambiarTemperamento() {
  const select = document.getElementById('temperamento-select');
  const nuevoTemperamento = select.value;
  frecuenciaReferencia = TEMPERAMENTOS[nuevoTemperamento];
  
  // Actualiza tooltip visual
  document.getElementById('status').innerText = 
    `Afina: ${document.getElementById('note-name').innerText} (${frecuenciaReferencia.toFixed(0)} Hz)`;
  
  console.log(`Temperamento cambiado a: ${nuevoTemperamento} (${frecuenciaReferencia} Hz)`);
}


function configurarEventosUI() {
  // Tabs
  const tabAfinador = document.getElementById('tab-afinador');
  const tabTranscriptor = document.getElementById('tab-transcriptor');

  tabAfinador.addEventListener('click', () => cambiarVista('afinador'));
  tabTranscriptor.addEventListener('click', () => cambiarVista('transcriptor'));

  // Navegación con teclado en tabs
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

  // Botón micro global
  document.getElementById('btn-start').addEventListener('click', iniciarAudio);

  // Instrumentos
  document.getElementById('btn-timple').addEventListener('click', () => cambiarInstrumento('timple'));
  document.getElementById('btn-contra').addEventListener('click', () => cambiarInstrumento('contra'));
  document.getElementById('btn-guitarra').addEventListener('click', () => cambiarInstrumento('guitarra'));
  document.getElementById('btn-bandurria').addEventListener('click', () => cambiarInstrumento('bandurria'));
  document.getElementById('btn-laud').addEventListener('click', () => cambiarInstrumento('laud'));

  // Transcriptor
  document.getElementById('btn-rec').addEventListener('click', toggleGrabacion);
  document.getElementById('btn-clear').addEventListener('click', limpiarNotas);
  document.getElementById('btn-download').addEventListener('click', descargarTablatura);
  document.getElementById('audio-file').addEventListener('change', cargarAudio);
}

// Vistas
function cambiarVista(vista) {
    const vistas = ['afinador', 'metronomo', 'transcriptor'];
    
    // Ocultar todas las vistas y desactivar pestañas
    vistas.forEach(v => {
        document.getElementById('vista-' + v).classList.add('hidden');
        document.getElementById('tab-' + v).classList.remove('active');
    });

    // Mostrar la vista seleccionada
    document.getElementById('vista-' + vista).classList.remove('hidden');
    document.getElementById('tab-' + vista).classList.add('active');

    // --- NUEVO: Ocultar o mostrar el botón de "ACTIVAR MICRO" ---
    const btnStart = document.getElementById('btn-start');
    if (vista === 'metronomo') {
        btnStart.classList.add('hidden'); // Lo escondemos
    } else {
        btnStart.classList.remove('hidden'); // Lo mostramos de nuevo
    }

    // Apagar cosas si cambiamos de pestaña (para no grabar o que suene de fondo)
    if (vista !== 'transcriptor' && typeof isRecording !== 'undefined' && isRecording) toggleGrabacion();
    if (vista !== 'metronomo' && typeof isMetronomePlaying !== 'undefined' && isMetronomePlaying) detenerMetronomo(false);
}

// Instrumentos
function cambiarInstrumento(inst) {
  document
    .querySelectorAll('.toggle-container .toggle-btn')
    .forEach(b => b.classList.remove('active'));

  const btn = document.getElementById('btn-' + inst);
  if (btn) btn.classList.add('active');

  instrumentoActualData = INSTRUMENTOS[inst] || datosTimple;
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

    if (index === 0) {
      btn.click();
    }
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

// Grabación / transcripción
function toggleGrabacion() {
  isRecording = !isRecording;
  const btn = document.getElementById('btn-rec');

  if (isRecording) {
    btn.innerHTML = "<span class='material-icons' aria-hidden='true'>stop_circle</span> DETENER";
    btn.classList.add('recording');
    limpiarNotas();
  } else {
    btn.innerHTML = "<span class='material-icons' aria-hidden='true'>mic</span> GRABAR MICRO";
    btn.classList.remove('recording');
    detenerFuenteArchivo();
  }
}

function limpiarNotas() {
  document.getElementById('sheet-music').innerHTML =
    '<span class="placeholder">Graba o sube un audio...</span>';
  lastCandidate = '';
  framesHeld = 0;
  notasGrabadas = [];
}

function detenerFuenteArchivo() {
  if (sourceFileNode) {
    try {
      sourceFileNode.stop();
    } catch (e) {
      // silencioso
    }
    sourceFileNode = null;
  }
}

// Notas / MIDI / posiciones
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
      opciones.push({
        cuerda: cuerda.num,
        traste,
        numCuerda: parseInt(cuerda.num, 10)
      });
    }
  });

  if (opciones.length === 0) return [];

  const opcionesAgudas = opciones
    .filter(o => o.numCuerda <= 3)
    .sort((a, b) => a.traste - b.traste);

  const opcionesGraves = opciones
    .filter(o => o.numCuerda > 3)
    .sort((a, b) => a.traste - b.traste);

  const resultadoFinal = [];

  if (opcionesAgudas.length > 0) {
    const mejorAguda = opcionesAgudas[0];
    resultadoFinal.push(mejorAguda);

    if (opcionesGraves.length > 0) {
      const mejorGrave = opcionesGraves[0];
      if (mejorGrave.traste < mejorAguda.traste) {
        resultadoFinal.push(mejorGrave);
      }
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

  notasGrabadas.push({
    nota: texto,
    opciones
  });

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

// Descarga tablatura
function descargarTablatura() {
  if (notasGrabadas.length === 0) {
    alert('¡No has grabado ninguna nota todavía!');
    return;
  }

  let txt = '========================================\n';
  txt += ' TABLATURA CANARIA (DIGITACIÓN INTELIGENTE)\n';
  txt += '========================================\n';
  txt += ' * Las notas normales (ej: -3-) son la sugerencia principal.\n';
  txt += ' * Las notas en paréntesis (ej: -(0)-) son opciones alternativas.\n\n';

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
            const tStr = opciones[0].traste.toString();
            bloqueVisual = '-' + tStr.padEnd(2, '-') + '---';
          } else if (esAlternativa) {
            const tStr = esAlternativa.traste.toString();
            const altStr = '(' + tStr + ')';
            bloqueVisual = '-' + altStr.padEnd(4, '-') + '-';
          }
        }

        linea += bloqueVisual;
      });

      txt += linea + '|\n';
    });

    txt += '\n';
  }

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mi_tablatura_canaria.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Audio: archivo
async function cargarAudio(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Si había una grabación en curso o un micro activo, lo paramos
    if (isRecording) toggleGrabacion();
    if (sourceFileNode) {
        try { sourceFileNode.stop(); } catch(e){}
    }

    const sheet = document.getElementById('sheet-music');
    limpiarNotas(); // Resetea la memoria de las notas y el HTML
    
    // 1. ELIMINAMOS cualquier barra anterior (por si el usuario sube otro audio a la vez)
    const oldProg = document.getElementById('prog-container');
    if (oldProg) oldProg.remove();

    // 2. INYECTAMOS LA BARRA FUERA DE LA CAJA DE NOTAS (Justo encima)
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

        // Procesamiento ultra rápido por lotes
        function procesarLote() {
            try {
                const limiteLote = Math.min(currentSample + (sampleRate / 4), totalSamples); 
                
                for (; currentSample < limiteLote; currentSample += step) {
                    const chunk = channelData.slice(currentSample, currentSample + chunkSize);
                    
                    if (chunk.length < chunkSize) {
                        currentSample = totalSamples; 
                        break; 
                    }

                    const freq = autoCorrelate(chunk, sampleRate);

                    if (freq !== -1) {
                        silenceFrames = 0; 
                        const nota = getNoteAndOctave(freq);
                        
                        if (nota === localLastCandidate) {
                            localFramesHeld++;
                        } else {
                            localFramesHeld = 0;
                            localLastCandidate = nota;
                        }

                        if (localFramesHeld === 2) {
                            if (nota !== ultimaNotaGuardada) {
                                escribirNota(nota); 
                                ultimaNotaGuardada = nota;
                            }
                        }
                    } else {
                        silenceFrames++;
                        if (localFramesHeld > 0) localFramesHeld--;
                        
                        if (silenceFrames > 5) {
                            ultimaNotaGuardada = ""; 
                        }
                    }
                }

                // Actualizamos la barra de progreso
                const porcentaje = Math.floor((currentSample / totalSamples) * 100);
                if(progTxt && progBar) {
                    progTxt.innerText = Math.min(porcentaje, 100) + "%"; 
                    progBar.style.width = Math.min(porcentaje, 100) + "%";
                }

                if (currentSample < totalSamples) {
                    setTimeout(procesarLote, 5); 
                } else {
                    // ¡Análisis finalizado! Quitamos la barra de progreso
                    if (progContainer) progContainer.remove();
                    
                    if (notasGrabadas.length === 0) {
                        sheet.innerHTML = '<span class="placeholder">No se detectaron notas claras en el audio.</span>';
                    }
                    
                    event.target.value = ''; // Resetear el botón de subida
                }
            } catch (err) {
                console.error("Error durante el análisis:", err);
            }
        }

        setTimeout(procesarLote, 50);

    } catch (error) {
        console.error("Error al leer el archivo:", error);
        sheet.innerHTML = '<span class="placeholder" style="color:#ff4d4d;">Error al decodificar el MP3/WAV.</span>';
    }
}


// Audio: micro
async function iniciarAudio() {
  if (isRunning) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    isRunning = true;
    actualizarBotonMicro();
    buclePrincipal();
  } catch (e) {
    alert('Error: No se detecta micrófono o no se otorgaron permisos.');
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

// Bucle principal de análisis
function buclePrincipal() {
  if (!analyser || !audioContext || !isRunning) {
    requestAnimationFrame(buclePrincipal);
    return;
  }

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

// Afinador visual
function actualizarAguja(freq) {
  const diff = freq - targetFrequency;
  let angulo = diff * GAUGE_SCALE;
  if (angulo > GAUGE_MAX_ANGLE) angulo = GAUGE_MAX_ANGLE;
  if (angulo < -GAUGE_MAX_ANGLE) angulo = -GAUGE_MAX_ANGLE;

  const needle = document.getElementById('needle');
  const frequency = document.getElementById('frequency');
  const status = document.getElementById('status');
  const noteName = document.getElementById('note-name');

  needle.style.transform = `translateX(-50%) rotate(${angulo}deg)`;
  frequency.innerText = freq.toFixed(1) + ' Hz';

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

    if (diff < 0) {
      status.innerText = 'Aprieta (Sube) 🔼';
    } else {
      status.innerText = 'Afloja (Baja) 🔽';
    }
    status.style.color = '#ff9999';
  }
}

// Melodía
function analizarMelodia(freq) {
  const nota = getNoteAndOctave(freq);

  if (nota === lastCandidate) {
    framesHeld++;
  } else {
    framesHeld = 0;
    lastCandidate = nota;
  }

  if (framesHeld === MELODY_THRESHOLD) {
    const ultimaNota = notasGrabadas.length
      ? notasGrabadas[notasGrabadas.length - 1].nota
      : '';
    if (nota !== ultimaNota) {
      escribirNota(nota);
    }
  }
}

function getNoteAndOctave(freq) {
  // Usa frecuenciaReferencia en lugar de 440 fijo
  const noteNum = 12 * (Math.log(freq / frecuenciaReferencia) / Math.log(2)) + 69;
  const rounded = Math.round(noteNum);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return NOTAS[noteIndex] + octave;
}

// Autocorrelación
function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i=0;i<SIZE;i++) { let val = buf[i]; rms+=val*val; }
    rms = Math.sqrt(rms/SIZE);
    
    // Umbral de volumen bajado al extremo (0.008 en lugar de 0.02)
    if (rms < 0.008) return -1; 

    // Tolerancia al ruido mejorada (0.1 en lugar de 0.2)
    let r1=0, r2=SIZE-1, thres=0.1; 
    for (let i=0; i<SIZE/2; i++) if (Math.abs(buf[i])<thres) { r1=i; break; }
    for (let i=1; i<SIZE/2; i++) if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }
    buf = buf.slice(r1,r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i=0; i<SIZE; i++)
        for (let j=0; j<SIZE-i; j++)
            c[i] = c[i] + buf[j]*buf[j+i];

    let d=0; while (c[d]>c[d+1]) d++;
    let maxval=-1, maxpos=-1;
    for (let i=d; i<SIZE; i++) {
        if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    let x1=c[T0-1], x2=c[T0], x3=c[T0+1];
    let a = (x1+x3-2*x2)/2;
    let b = (x3-x1)/2;
    if (a) T0 = T0 - b/(2*a);

    const detectedFreq = sampleRate/T0;
    
    // Filtro para ignorar bajos profundos o chirridos falsos
    if (detectedFreq < 70 || detectedFreq > 1200) return -1;

    return detectedFreq;
}

// ==========================================
// --- NUEVO: LÓGICA DEL METRÓNOMO ---
// ==========================================

let bpm = 120;
let isMetronomePlaying = false;
let metronomeIntervalId = null;

function cambiarBPM(delta) {
    let nuevoBPM = bpm + delta;
    if (nuevoBPM < 40) nuevoBPM = 40;
    if (nuevoBPM > 240) nuevoBPM = 240;
    actualizarUIBPM(nuevoBPM);
}

function actualizarSlider(valor) {
    actualizarUIBPM(parseInt(valor));
}

function actualizarUIBPM(nuevoBPM) {
    bpm = nuevoBPM;
    document.getElementById('bpm-value').innerText = bpm;
    document.getElementById('bpm-slider').value = bpm;
    
    // Si está sonando, reiniciamos el bucle para que adopte el nuevo tempo al vuelo
    if (isMetronomePlaying) {
        detenerMetronomo(true); // El 'true' es para que no cambie el botón visualmente
        iniciarMetronomo();
    }
}

function toggleMetronomo() {
    if (isMetronomePlaying) {
        detenerMetronomo(false);
    } else {
        iniciarMetronomo();
    }
}

function iniciarMetronomo() {
    // Nos aseguramos de que el contexto de audio existe (necesario si no han usado el afinador antes)
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isMetronomePlaying = true;
    const btn = document.getElementById('btn-play-metronomo');
    btn.innerHTML = "<span class='material-icons'>stop</span> DETENER";
    btn.classList.add('playing');

    // Calculamos los milisegundos entre cada golpe
    const intervaloMs = (60 / bpm) * 1000;
    
    hacerTick(); // Hacemos el primer golpe inmediatamente
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
    // 1. Reproducimos el sonido "Clack!"
    tocarBeep();
    
    // 2. Encendemos el parpadeo visual
    const circle = document.getElementById('visual-beat');
    
    // Forzamos un reinicio de la animación por si el BPM es muy rápido
    circle.classList.remove('tick');
    void circle.offsetWidth; // Truco de CSS para reiniciar la animación
    
    circle.classList.add('tick');
    
    // Apagamos la luz rápido para que parezca un destello
    setTimeout(() => {
        circle.classList.remove('tick');
    }, 100); 
}

// Crea un sonido de percusión sintético sin necesitar archivos MP3 externos
function tocarBeep() {
    if (!audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc.type = 'sine'; // Tono limpio
    osc.frequency.setValueAtTime(800, audioContext.currentTime); // Frecuencia del "beep"
    
    // Hacemos que el sonido sea un golpe seco (empieza fuerte y cae a 0 rápido)
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
}

// ==========================================
// --- SISTEMA DE CONTRASEÑA BETA (ENCRIPTADO) ---
// ==========================================

let transcriptorDesbloqueado = false; 

// Fórmula matemática que convierte texto en un número (Hash)
function generarHash(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        let char = texto.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Lo convierte a un número entero de 32 bits
    }
    return hash;
}

function comprobarPassword() {
    const input = document.getElementById('input-pass').value.toLowerCase();
    const errorMsg = document.getElementById('msg-error');
    const cajaBloqueo = document.getElementById('pantalla-bloqueo');
    
    // Convertimos lo que escribió el usuario en un número
    const numeroSecreto = generarHash(input);
    
    // 97613083 es el número que equivale a la palabra "folia"
    if (numeroSecreto === 97613083) {
        transcriptorDesbloqueado = true;
        
        // Entramos al transcriptor
        document.getElementById('pantalla-bloqueo').classList.add('hidden');
        document.getElementById('contenido-transcriptor').classList.remove('hidden');
        
    } else {
        // Mostramos el texto de error
        errorMsg.classList.remove('hidden');
        
        // Añadimos la clase de vibración (temblor)
        cajaBloqueo.classList.add('vibrar');
        
        // Quitamos la vibración y el mensaje después de un momento
        setTimeout(() => {
            cajaBloqueo.classList.remove('vibrar');
            errorMsg.classList.add('hidden');
        }, 500);
        
        // Vaciamos la caja
        document.getElementById('input-pass').value = ""; 
    }
}

// Para que puedan pulsar "Enter" en el teclado en vez de darle al botón con el ratón
function verificarEnter(event) {
    if (event.key === "Enter") {
        comprobarPassword();
    }
}

// ==========================================
// --- LÓGICA DEL MODO JUEGO ---
// ==========================================

function abrirJuego() {
    // Mostramos la pantalla negra
    document.getElementById('pantalla-juego').classList.remove('hidden');
    
    // Opcional: Si estaban grabando audio o sonando el metrónomo, lo apagamos para que no moleste al juego
    if (typeof isRecording !== 'undefined' && isRecording) toggleGrabacion();
    if (typeof isMetronomePlaying !== 'undefined' && isMetronomePlaying) detenerMetronomo(false);
}

function cerrarJuego() {
    // Ocultamos la pantalla negra y volvemos a ver la web normal
    document.getElementById('pantalla-juego').classList.add('hidden');
}

// ==========================================
// --- LÓGICA DEL MENÚ DE JUEGOS ---
// ==========================================

let instrumentoJuegoActual = 'timple';
let modoJuegoSeleccionado = ''; // Guardará 'tablatura' o 'armonicos'

function seleccionarInstrumentoJuego(botonClicado, instrumento) {
    instrumentoJuegoActual = instrumento;
    const contenedor = document.getElementById('game-instrument-selector');
    const botones = contenedor.querySelectorAll('.toggle-btn');
    botones.forEach(btn => btn.classList.remove('active'));
    botonClicado.classList.add('active');
}

function iniciarJuegoTablatura() {
    modoJuegoSeleccionado = 'tablatura';
    prepararPantallaDificultad();
}

function iniciarJuegoAcordes() {
    modoJuegoSeleccionado = 'acordes';
    prepararPantallaDificultad();
}

// Esta función rellena los textos según el juego que hayas elegido y cambia la vista
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
    } else if (modoJuegoSeleccionado === 'acordes') { // <-- CAMBIADO A ACORDES
        titulo.innerHTML = '<span class="material-icons">library_music</span> Nivel: Acordes';
        descFacil.innerText = "Acordes Mayores básicos (Do, Re, Mi, Fa, Sol, La).";
        descMedio.innerText = "Añadimos los acordes Menores (Dom, Rem, Mim...).";
        descDificil.innerText = "¡Todos los acordes! Incluyendo sostenidos, bemoles y séptimas.";
    }

    document.getElementById('menu-principal-juego').classList.add('hidden');
    document.getElementById('menu-dificultad-juego').classList.remove('hidden');
}

function volverMenuModos() {
    // Si se arrepienten y quieren volver a elegir Tablatura o Armónicos
    document.getElementById('menu-dificultad-juego').classList.add('hidden');
    document.getElementById('menu-principal-juego').classList.remove('hidden');
}

let nivelJuegoActual = '';

// Diccionario para traducir notas al español
const notasLatinas = { 'C':'Do', 'C#':'Do#', 'D':'Re', 'D#':'Re#', 'E':'Mi', 'F':'Fa', 'F#':'Fa#', 'G':'Sol', 'G#':'Sol#', 'A':'La', 'A#':'La#', 'B':'Si' };

// Cuerdas de cada instrumento (de 1ª a última) para dibujar la ayuda
const afinacionesFretboard = {
    timple: ['D', 'A', 'E', 'C', 'G'],
    contra: ['G', 'D', 'A', 'F', 'C'],
    guitarra: ['E', 'B', 'G', 'D', 'A', 'E'],
    bandurria: ['A', 'E', 'B', 'F#', 'C#', 'G#'],
    laud: ['A', 'E', 'B', 'F#', 'C#', 'G#']
};

// --- VARIABLE DE PRUEBA: Luego la haremos aleatoria ---
// Cuerda índice 1 (es la 2ª cuerda), traste 3. En el timple eso es un Do5.
let notaObjetivoActual = { nombre: 'C5', notaBase: 'C', octava: '5', cuerdaIndex: 1, traste: 3 }; 


function arrancarJuegoFinal(nivel) {
    nivelJuegoActual = nivel;
    
    // Ocultamos la dificultad y mostramos la pantalla de jugar
    document.getElementById('menu-dificultad-juego').classList.add('hidden');
    document.getElementById('interfaz-juego-activa').classList.remove('hidden');
    
    // Ponemos el texto de arriba (Ej: TIMPLE - FÁCIL)
    document.getElementById('info-ronda').innerText = `${instrumentoJuegoActual.toUpperCase()} - ${nivel.toUpperCase()}`;
    
    // --- LÓGICA DINÁMICA SEGÚN EL MODO DE JUEGO ---
    const tituloPantalla = document.querySelector('.target-note-display p');

    if (modoJuegoSeleccionado === 'tablatura') {
        tituloPantalla.innerText = "Toca esta nota:";
    } else if (modoJuegoSeleccionado === 'acordes') {
        tituloPantalla.innerText = "Toca este acorde:";
    }

    // Asegurarnos de que la ayuda está cerrada al empezar
    document.getElementById('contenedor-mastil').classList.add('hidden');

    // ¡La magia! Generamos la primera nota o acorde de forma aleatoria
    generarNuevaMeta();
}

function mostrarAyudaFretboard() {
    const contenedor = document.getElementById('contenedor-mastil');
    const fretboard = document.getElementById('fretboard');
    
    // Si ya está abierta, la cerramos
    if (!contenedor.classList.contains('hidden')) {
        contenedor.classList.add('hidden');
        return;
    }
    
    fretboard.innerHTML = ''; // Limpiar dibujo anterior
    
    let numTrastes = 5;
    if(nivelJuegoActual === 'medio') numTrastes = 7;
    if(nivelJuegoActual === 'dificil') numTrastes = 12;

    // --- DIBUJAR FILA DE NÚMEROS DE TRASTE ---
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

    const cuerdas = afinacionesFretboard[instrumentoJuegoActual];
    
    // --- NUEVO: ¿QUÉ PUNTOS VAMOS A DIBUJAR? ---
    let puntosADibujar = [];

    if (modoJuegoSeleccionado === 'tablatura') {
        // En tablatura solo dibujamos un punto
        puntosADibujar.push({ 
            cuerdaIndex: notaObjetivoActual.cuerdaIndex, 
            traste: notaObjetivoActual.traste 
        });
    } else if (modoJuegoSeleccionado === 'acordes') {
        // En acordes, buscamos la postura completa en el diccionario
        const posturasInstrumento = posturasAcordesVisuales[instrumentoJuegoActual];
        
        if (posturasInstrumento && posturasInstrumento[notaObjetivoActual.nombre]) {
            puntosADibujar = posturasInstrumento[notaObjetivoActual.nombre];
        } else {
            // Si el acorde aún no está registrado en el diccionario, avisamos
            alert(`Aún no has añadido la postura de ${notaObjetivoActual.nombre} para ${instrumentoJuegoActual} en el código.`);
            return; 
        }
    }

    // --- DIBUJAR CUERDAS Y PUNTOS ---
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
            
            // Comprobamos si en esta celda va algún dedo de la postura
            const debeTenerPunto = puntosADibujar.some(punto => punto.cuerdaIndex === indexCuerda && punto.traste === traste);
            
            if (debeTenerPunto) {
                const punto = document.createElement('div');
                punto.className = 'punto-rojo';
                celdaTraste.appendChild(punto);
            }
            
            filaCuerda.appendChild(celdaTraste);
        }
        fretboard.appendChild(filaCuerda);
    });
    
    contenedor.classList.remove('hidden');
}

function terminarJuegoActual() {
    // 1. PARAR EL MOTOR DEL JUEGO
    microJuegoActivo = false;
    
    // 2. Si el micrófono físico está grabando, lo apagamos
    if (typeof isRecording !== 'undefined' && isRecording) {
        toggleGrabacion(); 
    }
    
    // 3. Restauramos el botón del micro a su estado original (azul)
    const btn = document.getElementById('btn-escuchar-juego');
    btn.innerHTML = '<span class="material-icons">mic</span> ACTIVAR MICRO PARA JUGAR';
    btn.style.background = 'var(--ocean-blue)';
    
    // 4. Ocultamos el mástil de ayuda por si estaba abierto
    document.getElementById('contenedor-mastil').classList.add('hidden');
    
    // 5. Ocultamos la pantalla del juego activo
    document.getElementById('interfaz-juego-activa').classList.add('hidden');
    
    // 6. Mostramos de nuevo el menú de dificultad
    document.getElementById('menu-dificultad-juego').classList.remove('hidden');
    
    // 7. Reseteamos los marcadores para la próxima partida
    puntosJuego = 0;
    document.getElementById('puntos-texto').innerText = "0";
    document.getElementById('nota-escuchada').innerText = "--";
}

// ==========================================
// --- DICCIONARIO Y DETECCIÓN DE ACORDES ---
// ==========================================

// Diccionario de acordes (Notas exactas que forman cada acorde)
const diccionarioAcordes = [
    // MAYORES
    { nombre: "C", notas: ["C", "E", "G"] },
    { nombre: "D", notas: ["D", "F#", "A"] },
    { nombre: "E", notas: ["E", "G#", "B"] },
    { nombre: "F", notas: ["F", "A", "C"] },
    { nombre: "G", notas: ["G", "B", "D"] },
    { nombre: "A", notas: ["A", "C#", "E"] },
    { nombre: "B", notas: ["B", "D#", "F#"] },
    
    // MENORES
    { nombre: "Cm", notas: ["C", "D#", "G"] },
    { nombre: "Dm", notas: ["D", "F", "A"] },
    { nombre: "Em", notas: ["E", "G", "B"] },
    { nombre: "Fm", notas: ["F", "G#", "C"] },
    { nombre: "Gm", notas: ["G", "A#", "D"] },
    { nombre: "Am", notas: ["A", "C", "E"] },
    { nombre: "Bm", notas: ["B", "D", "F#"] }
];

// ==========================================
// --- DICCIONARIO DE POSTURAS VISUALES ---
// ==========================================
// cuerdaIndex: 0 es la 1ª cuerda (la más fina), 1 es la 2ª cuerda, etc.

const posturasAcordesVisuales = {
    guitarra: {
        "C": [ {cuerdaIndex: 1, traste: 1}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 3} ], // Do Mayor
        "D": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 2} ], // Re Mayor
        "E": [ {cuerdaIndex: 2, traste: 1}, {cuerdaIndex: 3, traste: 2}, {cuerdaIndex: 4, traste: 2} ], // Mi Mayor
        "G": [ {cuerdaIndex: 0, traste: 3}, {cuerdaIndex: 4, traste: 2}, {cuerdaIndex: 5, traste: 3} ]  // Sol Mayor
        // Añade aquí el resto de la guitarra (F, A, B, Cm, Dm...)
    },
    timple: {
        "C": [ {cuerdaIndex: 2, traste: 1} ], // Do Mayor en Timple (depende de tu afinación)
        "D": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 2}, {cuerdaIndex: 2, traste: 2} ], 
        "G": [ {cuerdaIndex: 0, traste: 2}, {cuerdaIndex: 1, traste: 3}, {cuerdaIndex: 2, traste: 2} ]
        // Añade aquí el resto del timple...
    },
    contra: {
        // Rellena con las posturas del contra...
    },
    bandurria: {
        // Rellena con las posturas de la bandurria...
    },
    laud: {
        // Rellena con las posturas del laúd...
    }
};

let candidatoActual = "--";
let fotogramasEstables = 0;
const UMBRAL_ESTABILIDAD = 15; // Número de frames que debe mantenerse el acorde para darlo por bueno

function detectarAcordeJuego() {
    // Si el juego ha terminado o cerramos la ventana, paramos el bucle
    if (document.getElementById('interfaz-juego-activa').classList.contains('hidden') || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    let picos = [];
    // Reducción de ruido de fondo (tu lógica, que es excelente)
    for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > -40) { 
            if (i > 0 && i < bufferLength - 1) {
                if (dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1]) {
                    const freq = i * audioContext.sampleRate / analyser.fftSize;
                    if (freq > 80 && freq < 1000) picos.push({ freq: freq, volumen: dataArray[i] });
                }
            }
        }
    }

    picos.sort((a, b) => b.volumen - a.volumen);
    let notasDetectadas = new Set();
    
    // Convertimos los 5 picos más fuertes a nombres de notas sin octava (C, D#, etc.)
    for (let i = 0; i < Math.min(5, picos.length); i++) {
        const noteNum = 12 * (Math.log(picos[i].freq / 440) / Math.log(2)) + 69;
        const index = Math.round(noteNum) % 12;
        if (index >= 0) notasDetectadas.add(NOTAS[index]); // Usamos tu array global NOTAS
    }

    const arrayNotas = Array.from(notasDetectadas);
    let acordeEncontrado = "--";

    // Si detectamos al menos 2 o 3 notas distintas, buscamos en el diccionario
    if (arrayNotas.length >= 2) {
        for (let acorde of diccionarioAcordes) {
            // Comprueba si todas las notas fundamentales del acorde están sonando
            const coincide = acorde.notas.every(nota => arrayNotas.includes(nota));
            if (coincide) { 
                acordeEncontrado = acorde.nombre; 
                break; 
            }
        }
    }

    // --- ESTABILIZACIÓN ---
    if (acordeEncontrado === candidatoActual && acordeEncontrado !== "--") {
        fotogramasEstables++;
    } else {
        candidatoActual = acordeEncontrado;
        fotogramasEstables = 0;
    }

    // Si el acorde se mantiene constante y coincide con el objetivo del juego... ¡ACIERTO!
    if (fotogramasEstables >= UMBRAL_ESTABILIDAD && modoJuegoSeleccionado === 'acordes') {
        if (candidatoActual === notaObjetivoActual.nombre) {
            aciertoJuego(); // Llamaremos a una función para dar puntos y pasar de nivel
            fotogramasEstables = 0; // Reseteamos para evitar bucles de aciertos
        }
    }

    requestAnimationFrame(detectarAcordeJuego);
}

// ==========================================
// --- MOTOR DEL JUEGO (MICRO Y ACIERTOS) ---
// ==========================================

let microJuegoActivo = false;
let puntosJuego = 0;
let enTransicionAcierto = false;

// Base de datos rápida para generar notas aleatorias con su octava real
const cuerdasConOctava = {
    timple: ['D5', 'A4', 'E4', 'C5', 'G4'],
    contra: ['G4', 'D4', 'A3', 'F4', 'C4'],
    guitarra: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
    bandurria: ['A4', 'E4', 'B3', 'F#3', 'C#3', 'G#2'],
    laud: ['A4', 'E4', 'B3', 'F#3', 'C#3', 'G#2']
};

async function activarMicroJuego() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        microJuegoActivo = true;
        const btn = document.getElementById('btn-escuchar-juego');
        btn.innerHTML = '<span class="material-icons">mic_off</span> MICRO ACTIVADO';
        btn.style.background = '#4CAF50';

        // Lanzar el escuchador correspondiente
        if (modoJuegoSeleccionado === 'tablatura') detectarNotaJuego();
        else if (modoJuegoSeleccionado === 'acordes') detectarAcordeJuego(); // Tu función de antes
        
    } catch (err) {
        alert("Error al acceder al micrófono: " + err);
    }
}

// Bucle que detecta una sola nota (Para Caza-Tablaturas)
function detectarNotaJuego() {
    if (!microJuegoActivo || enTransicionAcierto || document.getElementById('interfaz-juego-activa').classList.contains('hidden')) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.sampleRate); // Usa tu propia función
    
    const visorNota = document.getElementById('nota-escuchada');

    if (ac !== -1) {
        const notaTocada = getNoteAndOctave(ac); // Tu función
        visorNota.innerText = notaTocada;

        if (notaTocada === notaObjetivoActual.nombre) {
            fotogramasEstables++;
            if (fotogramasEstables >= 10) { // Si la mantienes medio segundo, cuenta
                aciertoJuego();
                return; 
            }
        } else {
            fotogramasEstables = 0;
        }
    } else {
        visorNota.innerText = "--";
        fotogramasEstables = 0;
    }

    requestAnimationFrame(detectarNotaJuego);
}

// Modificamos un poco tu función de Acordes para el texto en vivo
function detectarAcordeJuego() {
    if (!microJuegoActivo || enTransicionAcierto || document.getElementById('interfaz-juego-activa').classList.contains('hidden')) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    let picos = [];
    for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > -40) { 
            if (i > 0 && i < bufferLength - 1) {
                if (dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1]) {
                    const freq = i * audioContext.sampleRate / analyser.fftSize;
                    if (freq > 80 && freq < 1000) picos.push({ freq: freq, volumen: dataArray[i] });
                }
            }
        }
    }

    picos.sort((a, b) => b.volumen - a.volumen);
    let notasDetectadas = new Set();
    const NOTAS_ARRAY = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    
    for (let i = 0; i < Math.min(5, picos.length); i++) {
        const noteNum = 12 * (Math.log(picos[i].freq / 440) / Math.log(2)) + 69;
        const index = Math.round(noteNum) % 12;
        if (index >= 0) notasDetectadas.add(NOTAS_ARRAY[index]); 
    }

    const arrayNotas = Array.from(notasDetectadas);
    let acordeEncontrado = "--";

    if (arrayNotas.length >= 2) {
        for (let acorde of diccionarioAcordes) {
            const coincide = acorde.notas.every(nota => arrayNotas.includes(nota));
            if (coincide) { acordeEncontrado = acorde.nombre; break; }
        }
    }

    // Actualizar el visor en vivo
    document.getElementById('nota-escuchada').innerText = acordeEncontrado;

    if (acordeEncontrado === candidatoActual && acordeEncontrado !== "--") {
        fotogramasEstables++;
    } else {
        candidatoActual = acordeEncontrado;
        fotogramasEstables = 0;
    }

    if (fotogramasEstables >= UMBRAL_ESTABILIDAD && acordeEncontrado === notaObjetivoActual.nombre) {
        aciertoJuego();
        return;
    }

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

    // Esperamos 1.5 segundos disfrutando del éxito, y sacamos otra nota
    setTimeout(() => {
        pantallaNota.classList.remove('iluminar-acierto');
        document.getElementById('mensaje-acierto').classList.add('hidden');
        
        generarNuevaMeta();
        enTransicionAcierto = false;
        
        // Volvemos a encender la escucha
        if (modoJuegoSeleccionado === 'tablatura') detectarNotaJuego();
        else if (modoJuegoSeleccionado === 'acordes') detectarAcordeJuego();
    }, 1500);
}

// Función matemática para sumar trastes
function sumarTrastesANota(notaConOctava, semitonos) {
    const NOTAS_ARRAY = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    let base = notaConOctava.slice(0, -1);
    if (base.length === 0) return { nombre: notaConOctava, base: notaConOctava, octava: 4 }; // Fallback
    const octava = parseInt(notaConOctava.slice(-1));
    let index = NOTAS_ARRAY.indexOf(base);
    
    let notaAbsoluta = octava * 12 + index + semitonos;
    let nuevaOctava = Math.floor(notaAbsoluta / 12);
    let nuevoIndex = notaAbsoluta % 12;
    
    return { nombre: NOTAS_ARRAY[nuevoIndex] + nuevaOctava, base: NOTAS_ARRAY[nuevoIndex], octava: nuevaOctava };
}

function generarNuevaMeta() {
    if (modoJuegoSeleccionado === 'tablatura') {
        let maxTraste = 5;
        if(nivelJuegoActual === 'medio') maxTraste = 7;
        if(nivelJuegoActual === 'dificil') maxTraste = 12;

        const cuerdas = cuerdasConOctava[instrumentoJuegoActual];
        const indexCuerda = Math.floor(Math.random() * cuerdas.length);
        const traste = Math.floor(Math.random() * (maxTraste + 1));
        
        const notaAlAire = cuerdas[indexCuerda];
        const notaCalculada = sumarTrastesANota(notaAlAire, traste);

        notaObjetivoActual = { 
            nombre: notaCalculada.nombre, 
            notaBase: notaCalculada.base, 
            octava: notaCalculada.octava, 
            cuerdaIndex: indexCuerda, 
            traste: traste 
        };

        const espanol = notasLatinas[notaObjetivoActual.notaBase] || notaObjetivoActual.notaBase;
        document.getElementById('nota-pantalla').innerHTML = `${notaObjetivoActual.nombre} <span class="nota-espanol">(${espanol}${notaObjetivoActual.octava})</span>`;

    } else if (modoJuegoSeleccionado === 'acordes') {
        let acordesFiltrados = diccionarioAcordes;
        if (nivelJuegoActual === 'facil') {
            acordesFiltrados = diccionarioAcordes.filter(a => !a.nombre.includes('m')); // Solo Mayores
        }

        const acordeAleatorio = acordesFiltrados[Math.floor(Math.random() * acordesFiltrados.length)];
        notaObjetivoActual = { nombre: acordeAleatorio.nombre }; 
        
        document.getElementById('nota-pantalla').innerHTML = `<span style="font-size: 1.5em; color: var(--canary-yellow);">${notaObjetivoActual.nombre}</span>`;
    }
}