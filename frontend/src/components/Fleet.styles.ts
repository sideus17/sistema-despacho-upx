// Classes da aba Frota (antes Fleet.module.css). Variantes que trocam a mesma propriedade da base
// (item apagado, cor do selo, GPS parado) já incluem a base: usa-se uma ou outra, nunca as duas

const item = 'rounded-app border border-border px-3.5 py-3';
const pill = 'rounded-[999px] border-[1.5px] px-[9px] py-0.5 text-[12px] font-bold whitespace-nowrap';
const meta = 'mt-0.5 text-[12px]';

export const styles = {
  container: 'p-4',
  summary: 'mb-3.5 text-[14px] text-text-muted [&_strong]:text-text',
  list: 'flex list-none flex-col gap-2.5',
  item: `${item} bg-surface`,
  itemOff: `${item} bg-surface-muted opacity-75`,
  header: 'mb-1.5 flex items-center justify-between gap-2',
  code: 'text-[15px] font-bold [&_small]:text-[12px] [&_small]:font-[600] [&_small]:text-text-muted',
  // Status pela forma, como no mapa: livre com contorno, em atendimento preenchida, indisponível com
  // contorno tracejado e fora de serviço apagada
  pill_DISPONIVEL: `${pill} border-solid border-primary bg-surface text-text`,
  pill_EM_ATENDIMENTO: `${pill} border-solid border-primary bg-primary text-on-primary`,
  pill_INDISPONIVEL: `${pill} border-dashed border-text-muted bg-surface-hover text-text-soft`,
  // Fora de serviço: apagado pelo fundo cinza, mas com o texto legível
  pill_SEM_MOTORISTA: `${pill} border-solid border-transparent bg-border text-text-soft`,
  // Leva o mapa até a viatura (como o "Ver no mapa" das ocorrências)
  locate:
    'mt-1.5 inline-flex min-h-touch cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-0 text-[14px] font-bold text-text hover:bg-surface-hover',
  driverRow: 'flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1',
  driver: 'flex items-center gap-2 text-[14px] font-[600]',
  // Toque para ligar para a equipe
  phone:
    'inline-flex min-h-8 items-center gap-1 rounded-[999px] bg-tint-neutral px-2.5 py-0 text-[13px] font-bold whitespace-nowrap text-tint-neutral-text no-underline',
  meta: `${meta} text-text-muted`,
  // GPS parado: a posição no mapa pode estar velha
  metaStale: `${meta} font-bold text-text`
};
