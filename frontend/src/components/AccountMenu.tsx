import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types';
import { Avatar } from '../ui/Avatar';
import { CloseIcon, EndShiftIcon, LogoutIcon } from '../ui/icons';
import { ThemePicker } from '../theme/ThemePicker';
import styles from './AccountMenu.module.css';

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.OPERADOR]: 'Operador da central',
  [UserRole.MOTORISTA]: 'Motorista'
};

const FOCUSABLE = 'button:not([disabled]), a[href], summary, input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface AccountMenuProps {
  onSignOut: () => void | Promise<void>;
  // Por que sair (e encerrar o turno) não é possível agora, ex.: atendimento em andamento
  blockedReason?: string;
  // Só no app da equipe, com turno aberto
  shift?: { code: string; onEnd: () => Promise<void> };
}

// Bolinha do usuário no canto do topo; ao tocar, abre o menu da conta (como no Google)
export function AccountMenu({ onSignOut, blockedReason, shift }: AccountMenuProps) {
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setConfirmingEnd(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Fecha ao tocar fora ou com Esc; o Tab circula só dentro do menu
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const handlePointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const handleEndShift = async () => {
    if (!shift) return;
    setBusy(true);
    try {
      await shift.onEnd();
      close(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await onSignOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Conta de ${me.fullName}`}
        title={me.fullName}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Avatar name={me.fullName} seed={me.id} size={32} />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Sua conta">
          <div className={styles.top}>
            <span className={styles.role}>{ROLE_LABEL[me.role]}</span>
            <button className={styles.close} onClick={() => close()} aria-label="Fechar">
              <CloseIcon />
            </button>
          </div>

          <div className={styles.identity}>
            <Avatar name={me.fullName} seed={me.id} size={72} />
            <p className={styles.greeting}>Olá, {me.fullName.split(' ')[0]}!</p>
            <p className={styles.fullName}>{me.fullName}</p>
          </div>

          <section className={styles.section} aria-label="Aparência">
            <h3 className={styles.sectionTitle}>Tema</h3>
            <ThemePicker />
          </section>

          <div className={styles.actions}>
            {shift && (confirmingEnd ? (
              <div className={styles.confirm}>
                <p>Encerrar o turno na {shift.code}?</p>
                <div className={styles.confirmRow}>
                  <button className={styles.danger} disabled={busy} onClick={handleEndShift} autoFocus>
                    {busy ? 'Encerrando…' : 'Encerrar'}
                  </button>
                  <button className={styles.secondary} disabled={busy} onClick={() => setConfirmingEnd(false)}>
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.item} disabled={!!blockedReason} onClick={() => setConfirmingEnd(true)}>
                <EndShiftIcon /> Encerrar turno <small>{shift.code}</small>
              </button>
            ))}
            <button className={styles.item} disabled={!!blockedReason || busy} onClick={handleSignOut}>
              <LogoutIcon /> Sair
            </button>
            {blockedReason && <p className={styles.blocked}>{blockedReason}</p>}
          </div>

          <details className={styles.about}>
            <summary>Sobre o SAMU Despacho</summary>
            <p>Projeto acadêmico da Usina de Projetos Experimentais.</p>
            <p>
              A sugestão de viatura soma distância (40%), disponibilidade (30%), tipo de viatura (20%)
              e ocorrências na rota (10%).
            </p>
            <p>Rotas: Valhalla. Alertas: CEMADEN/MCTI, Defesa Civil e SGB/CPRM. Mapa: OpenFreeMap, OpenMapTiles e OpenStreetMap.</p>
          </details>
        </div>
      )}
    </div>
  );
}
