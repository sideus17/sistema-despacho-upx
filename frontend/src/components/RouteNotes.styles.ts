// Classes das notas da rota (antes RouteNotes.module.css): desvio, aviso e informação na mesma caixa neutra
const note =
  'rounded-lg border border-tint-neutral-border bg-tint-neutral px-2.5 py-2 text-[13px] leading-[1.4] text-tint-neutral-text';

export const styles = {
  notes: 'flex flex-col gap-1.5',
  detour: note,
  warning: note,
  notice: note
};
