import { useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, SortIcon } from '../../ui/icons';

// Ordenação das tabelas da gestão: cabeçalho com botão e aria-sort (padrão "tabela ordenável" do WAI-ARIA)
export type SortDirection = 'ascending' | 'descending';
export interface Sort<K extends string> {
  key: K;
  direction: SortDirection;
}
export type SortValue = string | number | null;

// Ordena no navegador; vazio (null) sempre por último, nas duas direções
export function sortRows<T, K extends string>(rows: T[], sort: Sort<K> | null, value: (row: T, key: K) => SortValue): T[] {
  if (!sort) return rows;
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR'));
  });
}

// Clicar de novo na mesma coluna inverte; numa coluna nova começa do menor para o maior
export function useSort<K extends string>(initial: Sort<K> | null = null) {
  const [sort, setSort] = useState(initial);
  const toggle = (key: K) =>
    setSort(current => ({ key, direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }));
  return [sort, toggle] as const;
}

const button =
  'inline-flex cursor-pointer items-center gap-0.5 text-left whitespace-nowrap hover:text-text [&_.icon]:text-[16px] [&_.icon]:align-[0]';

export function SortHeader({ label, title, direction, onSort }: {
  label: string;
  title?: string;
  direction: SortDirection | undefined;
  onSort: () => void;
}) {
  const Icon = direction === 'ascending' ? ArrowUpIcon : direction === 'descending' ? ArrowDownIcon : SortIcon;
  return (
    <th scope="col" title={title} aria-sort={direction}>
      <button type="button" className={`${button} ${direction ? 'text-text' : ''}`} onClick={onSort}>
        {label}
        <Icon aria-hidden="true" className={`icon ${direction ? '' : 'opacity-45'}`} />
      </button>
    </th>
  );
}
