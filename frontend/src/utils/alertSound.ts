import { CallPriority } from '../types';

// Bipe de alerta gerado na hora (WebAudio): sem arquivo de som para baixar nem guardar no PWA.
// O navegador só deixa tocar som depois de um toque ou tecla na página: o primeiro libera.

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

export function unlockAlertSound(): void {
  const Context: AudioContextClass | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Context) return;
  context ??= new Context();
  if (context.state === 'suspended') context.resume().catch(() => {});
}

function beep(start: number, frequency: number, duration: number, volume = 0.3) {
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  // Sobe e desce rápido para não estalar
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

// Despacho (app da equipe, repete até o "Ciente"), alto para ouvir com o motor ligado e diferente pela cor:
// o Vermelho, cinco bipes curtos e agudos subindo (urgência); o Amarelo, três subindo; Verde e Azul,
// dois bipes mais graves e espaçados
function dispatchBeeps(now: number, priority?: CallPriority) {
  if (priority === CallPriority.EMERGENCIA) {
    [880, 990, 1100, 1250, 1400].forEach((frequency, index) => beep(now + index * 0.18, frequency, 0.14, 0.65));
  } else if (priority === CallPriority.PRIORITARIO || priority === CallPriority.NAO_URGENTE) {
    beep(now, 520, 0.3, 0.5);
    beep(now + 0.5, 660, 0.3, 0.5);
  } else {
    beep(now, 660, 0.22, 0.6);
    beep(now + 0.3, 880, 0.22, 0.6);
    beep(now + 0.6, 1100, 0.32, 0.6);
  }
}

// Chamado novo: dois bipes agudos. Espera longa: um bipe mais grave e mais longo. Despacho: pela cor.
export function playAlert(kind: 'novo' | 'espera' | 'despacho', priority?: CallPriority): void {
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  if (kind === 'novo') {
    beep(now, 880, 0.15);
    beep(now + 0.25, 880, 0.15);
  } else if (kind === 'despacho') {
    dispatchBeeps(now, priority);
  } else {
    beep(now, 600, 0.4);
  }
}
