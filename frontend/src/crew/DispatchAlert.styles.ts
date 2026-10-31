// Alarme de despacho em tela cheia (antes DispatchAlert.module.css)
export const styles = {
  // Por cima de tudo, inclusive da folha de relato (1700) e da navegação (1500). A tela segue o tema
  // (à noite, o fundo mais escuro do app): a cor de risco fica só na faixa do topo
  screen: 'fixed inset-0 z-2000 flex flex-col bg-(color:--alarm-surface) text-text',
  // A pulseira em tamanho grande; só aparece com um fade curto (quem chama a atenção é o som e a vibração)
  band: [
    'flex min-h-(--alarm-band-height) shrink-0 items-end gap-3 bg-(color:--risk) px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-5 text-(color:--risk-on)',
    '[animation:band-in_var(--dur-base)_var(--ease-out)] motion-reduce:[animation:none] [&_.icon]:text-[36px]'
  ].join(' '),
  priority: 'flex flex-col gap-0.5',
  colorName: 'text-[30px] leading-[1.1] font-display',
  colorLabel: 'text-[18px] font-[500]',
  // O texto ocupa o espaço até o botão; só rola se for longo de verdade
  content: 'flex min-h-0 flex-[1_1_auto] flex-col gap-2.5 overflow-y-auto px-5 pt-6 pb-4',
  title: 'text-[18px] font-bold text-text-soft',
  distance: 'text-[18px] font-bold text-text [font-variant-numeric:tabular-nums]',
  // O que aconteceu, antes do "Ciente": até 3 linhas
  description:
    '[display:-webkit-box] overflow-hidden text-[17px] leading-[1.45] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [line-clamp:3]',
  address: 'text-[28px] leading-[1.2] font-display',
  detail: 'text-[17px] leading-[1.45] font-regular text-text-soft',
  // Ações no pé da tela, na zona do polegar
  actions: 'mx-5 mt-0 mb-[calc(env(safe-area-inset-bottom)+20px)] flex shrink-0 flex-col gap-2',
  // Só confirmar, sem abrir a navegação: secundário (contorno de dia, só texto à noite)
  ackOnly:
    'min-h-[52px] cursor-pointer rounded-[14px] border border-secondary-border bg-transparent text-[17px] font-bold text-secondary-text',
  // O botão de ação da equipe: tinta de dia, grafite com contorno à noite
  ack: 'min-h-[72px] cursor-pointer rounded-[14px] border-2 border-action-border bg-action text-[24px] font-bold text-on-action',
  // Lido pelo leitor de tela, sem aparecer ("Amarelo · Urgência" numa frase só)
  srOnly: 'absolute h-px w-px overflow-hidden [clip-path:inset(50%)] whitespace-nowrap'
};
