import { createContext, useContext } from 'react';
import { Me } from '../types';
import { ProfilePatch } from '../services/api';

interface AuthContextValue {
  me: Me;
  signOut: () => Promise<void>;
  // Salva no servidor e atualiza a tela (falha com a mensagem do servidor)
  updateMe: (patch: ProfilePatch) => Promise<Me>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro do AuthGate');
  return context;
}
