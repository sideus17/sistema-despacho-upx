import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { UserRole } from '../types';

export interface AuthUser {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const PROFILE_CACHE_MS = 60_000;
const profileCache = new Map<string, { user: AuthUser; expires: number }>();

// Depois de editar o perfil, a próxima requisição já lê o nome novo
export function invalidateProfile(userId: string) {
  profileCache.delete(userId);
}

function deny(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error, timestamp: new Date().toISOString() });
}

/**
 * Exige um token válido do Supabase com MFA concluído (aal2) e carrega o perfil do usuário.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return deny(res, 401, 'Faça login para continuar.');

  try {
    // Valida assinatura e expiração do token
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return deny(res, 401, 'Sessão inválida ou expirada. Entre novamente.');
    if (data.claims.aal !== 'aal2') return deny(res, 403, 'MFA obrigatório. Confirme o código do app autenticador.');

    const userId = data.claims.sub;
    const email = typeof data.claims.email === 'string' ? data.claims.email : undefined;
    const cached = profileCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      req.user = { ...cached.user, email };
      return next();
    }

    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', userId).single();
    if (!profile) return deny(res, 403, 'Perfil não encontrado.');

    const user: AuthUser = { id: profile.id, fullName: profile.full_name, role: profile.role };
    profileCache.set(userId, { user, expires: Date.now() + PROFILE_CACHE_MS });
    req.user = { ...user, email };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    deny(res, 401, 'Não foi possível validar a sessão.');
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return deny(res, 403, 'Ação não permitida para o seu perfil.');
    }
    next();
  };
}
