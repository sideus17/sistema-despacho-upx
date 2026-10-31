import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { CheckCircleIcon, CloseIcon, ErrorIcon, IconComponent, InfoIcon } from '../ui/icons';
import { styles } from './Toast.styles';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Timers dos avisos que somem sozinhos: cancelados se o provedor sair da tela antes
  const timers = useRef(new Set<number>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(timer => window.clearTimeout(timer));
  }, []);

  const dismiss = useCallback((id: number) => setToasts(current => current.filter(t => t.id !== id)), []);

  // Sucesso e informação somem em 4 s; erro fica até alguém fechar (quem digita olha o teclado, não o topo)
  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts(current => {
      const others = current.filter(t => !(t.type === type && t.message === message));
      const errors = others.filter(t => t.type === 'error');
      // No máximo 3 erros abertos: o mais antigo sai
      const kept = type === 'error' && errors.length >= 3 ? others.filter(t => t.id !== errors[0].id) : others;
      return [...kept, { id, type, message }];
    });
    if (type !== 'error') {
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, 4000);
      timers.current.add(timer);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.container}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={styles[toast.type]}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <ToastIcon type={toast.type} />
            <span className={styles.message}>{toast.message}</span>
            {toast.type === 'error' && (
              <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Fechar aviso">
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// O tipo do aviso aparece no ícone, não só na cor
const TOAST_ICON: Record<ToastType, IconComponent> = { success: CheckCircleIcon, error: ErrorIcon, info: InfoIcon };

function ToastIcon({ type }: { type: ToastType }) {
  const Icon = TOAST_ICON[type];
  return <Icon className={`icon ${styles.typeIcon}`} aria-hidden="true" />;
}

export const useToast = () => useContext(ToastContext);
