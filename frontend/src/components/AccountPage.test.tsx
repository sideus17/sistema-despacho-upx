import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMe } from '../services/api';
import { supabase } from '../lib/supabase';
import { Me, UserRole } from '../types';
import { OPERATOR, renderWithAuth } from '../test/renderWithAuth';
import { squarePhoto } from '../utils/photo';
import { AccountPage } from './AccountPage';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getMe: vi.fn()
}));

vi.mock('../utils/photo', () => ({ squarePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/webp' })) }));

const storage = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ data: {}, error: null })),
  remove: vi.fn(async () => ({ data: [], error: null }))
}));

vi.mock('../lib/supabase', () => ({
  AVATAR_BUCKET: 'avatars',
  avatarUrl: (path: string) => `https://fotos.test/${path}`,
  supabase: {
    storage: { from: () => storage },
    auth: {
      mfa: {
        listFactors: vi.fn(async () => ({ data: { totp: [{ id: 'fator-1', status: 'verified' }] }, error: null })),
        challengeAndVerify: vi.fn(async () => ({ data: {}, error: null }))
      },
      updateUser: vi.fn(async () => ({ data: {}, error: null }))
    }
  }
}));

const DRIVER: Me = {
  ...OPERATOR,
  fullName: 'Lucas Martins',
  role: UserRole.MOTORISTA
};

// A página busca o perfil completo ao abrir (o CPF não fica no aparelho)
async function openPage(profile: Me = OPERATOR) {
  vi.mocked(getMe).mockResolvedValue(profile);
  const onClose = vi.fn();
  const view = renderWithAuth(<AccountPage onClose={onClose} />, profile);
  await screen.findByText('Foto do perfil');
  return { ...view, onClose, user: userEvent.setup() };
}

beforeEach(() => {
  vi.mocked(getMe).mockReset();
  vi.mocked(supabase.auth.updateUser).mockClear();
  vi.mocked(supabase.auth.mfa.challengeAndVerify).mockClear();
  storage.upload.mockClear();
  storage.remove.mockClear();
});

describe('Minha conta', () => {
  it('dados só para leitura; o CPF fica oculto até tocar no olho', async () => {
    const { user } = await openPage();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.queryByText('529.982.247-25')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar CPF' }));
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ocultar CPF' }));
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
  });

  it('"Editar" abre os campos; salvar manda só o que mudou e volta para a leitura, sem fechar', async () => {
    const { user, auth, onClose } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    expect(screen.getByDisplayValue('529.982.247-25')).toHaveAttribute('type', 'password');

    const phone = screen.getByDisplayValue('(15) 99123-4567');
    await user.clear(phone);
    await user.type(phone, '15988887777');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(auth.updateMe).toHaveBeenCalledWith({ phone: '15988887777' });
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByText('(15) 98888-7777')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Cancelar" descarta a edição', async () => {
    const { user, auth } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByDisplayValue('(15) 99123-4567'));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('(15) 99123-4567')).toBeInTheDocument();
    expect(auth.updateMe).not.toHaveBeenCalled();
  });

  it('a cor salva ao tocar', async () => {
    const { user, auth } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Turquesa' }));
    expect(auth.updateMe).toHaveBeenCalledWith({ avatarColor: 'turquesa' });
  });

  it('a foto vai para a pasta da pessoa no Storage e o perfil guarda o caminho', async () => {
    const { user, auth, container } = await openPage({ ...OPERATOR, avatarPhoto: `${OPERATOR.id}/antiga.webp` });
    const file = new File(['foto'], 'eu.jpg', { type: 'image/jpeg' });
    await user.upload(container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(squarePhoto).toHaveBeenCalledWith(file);
    const [path] = storage.upload.mock.calls[0] as unknown as [string];
    expect(path).toMatch(new RegExp(`^${OPERATOR.id}/\\d+\\.webp$`));
    expect(auth.updateMe).toHaveBeenCalledWith({ avatarPhoto: path });
    expect(storage.remove).toHaveBeenCalledWith([`${OPERATOR.id}/antiga.webp`]);
    expect(await screen.findByText('Foto atualizada.')).toBeInTheDocument();
  });

  it('remover a foto volta às iniciais', async () => {
    const { user, auth } = await openPage({ ...OPERATOR, avatarPhoto: `${OPERATOR.id}/antiga.webp` });
    await user.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(auth.updateMe).toHaveBeenCalledWith({ avatarPhoto: null });
    expect(storage.remove).toHaveBeenCalledWith([`${OPERATOR.id}/antiga.webp`]);
  });

  it('conta antiga: já abre editando, avisa o que falta e não aceita CPF inválido', async () => {
    const { user, auth } = await openPage({ ...OPERATOR, cpf: null, phone: null, missing: ['cpf', 'phone'] });
    expect(screen.getByText('Complete seu cadastro: faltam CPF e celular.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '12345678900');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByText('CPF inválido. Confira os números.')).toBeInTheDocument();
    expect(auth.updateMe).not.toHaveBeenCalled();
  });

  it('erro do servidor aparece na página e ela continua aberta', async () => {
    const { user, auth, onClose } = await openPage({ ...OPERATOR, cpf: null, missing: ['cpf'] });
    auth.updateMe.mockRejectedValueOnce({ response: { data: { error: 'Este CPF já está cadastrado em outra conta.' } } });

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Este CPF já está cadastrado em outra conta.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('motorista não vê mais a CNH (o grupo decidiu que não é pedida)', async () => {
    await openPage(DRIVER);
    expect(screen.queryByRole('region', { name: 'CNH' })).not.toBeInTheDocument();
    expect(screen.queryByText(/CNH/)).not.toBeInTheDocument();
  });

  it('troca de senha sem a antiga: confere a confirmação e pede o código do autenticador', async () => {
    const { user } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nova senha (mínimo 8 caracteres)', { selector: 'input' }), 'senha-nova-1');
    await user.type(screen.getByLabelText('Confirme a nova senha', { selector: 'input' }), 'senha-nova-2');
    await user.type(screen.getByLabelText(/Código do app autenticador/), '123456');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(screen.getByText('As senhas novas não conferem.')).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirme a nova senha', { selector: 'input' }));
    await user.type(screen.getByLabelText('Confirme a nova senha', { selector: 'input' }), 'senha-nova-1');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'fator-1', code: '123456' });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-nova-1' });
  });

  it('código errado não troca a senha', async () => {
    vi.mocked(supabase.auth.mfa.challengeAndVerify).mockResolvedValueOnce({ data: null, error: { message: 'Invalid TOTP code' } } as never);
    const { user } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await user.type(screen.getByLabelText('Nova senha (mínimo 8 caracteres)', { selector: 'input' }), 'senha-nova-1');
    await user.type(screen.getByLabelText('Confirme a nova senha', { selector: 'input' }), 'senha-nova-1');
    await user.type(screen.getByLabelText(/Código do app autenticador/), '000000');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Código incorreto. Confira o app autenticador.')).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('Esc fecha a página', async () => {
    const { user, onClose } = await openPage();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
