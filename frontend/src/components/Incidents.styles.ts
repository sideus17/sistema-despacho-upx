// Classes da aba Ocorrências (antes Incidents.module.css). As cores de cada efeito chegam pelas
// variáveis --effect-* que o item recebe em style (effectVars)

export const styles = {
  container: 'flex flex-col gap-3 p-4',
  empty: 'p-5 text-center text-[15px] text-text-muted',
  // Alerta oficial para a cidade toda
  official:
    'flex gap-2.5 rounded-app border border-tint-neutral-border bg-tint-neutral px-3.5 py-3 text-[13px] leading-[1.45] text-tint-neutral-text [&_p]:mt-0.5',
  // Só aparece dentro de .actions, que encolhe altura e fonte dos filhos
  secondary:
    'inline-flex min-h-[38px] flex-[1_1_auto] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-0 text-[13px] font-bold text-text hover:bg-surface-muted',
  hint: 'text-[12px] text-text-muted',
  // Lista
  list: 'flex list-none flex-col gap-2.5',
  item: 'rounded-app border border-border bg-surface px-3.5 py-3',
  itemHeader: 'flex items-center gap-2.5',
  itemIcon:
    'grid size-9 shrink-0 place-items-center rounded-[50%] [border:2px_var(--effect-line)_var(--effect-edge)] bg-(color:--effect-bg) text-[20px] text-(color:--effect-fg)',
  itemTitle:
    'min-w-0 flex-1 [&_h3]:text-[15px] [&_h3]:font-bold [&_p]:text-[12px] [&_p]:text-text-muted',
  effect:
    'rounded-[999px] [border:1.5px_var(--effect-line)_var(--effect-edge)] bg-(color:--effect-bg) px-2.5 py-[3px] text-[12px] font-bold whitespace-nowrap text-(color:--effect-fg)',
  description: 'mt-2 text-[13px] leading-[1.45] text-text-soft',
  meta: 'mt-1.5 text-[12px] text-text-muted',
  warning: 'mt-1 text-[12px] font-bold text-text',
  actions: 'mt-2.5 flex flex-wrap gap-1.5',
  // Fontes oficiais
  sources:
    'border-t border-t-border px-3 py-2.5 text-[12px] leading-[1.45] text-text-muted [&_h3]:mb-1 [&_h3]:text-[12px] [&_h3]:font-bold [&_h3]:text-text [&_h3]:uppercase [&_strong]:text-text',
  sourceError: 'text-danger-text',
  // Trânsito do TomTom: grupo recolhido depois das ocorrências; o p é a dica logo abaixo do resumo
  traffic: [
    'flex flex-col gap-2 [&>p]:mb-2',
    '[&_summary]:cursor-pointer [&_summary]:rounded-app [&_summary]:border [&_summary]:border-border [&_summary]:bg-surface [&_summary]:px-3 [&_summary]:py-2.5 [&_summary]:text-[14px] [&_summary]:font-bold [&_summary]:text-text',
    '[&[open]_summary]:mb-2'
  ].join(' ')
};
