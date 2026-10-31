// Classes dos marcadores do mapa (central, prévia da equipe, navegação e Gestão), antes Markers.module.css.
// Cada forma é usada sozinha (já inclui a base), para cor, borda e raio não disputarem entre duas classes

// Viatura: forma, tamanho e sombra; o ícone direto em 22px (o do selo tem o seu)
const ambulance =
  'relative grid size-8 cursor-pointer place-items-center rounded-[50%] border-3 shadow-[0_2px_6px_rgba(0,0,0,0.35)] [&>svg]:size-[22px]';
const hospital =
  'grid cursor-pointer place-items-center rounded-[6px] border-2 border-surface bg-primary text-on-primary shadow-[0_2px_6px_rgba(0,0,0,0.35)]';
// Ocorrência: o efeito pela forma (effectVars), sem as cores da classificação
const incident =
  'grid size-[30px] cursor-pointer place-items-center [border:3px_var(--effect-line)_var(--effect-edge)] bg-(--effect-bg) [color:var(--effect-fg)] shadow-[0_0_0_2px_var(--color-surface),0_2px_6px_rgba(0,0,0,0.35)] [&_svg]:size-[18px]';
// Chamado: pino com a ponta exatamente no local (âncora embaixo)
const call =
  'relative h-[46px] w-9 cursor-pointer [filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.35))] [transform-origin:50%_100%]';

export const styles = {
  // Livre: contorno; em atendimento: preenchida; indisponível: tracejada; sem motorista: apagada
  ambulanceFree: `${ambulance} border-primary bg-surface text-primary`,
  ambulanceBusy: `${ambulance} border-surface bg-primary text-on-primary`,
  ambulanceUnavailable: `${ambulance} border-dashed border-text-muted bg-surface-hover text-text-muted`,
  ambulanceOff: `${ambulance} border-surface bg-border-strong text-text-muted opacity-85`,
  // GPS sem atualizar: selo de canto em tinta (a forma continua dizendo o estado)
  staleBadge:
    'absolute -top-[7px] -right-[7px] grid size-[18px] place-items-center rounded-[50%] border border-surface bg-primary text-on-primary [&_svg]:size-3',
  base: 'grid size-8 cursor-pointer place-items-center rounded-[9px] border-2 border-primary bg-surface text-primary shadow-[0_2px_6px_rgba(0,0,0,0.35)] [&_svg]:size-[22px]',
  incident: `${incident} rounded-[50%]`,
  // Bloqueio: quadrado, como placa de via interditada, para diferenciar do risco sem depender da cor
  incidentBlock: `${incident} rounded-[8px]`,
  // Hospital: "H" no quadrado, como a placa; pronto-socorro um pouco menor
  hospital: `${hospital} size-7 [font:800_17px/1_system-ui,sans-serif]`,
  hospitalSmall: `${hospital} size-6 [font:800_14px/1_system-ui,sans-serif]`,
  call,
  callSelected: `${call} [transform:scale(1.2)]`,
  callPin: 'absolute inset-0 size-full',
  callIcon: 'absolute top-[7px] left-1/2 text-[18px] leading-[0] [transform:translateX(-50%)] [&_svg]:align-[0]',
  // Chamado pendente pulsa para chamar atenção
  pulse:
    'absolute top-[31px] left-1/2 -ml-3.5 size-7 rounded-[50%] [animation:marker-pulse_1.8s_ease-out_infinite] motion-reduce:[animation:none] motion-reduce:opacity-0'
};
