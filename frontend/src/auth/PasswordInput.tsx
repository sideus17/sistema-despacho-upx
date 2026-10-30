import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { HidePasswordIcon, ShowPasswordIcon } from '../ui/icons';
import styles from './PasswordInput.module.css';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  autoComplete: 'current-password' | 'new-password' | 'off';
  // O que o campo esconde, para o rótulo do olho ("Mostrar CPF"); padrão: senha
  secret?: string;
};

/**
 * Campo de senha com o olho para ver o que foi digitado (útil no celular e com senha longa). Ao enviar o
 * formulário, a senha volta a ficar oculta.
 */
export function PasswordInput({ className, secret = 'senha', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, []);

  return (
    <span className={styles.wrap}>
      <input {...props} ref={inputRef} type={visible ? 'text' : 'password'} className={`${styles.input} ${className ?? ''}`} />
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={visible}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${secret}`}
        title={`${visible ? 'Ocultar' : 'Mostrar'} ${secret}`}
        onClick={() => setVisible(value => !value)}
      >
        {/* Olho aberto: senha à vista; fechado: oculta */}
        {visible ? <ShowPasswordIcon /> : <HidePasswordIcon />}
      </button>
    </span>
  );
}
