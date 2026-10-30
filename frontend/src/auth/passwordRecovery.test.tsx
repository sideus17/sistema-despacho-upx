import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { ToastProvider } from '../components/Toast';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LoginScreen from './LoginScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null }))
    }
  }
}));

beforeEach(() => {
  vi.mocked(supabase.auth.resetPasswordForEmail).mockClear();
  vi.mocked(supabase.auth.updateUser).mockClear();
});

describe('esqueci a senha', () => {
  it('o login leva ao "Esqueci a senha" com o e-mail já digitado', async () => {
    const user = userEvent.setup();
    const onForgot = vi.fn();
    render(<LoginScreen onSignup={vi.fn()} onForgot={onForgot} />);
    await user.type(screen.getByLabelText('E-mail'), 'ana@samu.test');
    await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }));
    expect(onForgot).toHaveBeenCalledWith('ana@samu.test');
  });

  it('manda o link de volta para esta tela e responde igual com ou sem conta', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordScreen initialEmail="ana@samu.test" onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@samu.test', {
      redirectTo: `${window.location.origin}/?redefinir-senha`
    });
    expect(screen.getByRole('status')).toHaveTextContent('Se houver uma conta com ana@samu.test, enviamos um link');
  });

  it('limite de envio aparece como erro', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: { message: 'email rate limit exceeded', status: 429 }
    } as never);
    const user = userEvent.setup();
    render(<ForgotPasswordScreen initialEmail="ana@samu.test" onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Muitas tentativas seguidas');
  });
});

describe('senha nova pelo link', () => {
  it('confere o mínimo e a confirmação antes de salvar', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ToastProvider><ResetPasswordScreen onDone={onDone} onCancel={vi.fn()} /></ToastProvider>);
    const [password, confirm] = screen.getAllByLabelText(/senha/i, { selector: 'input' });

    await user.type(password, 'curta');
    await user.type(confirm, 'curta');
    await user.click(screen.getByRole('button', { name: 'Salvar senha nova' }));
    expect(screen.getByRole('alert')).toHaveTextContent('pelo menos 8 caracteres');

    await user.clear(password);
    await user.clear(confirm);
    await user.type(password, 'senha-nova-123');
    await user.type(confirm, 'senha-nova-123');
    await user.click(screen.getByRole('button', { name: 'Salvar senha nova' }));
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-nova-123' });
    expect(onDone).toHaveBeenCalled();
  });
});
