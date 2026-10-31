// Pergunta "ainda está lá?" sobre uma ocorrência (antes StillTherePrompt.module.css)
export const styles = {
  // Acima do painel da navegação
  prompt:
    'absolute right-2.5 bottom-[calc(env(safe-area-inset-bottom)+150px)] left-2.5 z-3 overflow-hidden rounded-2xl bg-surface px-3.5 pt-3.5 pb-[18px] text-text [box-shadow:0_6px_20px_rgba(0,0,0,0.3)]',
  header: 'mb-3 flex items-center gap-3',
  icon: 'grid size-11 shrink-0 place-items-center rounded-[50%] bg-primary text-[24px] text-on-primary',
  question: 'text-[19px] leading-[1.2] font-bold',
  source: 'text-[13px] text-text-muted',
  answers: 'flex gap-2.5',
  // Alvos grandes (72 px): a resposta não pode exigir mira. Mesma cor nas duas: quem decide é o rótulo
  answer:
    'flex min-h-[72px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-solid border-action-border bg-action text-[20px] font-display text-on-action [&_.icon]:text-[26px]',
  // Barra do tempo restante; a duração vem no style
  timer: 'absolute bottom-0 left-0 h-[5px] w-full origin-left bg-text [animation:still-there-countdown_linear_forwards]'
};
