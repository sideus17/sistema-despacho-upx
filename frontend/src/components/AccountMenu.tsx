import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../ui/Avatar';
import { CloseIcon, EndShiftIcon, LogoutIcon, WarningIcon } from '../ui/icons';
import { useFocusTrap } from '../ui/useFocusTrap';
import { ThemePicker } from '../theme/ThemePicker';
import { AccountPage, ROLE_LABEL } from './AccountPage';
import styles from './AccountMenu.module.css';

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
  const [pageOpen, setPageOpen] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const incomplete = (me.missing?.length ?? 0) > 0;

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setConfirmingEnd(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Esc fecha e o Tab circula só dentro do menu
  useFocusTrap(panelRef, open, close);

  // Tocar fora fecha
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open, close]);

  const openPage = () => {
    close(false);
    setPageOpen(true);
  };

  const closePage = useCallback(() => {
    setPageOpen(false);
    triggerRef.current?.focus();
  }, []);

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

  const avatar = { name: me.fullName, seed: me.id, icon: me.avatar, color: me.avatarColor };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Conta de ${me.fullName}${incomplete ? ' (cadastro incompleto)' : ''}`}
        title={me.fullName}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Avatar {...avatar} size={32} badge={incomplete} />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Sua conta">
          <div className={styles.top}>
            <span className={styles.role}>{me.email ?? ROLE_LABEL[me.role]}</span>
            <button className={styles.close} onClick={() => close()} aria-label="Fechar">
              <CloseIcon />
            </button>
          </div>

          <div className={styles.identity}>
            <Avatar {...avatar} size={72} />
            <p className={styles.greeting}>Olá, {me.fullName.split(' ')[0]}!</p>
            <p className={styles.fullName}>{me.fullName} · {ROLE_LABEL[me.role]}</p>
            <button className={styles.manage} onClick={openPage}>Gerenciar sua conta</button>
          </div>

          {incomplete && (
            <button className={`${styles.item} ${styles.itemAlert}`} onClick={openPage}>
              <WarningIcon /> Complete seu cadastro
            </button>
          )}

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
            <p>Rotas: Valhalla. Alertas: CEMADEN/MCTI, Defesa Civil e SGB/CPRM. Trânsito: © TomTom. Mapa: OpenFreeMap, OpenMapTiles e OpenStreetMap.</p>
          </details>
        </div>
      )}

      {/* Fora do topo: a página cobre a tela toda, inclusive no app da equipe */}
      {pageOpen && createPortal(<AccountPage onClose={closePage} />, document.body)}
    </div>
  );
}
