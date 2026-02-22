let audioContext;
let analyser;
let isRunning = false;
let isRecording = false;
let sourceFileNode = null; 

const MELODY_THRESHOLD = 4;  
let framesHeld = 0;
let lastCandidate = "";

// --- NUEVO: Memoria para la tablatura ---
let notasGrabadas = []; 
let instrumentoActualData = []; // Guardará las cuerdas del instrumento seleccionado

const datosTimple = [
    { num: '1ª', nota: 'D5', freq: 587.33 },
    { num: '2ª', nota: 'A4', freq: 440.00 },
    { num: '3ª', nota: 'E4', freq: 329.63 },
    { num: '4ª', nota: 'C5', freq: 523.25 },
    { num: '5ª', nota: 'G4', freq: 392.00 }
];
const datosContra = [
    { num: '1ª', nota: 'G4', freq: 392.00 },
    { num: '2ª', nota: 'D4', freq: 293.66 },
    { num: '3ª', nota: 'A3', freq: 220.00 },
    { num: '4ª', nota: 'F4', freq: 349.23 },
    { num: '5ª', nota: 'C4', freq: 261.63 }
];
const datosGuitarra = [
    { num: '1ª', nota: 'E4', freq: 329.63 },
    { num: '2ª', nota: 'B3', freq: 246.94 },
    { num: '3ª', nota: 'G3', freq: 196.00 },
    { num: '4ª', nota: 'D3', freq: 146.83 },
    { num: '5ª', nota: 'A2', freq: 110.00 },
    { num: '6ª', nota: 'E2', freq: 82.41 }
];
const datosBandurria = [
    { num: '1ª', nota: 'A5', freq: 880.00 },
    { num: '2ª', nota: 'E5', freq: 659.25 },
    { num: '3ª', nota: 'B4', freq: 493.88 },
    { num: '4ª', nota: 'F#4', freq: 369.99 },
    { num: '5ª', nota: 'C#4', freq: 277.18 },
    { num: '6ª', nota: 'G#3', freq: 207.65 }
];
const datosLaud = [
    { num: '1ª', nota: 'A4', freq: 440.00 },
    { num: '2ª', nota: 'E4', freq: 329.63 },
    { num: '3ª', nota: 'B3', freq: 246.94 },
    { num: '4ª', nota: 'F#3', freq: 185.00 },
    { num: '5ª', nota: 'C#3', freq: 138.59 },
    { num: '6ª', nota: 'G#2', freq: 103.83 }
];

let targetFrequency = 587.33; 
const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

window.onload = () => { cambiarInstrumento('timple'); };

function cambiarVista(vista) {
    const vistaAfinador = document.getElementById('vista-afinador');
    const vistaTranscriptor = document.getElementById('vista-transcriptor');
    const tabAfinador = document.getElementById('tab-afinador');
    const tabTranscriptor = document.getElementById('tab-transcriptor');

    if (vista === 'afinador') {
        vistaAfinador.classList.remove('hidden');
        vistaTranscriptor.classList.add('hidden');
        tabAfinador.classList.add('active');
        tabTranscriptor.classList.remove('active');
        if (isRecording) toggleGrabacion();
    } else if (vista === 'transcriptor') {
        vistaTranscriptor.classList.remove('hidden');
        vistaAfinador.classList.add('hidden');
        tabTranscriptor.classList.add('active');
        tabAfinador.classList.remove('active');
    }
}

function cambiarInstrumento(inst) {
    document.querySelectorAll('.toggle-container button').forEach(b => b.className = '');
    document.getElementById('btn-' + inst).className = 'active';
    
    if (inst === 'timple') instrumentoActualData = datosTimple;
    else if (inst === 'contra') instrumentoActualData = datosContra;
    else if (inst === 'guitarra') instrumentoActualData = datosGuitarra;
    else if (inst === 'bandurria') instrumentoActualData = datosBandurria;
    else if (inst === 'laud') instrumentoActualData = datosLaud;

    generarBotones(instrumentoActualData);
}

