import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AVATAR_COLORS, colorFromSeed, initials } from './Avatar';

describe('avatar', () => {
  it('iniciais do primeiro e do último nome', () => {
    expect(initials('Ana Maria de Souza')).toBe('AS');
    expect(initials('  vitor   almeida ')).toBe('VA');
    expect(initials('Lucas')).toBe('L');
    expect(initials('')).toBe('?');
  });

  it('sem cor escolhida, a mesma pessoa tem sempre a mesma cor', () => {
    const color = colorFromSeed('16be30e7-6cb1-4901-af83-71ce499c4056');
    expect(colorFromSeed('16be30e7-6cb1-4901-af83-71ce499c4056')).toBe(color);
    expect(Object.keys(AVATAR_COLORS)).toContain(color);
  });

  it('mostra as iniciais ou a figura escolhida, na cor escolhida', () => {
    const { container, rerender } = render(<Avatar name="Ana Souza" seed="x" color="roxo" />);
    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar).toHaveTextContent('AS');
    expect(avatar.style.background).toBe('rgb(132, 48, 206)'); // #8430ce

    rerender(<Avatar name="Ana Souza" seed="x" icon="medica" />);
    expect(avatar).not.toHaveTextContent('AS');
    expect(avatar.querySelector('svg')).not.toBeNull();
  });

  it('ponto vermelho quando falta completar o cadastro', () => {
    const { container, rerender } = render(<Avatar name="Ana" seed="x" />);
    expect(container.querySelectorAll('span span')).toHaveLength(0);
    rerender(<Avatar name="Ana" seed="x" badge />);
    expect(container.querySelectorAll('span span')).toHaveLength(1);
  });
});
