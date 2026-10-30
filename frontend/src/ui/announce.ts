// Anúncio para o leitor de tela, sem nada na tela: uma região viva fora da vista, criada na primeira vez.
// O texto é limpo antes de cada anúncio, para o leitor repetir uma frase igual à anterior.
let region: HTMLElement | null = null;

export function announce(text: string): void {
  if (!region || !document.body.contains(region)) {
    region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap'
    });
    document.body.appendChild(region);
  }
  const target = region;
  target.textContent = '';
  window.setTimeout(() => {
    target.textContent = text;
  }, 50);
}
