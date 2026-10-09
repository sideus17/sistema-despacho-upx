import { createContext, useContext } from 'react';
import { Me } from '../types';

interface AuthContextValue {
  me: Me;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro do AuthGate');
  return context;
}