function generarBotones(datos) {
    const contenedor = document.getElementById('cuerdas-container');
    contenedor.innerHTML = ''; 

    datos.forEach((cuerda, index) => {
        const btn = document.createElement('button');
        btn.className = 'string-btn';
        btn.innerText = cuerda.num;
        btn.onclick = () => {
            targetFrequency = cuerda.freq;
            document.querySelectorAll('.string-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('note-name').innerText = cuerda.nota;
            document.getElementById('note-name').style.color = "#fff";
            document.getElementById('status').innerText = "Afina: " + cuerda.nota;
            document.getElementById('status').style.color = "#aaa";
        };
        contenedor.appendChild(btn);
        if (index === 0) btn.click();
    });
}

function toggleGrabacion() {
    isRecording = !isRecording;
    const btn = document.getElementById('btn-rec');
    if (isRecording) {
        btn.innerHTML = "<span class='material-icons'>stop_circle</span> DETENER";
        btn.classList.add('recording');
        limpiarNotas();
    } else {
        btn.innerHTML = "<span class='material-icons'>mic</span> GRABAR MICRO";
        btn.classList.remove('recording');
        if(sourceFileNode) {
            sourceFileNode.stop();
            sourceFileNode = null;
        }
    }
}

function limpiarNotas() {
    document.getElementById('sheet-music').innerHTML = '<span class="placeholder">Graba o sube un audio...</span>';
    lastCandidate = "";
    framesHeld = 0;
    notasGrabadas = []; // Vaciamos la memoria
}

// --- NUEVO: CALCULADORA DE TRASTES ---
// Convierte una nota como "A4" en un número MIDI para poder sumar y restar trastes
function notaAMidi(notaStr) {
    let nota = notaStr.slice(0, -1);
    let octava = parseInt(notaStr.slice(-1));
    let index = NOTAS.indexOf(nota);
    return (octava + 1) * 12 + index;
}

// --- NUEVO: CALCULADORA DE TRASTES (PENSANDO COMO UN MÚSICO) ---
function calcularPosicion(notaStr) {
    let midiNotaDetectada = notaAMidi(notaStr);
    let opciones = [];

    // 1. Buscamos todas las combinaciones posibles en el mástil (hasta el traste 15)
    instrumentoActualData.forEach(cuerda => {
        let midiCuerdaAlAire = notaAMidi(cuerda.nota);
        let traste = midiNotaDetectada - midiCuerdaAlAire;
        
        if (traste >= 0 && traste <= 15) {
            opciones.push({ 
                cuerda: cuerda.num, 
                traste: traste, 
                numCuerda: parseInt(cuerda.num) 
            });
        }
    });

    if (opciones.length === 0) return []; // Nota fuera de rango

    // 2. Separamos las opciones de las cuerdas de abajo (1, 2, 3) y las de arriba (4, 5, 6)
    let opcionesAgudas = opciones.filter(o => o.numCuerda <= 3).sort((a, b) => a.traste - b.traste);
    let opcionesGraves = opciones.filter(o => o.numCuerda > 3).sort((a, b) => a.traste - b.traste);

    let resultadoFinal = [];

    if (opcionesAgudas.length > 0) {
        // REGLA 1: La mejor opción en las cuerdas de abajo (traste más bajo) es siempre la principal
        let mejorAguda = opcionesAgudas[0];
        resultadoFinal.push(mejorAguda);

        // REGLA 2: ¿Hay alguna opción en las cuerdas de arriba que nos ahorre estirar los dedos?
        if (opcionesGraves.length > 0) {
            let mejorGrave = opcionesGraves[0];
            // Solo la añadimos como alternativa SI su traste es MENOR que el de la opción principal
            if (mejorGrave.traste < mejorAguda.traste) {
                resultadoFinal.push(mejorGrave); 
            }
        }
    } else {
        // REGLA 3: Si la nota es tan grave que no existe en las 3 primeras cuerdas, 
        // usamos la mejor de las cuerdas de arriba como nota principal.
        if (opcionesGraves.length > 0) {
            resultadoFinal.push(opcionesGraves[0]);
        }
    }

    // Devolvemos la lista limpia (tendrá 1 opción normal, o 2 si se cumple la condición del traste menor)
    return resultadoFinal; 
}
// --- MODIFICADO: Escribir nota guarda en la memoria ---
function escribirNota(texto) {
    const sheet = document.getElementById('sheet-music');
    if(sheet.querySelector('.placeholder')) sheet.innerHTML = '';
    
    // Calculamos las opciones
    let opciones = calcularPosicion(texto);
    
    // Lo guardamos en memoria para el TXT
    notasGrabadas.push({
        nota: texto,
        opciones: opciones // Guardamos todas las opciones posibles
    });

    const span = document.createElement('span');
    span.className = 'note-bubble';
    
    if (opciones && opciones.length > 0) {
        let primaria = opciones[0];
        // Texto base: "D5 (1ª T0)"
        let txtVisual = `${texto} (${primaria.cuerda} T${primaria.traste})`;
        
        // Si hay una segunda opción viable, la mostramos también
        if (opciones.length > 1) {
            let alternativa = opciones[1];
            txtVisual = `${texto} (${primaria.cuerda} T${primaria.traste} ó ${alternativa.cuerda} T${alternativa.traste})`;
        }
        span.innerText = txtVisual;
    } else {
        span.innerText = texto; 
    }
    
    sheet.appendChild(span);
    sheet.scrollTop = sheet.scrollHeight; 
}

// --- NUEVO: GENERADOR DEL ARCHIVO .TXT ---
function descargarTablatura() {
    if (notasGrabadas.length === 0) {
        alert("¡No has grabado ninguna nota todavía!");
        return;
    }

    let txt = "========================================\n";
    txt += " TABLATURA CANARIA (DIGITACIÓN INTELIGENTE)\n";
    txt += "========================================\n";
    txt += " * Las notas normales (ej: -3-) son la sugerencia principal.\n";
    txt += " * Las notas en paréntesis (ej: -(0)-) son opciones alternativas.\n\n";

    const notasPorRenglon = 20; // Un poco menos para que quepan bien

    for (let i = 0; i < notasGrabadas.length; i += notasPorRenglon) {
        let bloqueNotas = notasGrabadas.slice(i, i + notasPorRenglon);

        instrumentoActualData.forEach(cuerdaInst => {
            // Cabecera de la cuerda (ej: "1ª (D)  ||")
            let notaCorta = cuerdaInst.nota.split(' ')[0].padEnd(2, ' ');
            let linea = cuerdaInst.num + " (" + notaCorta + ") ||";
            
            bloqueNotas.forEach(notaGrabada => {
                let opciones = notaGrabada.opciones;
                let bloqueVisual = "------"; // Espacio por defecto
                
                if (opciones && opciones.length > 0) {
                    let esPrimaria = (opciones[0].cuerda === cuerdaInst.num);
                    // Buscamos si esta cuerda es una de las alternativas
                    let esAlternativa = opciones.slice(1).find(opt => opt.cuerda === cuerdaInst.num);

                    if (esPrimaria) {
                        // Dibujamos la nota principal normal: -3---- o -10---
                        let tStr = opciones[0].traste.toString();
                        bloqueVisual = "-" + tStr.padEnd(2, '-') + "---";
                    } else if (esAlternativa) {
                        // Dibujamos la alternativa entre paréntesis: -(3)-- o -(10)-
                        let tStr = esAlternativa.traste.toString();
                        let altStr = "(" + tStr + ")";
                        bloqueVisual = "-" + altStr.padEnd(4, '-') + "-";
                    }
                }
                linea += bloqueVisual;
            });
            txt += linea + "|\n";
        });
        txt += "\n"; 
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
// --- LÓGICA DE AUDIO (MP3 Y MICRO) ---
async function cargarAudio(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        isRunning = true;
        buclePrincipal();
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (sourceFileNode) {
            try { sourceFileNode.stop(); } catch(e){}
        }

        sourceFileNode = audioContext.createBufferSource();
        sourceFileNode.buffer = audioBuffer;
        sourceFileNode.connect(analyser);
        analyser.connect(audioContext.destination);

        limpiarNotas();
        if (!isRecording) toggleGrabacion();
        sourceFileNode.start(0);
        
        sourceFileNode.onended = () => {
            if (isRecording) toggleGrabacion();
        };

    } catch (e) {
        alert("Error al leer el archivo de audio. Asegúrate de que es un MP3 o WAV válido.");
    }
}

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
        
        document.getElementById('btn-start').innerHTML = "<span class='material-icons'>mic</span> MICRO ACTIVO";
        document.getElementById('btn-start').style.background = "#222";
        buclePrincipal();
    } catch (e) { alert("Error: No se detecta micrófono."); }
}

