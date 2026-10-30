import { KeyboardEvent, ReactNode } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue } from 'react-aria-components';
import { CheckIcon, ExpandMoreIcon } from './icons';
import styles from './Select.module.css';

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

/**
 * Lista de escolha com o mesmo desenho do botão: a lista abre arredondada, da largura do botão, com a
 * opção marcada em negrito e com ✓. Teclado (setas, Enter, Esc, letra inicial) e leitor de tela vêm do
 * React Aria.
 */
export function Select({ label, hideLabel, value, onChange, options, disabled, size = 'field', className, labelClassName, onKeyDown }: SelectProps) {
  return (
    <AriaSelect
      className={`${styles.select} ${className ?? ''}`}
      selectedKey={toKey(value)}
      onSelectionChange={key => onChange(fromKey(String(key)))}
      isDisabled={disabled}
      aria-label={hideLabel && typeof label === 'string' ? label : undefined}
    >
      {!hideLabel && <Label className={labelClassName}>{label}</Label>}
      <Button className={`${styles.trigger} ${styles[size]}`} onKeyDown={onKeyDown}>
        <SelectValue className={styles.value} />
        <ExpandMoreIcon className={styles.chevron} aria-hidden="true" />
      </Button>
      <Popover className={styles.popover} offset={4}>
        <ListBox className={styles.list}>
          {options.map(option => (
            <ListBoxItem key={toKey(option.value)} id={toKey(option.value)} textValue={option.label} className={styles.option}>
              {({ isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && <CheckIcon className={styles.check} aria-hidden="true" />}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
