import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { ToastProvider } from '../components/Toast';
import { Me, UserRole } from '../types';

export const OPERATOR: Me = {
  id: '16be30e7-6cb1-4901-af83-71ce499c4056',
  fullName: 'Ana Souza',
  role: UserRole.OPERADOR,
  email: 'ana@samu.test',
  cpf: '52998224725',
  phone: '15991234567',
  cnh: null,
  avatar: null,
  avatarColor: null,
  theme: 'auto',
  missing: []
};

// Tela dentro do AuthGate de mentira: quem entrou é `me`; signOut e updateMe são espiões
export function renderWithAuth(ui: ReactElement, me: Partial<Me> = {}) {
  const auth = {
    me: { ...OPERATOR, ...me },
    signOut: vi.fn(async () => {}),
    updateMe: vi.fn(async (patch: object) => ({ ...OPERATOR, ...me, ...patch }) as Me)
  };
  const view = render(
    <ToastProvider>
      <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
    </ToastProvider>
  );
  return { ...view, auth };
}