function buclePrincipal() {
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
    const diff = freq - targetFrequency;
    let angulo = diff * 3;
    if (angulo > 60) angulo = 60;
    if (angulo < -60) angulo = -60;
    
    const needle = document.getElementById('needle');
    needle.style.transform = `translateX(-50%) rotate(${angulo}deg)`;
    document.getElementById('frequency').innerText = freq.toFixed(1) + " Hz";
    
    const status = document.getElementById('status');
    const noteName = document.getElementById('note-name');

    if (Math.abs(diff) < 1.5) {
        needle.style.background = "var(--canary-yellow)";
        status.innerText = "¡PERFECTO! 🇮🇨";
        status.style.color = "var(--canary-yellow)";
        noteName.style.color = "var(--canary-yellow)";
        needle.style.boxShadow = "0 0 15px var(--canary-yellow)";
    } else {
        needle.style.background = "#ff4d4d";
        needle.style.boxShadow = "none";
        noteName.style.color = "#fff";
        if (diff < 0) {
            status.innerText = "Aprieta (Sube) 🔼";
            status.style.color = "#ff9999";
        } else {
            status.innerText = "Afloja (Baja) 🔽";
            status.style.color = "#ff9999";
        }
    }
}

function analizarMelodia(freq) {
    const nota = getNoteAndOctave(freq);
    if (nota === lastCandidate) {
        framesHeld++;
    } else {
        framesHeld = 0;
        lastCandidate = nota;
    }

    if (framesHeld === MELODY_THRESHOLD) {
        const sheet = document.getElementById('sheet-music');
        const ultima = sheet.lastElementChild ? sheet.lastElementChild.innerText.split(' ')[0] : "";
        if (nota !== ultima) {
            escribirNota(nota);
        }
    }
}

function getNoteAndOctave(freq) {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
    const noteIndex = Math.round(noteNum) % 12;
    const octave = Math.floor(Math.round(noteNum) / 12) - 1;
    const index = noteIndex < 0 ? noteIndex + 12 : noteIndex;
    return NOTAS[index] + octave;
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i=0;i<SIZE;i++) { let val = buf[i]; rms+=val*val; }
    rms = Math.sqrt(rms/SIZE);
    if (rms<0.02) return -1; 

    let r1=0, r2=SIZE-1, thres=0.2;
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

    return sampleRate/T0;
}
