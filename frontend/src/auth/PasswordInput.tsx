import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { HidePasswordIcon, ShowPasswordIcon } from '../ui/icons';

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

  // Espaço para o olho à direita do texto: o ! vence o padding dos campos de cada tela
  return (
    <span className="relative block w-full">
      <input {...props} ref={inputRef} type={visible ? 'text' : 'password'} className={`w-full pr-12! ${className ?? ''}`} />
      <button
        type="button"
        className="absolute top-1/2 right-0.5 inline-flex size-touch -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[20px] text-text-muted hover:text-text aria-pressed:text-text"
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
