import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CallOutcome } from '../types';
import { OutcomeChoice } from './OutcomeChoice';

describe('desfecho do atendimento', () => {
  it('os desfechos comuns finalizam num toque', () => {
    const onChoose = vi.fn();
    render(<OutcomeChoice busy={false} onChoose={onChoose} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atendido no local' }));
    expect(onChoose).toHaveBeenCalledWith(CallOutcome.ATENDIDO_NO_LOCAL);
  });

  it('óbito pede confirmação e dá para voltar', () => {
    const onChoose = vi.fn();
    render(<OutcomeChoice busy={false} onChoose={onChoose} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Óbito' }));
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('button', { name: 'Atendido no local' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Óbito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar óbito' }));
    expect(onChoose).toHaveBeenCalledWith(CallOutcome.OBITO);
  });
});
