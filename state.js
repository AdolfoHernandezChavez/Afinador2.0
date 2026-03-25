export const state = {
    audioContext: null,
    analyser: null,
    isRunning: false,
    isRecording: false,
    sourceFileNode: null,

    instrumentoActualData: [],
    targetFrequency: 587.33,
    smoothedFrequency: 0,

    framesHeld: 0,
    lastCandidate: '',
    notasGrabadas: [],

    frecuenciaReferencia: 440
};

export const CONFIG = {
    MELODY_THRESHOLD: 4,
    MAX_TRASTE: 15,
    IN_TUNE_THRESHOLD_HZ: 1.5,
    GAUGE_MAX_ANGLE: 60,
    SMOOTHING_FACTOR: 0.15
};

export const TEMPERAMENTOS = {
    estandar: 440.0,
    orquestal: 442.0,
    tradicional: 435.0
};