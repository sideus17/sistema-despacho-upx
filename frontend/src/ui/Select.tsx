import { KeyboardEvent, ReactNode } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue } from 'react-aria-components';
import { CheckIcon, ExpandMoreIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: ReactNode;
  // Rótulo só para o leitor de tela (filtros do Histórico): o texto da opção já diz o que é
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  // "field": campo de formulário (16 px, sem zoom no iOS); "compact": filtros e cartões
  size?: 'field' | 'compact';
  className?: string;
  labelClassName?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

// O React Aria não aceita a chave vazia: a opção "nenhuma" ("Sem escolha", "Todas as cores") usa esta
const EMPTY = '__vazio__';
const toKey = (value: string) => value || EMPTY;
const fromKey = (key: string) => (key === EMPTY ? '' : key);

const SIZE_CLASS = {
  field: 'min-h-11 pr-2.5 pl-3 text-[16px] font-regular', // abaixo de 16px o iOS dá zoom ao focar o campo
  compact: 'min-h-[38px] pr-2 pl-2.5 text-[14px] font-[500]'
};

/**
 * Lista de escolha com o mesmo desenho do botão: a lista abre arredondada, da largura do botão, com a
 * opção marcada em negrito e com ✓. Teclado (setas, Enter, Esc, letra inicial) e leitor de tela vêm do
 * React Aria.
 */
export function Select({ label, hideLabel, value, onChange, options, disabled, size = 'field', className, labelClassName, onKeyDown }: SelectProps) {
  return (
    <AriaSelect
      className={`group flex min-w-0 flex-col gap-1 ${className ?? ''}`}
      selectedKey={toKey(value)}
      onSelectionChange={key => onChange(fromKey(String(key)))}
      isDisabled={disabled}
      aria-label={hideLabel && typeof label === 'string' ? label : undefined}
    >
      {!hideLabel && <Label className={labelClassName}>{label}</Label>}
      <Button className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-surface text-left leading-[inherit] text-text data-disabled:cursor-not-allowed data-disabled:text-text-muted data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus data-hovered:border-text-muted ${SIZE_CLASS[size]}`} onKeyDown={onKeyDown}>
        <SelectValue className="min-w-0 truncate" />
        <ExpandMoreIcon className="shrink-0 text-[20px] text-text-muted transition-transform duration-(--dur-fast) ease-out group-data-open:rotate-180" aria-hidden="true" />
      </Button>
      <Popover className="max-h-[320px] w-(--trigger-width) min-w-[180px] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-[0_10px_28px_rgba(0,0,0,0.18)] data-entering:animate-pop-in data-exiting:animate-[pop-in_var(--dur-fast)_var(--ease-out)_reverse] motion-reduce:animate-none" offset={4}>
        <ListBox className="outline-none">
          {options.map(option => (
            <ListBoxItem key={toKey(option.value)} id={toKey(option.value)} textValue={option.label} className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[14px] text-text outline-none data-focus-visible:shadow-[inset_0_0_0_2px_var(--color-focus)] data-focused:bg-surface-hover data-hovered:bg-surface-hover data-selected:font-bold">
              {({ isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && <CheckIcon className="shrink-0 text-[18px]" aria-hidden="true" />}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
