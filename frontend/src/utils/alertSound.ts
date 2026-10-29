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

// Chamado novo: dois bipes agudos. Espera longa: um bipe mais grave e mais longo. Despacho (app da
// equipe, repete até o "Ciente"): três bipes subindo, mais altos, para ouvir com o motor ligado.
export function playAlert(kind: 'novo' | 'espera' | 'despacho'): void {
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  if (kind === 'novo') {
    beep(now, 880, 0.15);
    beep(now + 0.25, 880, 0.15);
  } else if (kind === 'despacho') {
    beep(now, 660, 0.22, 0.6);
    beep(now + 0.3, 880, 0.22, 0.6);
    beep(now + 0.6, 1100, 0.32, 0.6);
  } else {
    beep(now, 600, 0.4);
  }
}
