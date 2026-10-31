// Tabelas por pessoa: a lista cresce com a equipe, sem o limite de altura dos gráficos
export const styles = {
  // Nome fixo à esquerda: no celular a tabela rola de lado sem perder de quem é a linha
  table: [
    '[&_th[scope=row]]:sticky [&_th[scope=row]]:left-0 [&_th[scope=row]]:z-1 [&_th[scope=row]]:bg-surface [&_th[scope=row]]:font-[600] [&_th[scope=row]]:whitespace-nowrap [&_th[scope=row]]:text-text',
    '[&_td]:whitespace-nowrap'
  ].join(' '),
  // Fora da curva: peso e seta (a cor fica para as 4 da classificação)
  slow: 'font-bold text-text!',
  name: 'inline-flex items-center gap-1.5',
  demo: 'inline-block rounded-[999px] bg-tint-neutral px-2 py-0 text-[12px] leading-[1.6] font-[700] text-tint-neutral-text',
  // Título do ranking, acima das barras
  rankingTitle: 'mx-0 mt-0 mb-2.5 text-[13px] font-[700] text-text-soft',
  ranking: 'mb-[18px]'
};
