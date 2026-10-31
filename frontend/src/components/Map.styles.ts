// Classes do mapa da central (antes Map.module.css), escritas por extenso

// Ícone da legenda: os próprios marcadores do mapa, em tamanho reduzido (o pino de chamado menor ainda)
const legendIcon = 'relative size-[22px] shrink-0 [&>*]:absolute [&>*]:top-1/2 [&>*]:left-1/2';
// Aviso de "clique no mapa", embaixo, acima dos créditos (em cima ficam o zoom e a legenda)
const pickHint =
  'absolute bottom-10 left-1/2 z-2 flex max-w-[calc(100%_-_48px)] items-center gap-1.5 rounded-[999px] bg-primary py-2 pl-3.5 text-[13px] font-medium text-on-primary shadow-[0_2px_8px_rgba(0,0,0,0.25)] [transform:translateX(-50%)]';

export const styles = {
  wrapper: 'relative size-full',
  placeholder: 'size-full',
  popup: '[&_h3]:mb-2 [&_h3]:text-[16px] [&_h3]:font-bold [&_p]:my-1 [&_p]:text-[14px]',
  popupDriver: 'flex items-center gap-1.5',
  popupWarning: 'font-bold text-text',
  // Horários do atendimento no popup do chamado
  popupTimeline: 'text-[12px] [font-variant-numeric:tabular-nums] text-text-muted',

  // Canto superior direito (embaixo ficam os créditos); sobra espaço para o zoom e os créditos no mapa baixo do celular
  legend:
    'absolute top-2.5 right-2.5 z-2 max-h-[min(calc(100%_-_60px),50vh)] overflow-x-hidden overflow-y-auto rounded-app bg-surface text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
  // Liga e desliga os ícones das ocorrências; fica à vista com a legenda fechada. aria-checked pinta o trilho
  iconsSwitch:
    'group flex min-h-9 w-full cursor-pointer items-center justify-between gap-2.5 [border-right:none] [border-bottom:none] [border-left:none] [border-top:1px_solid_var(--color-border)] bg-transparent py-0 pr-2.5 pl-3.5 text-left text-[13px] font-bold text-text-soft',
  switchTrack: [
    'relative h-[18px] w-[30px] shrink-0 rounded-[999px] border-[1.5px] border-text-muted [transition:background-color_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out)]',
    'group-aria-checked:border-primary group-aria-checked:bg-primary',
    '[&_span]:absolute [&_span]:top-0.5 [&_span]:left-0.5 [&_span]:size-[11px] [&_span]:rounded-[50%] [&_span]:bg-text-muted [&_span]:[transition:transform_var(--dur-fast)_var(--ease-out),background-color_var(--dur-fast)_var(--ease-out)]',
    'group-aria-checked:[&_span]:bg-on-primary group-aria-checked:[&_span]:[transform:translateX(12px)]'
  ].join(' '),
  legendToggle:
    'flex min-h-9 w-full cursor-pointer items-center justify-between gap-1.5 border-none bg-transparent py-0 pr-2.5 pl-3.5 text-left text-[13px] font-bold text-text',
  legendItems: 'list-none px-3.5 pt-0 pb-3 [&_li]:my-1 [&_li]:flex [&_li]:items-center [&_li]:gap-2',
  legendIcon: `${legendIcon} [&>*]:[transform:translate(-50%,-50%)_scale(0.62)]`,
  // Usado sozinho (já inclui o ícone)
  legendPin: `${legendIcon} [&>*]:[transform:translate(-50%,-50%)_scale(0.48)] [&>*]:[transform-origin:50%_50%]`,
  // ! vence o transform que o ícone da legenda põe em cada filho
  legendRoute: 'h-[5px] w-5 rounded-[3px] [transform:translate(-50%,-50%)]!',
  // Trânsito: lento, muito lento e parado, lado a lado
  legendTraffic: 'flex h-[5px] w-[21px] overflow-hidden rounded-[3px] [transform:translate(-50%,-50%)]! [&_i]:flex-1',
  // As 4 cores da classificação ao lado de "Chamado"
  legendRisk: 'ml-0.5 inline-flex gap-[3px] [&_i]:size-[9px] [&_i]:rounded-[50%]',

  // Ocorrências
  effectPill:
    'inline-block rounded-[999px] [border:1.5px_var(--effect-line)_var(--effect-edge)] bg-(--effect-bg) px-2 py-px text-[12px] font-bold [color:var(--effect-fg)]',
  capitalize: 'first-letter:uppercase',

  pickHint: `${pickHint} pr-3.5 pointer-events-none`,
  // Aviso com botão (no celular não há Esc para cancelar); usado sozinho (já inclui o aviso)
  pickHintAction: `${pickHint} pr-1.5 pointer-events-auto [&_button]:ml-1 [&_button]:cursor-pointer [&_button]:rounded-[999px] [&_button]:border-none [&_button]:bg-[rgba(128,128,128,0.3)] [&_button]:px-2.5 [&_button]:py-1 [&_button]:[color:inherit] [&_button]:[font:inherit] [&_button:hover]:bg-[rgba(128,128,128,0.45)]`,

  // Local do chamado que está sendo aberto
  draftPin:
    'block text-[38px] leading-[0] text-primary [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.4))] [&_svg]:align-[0]'
};
