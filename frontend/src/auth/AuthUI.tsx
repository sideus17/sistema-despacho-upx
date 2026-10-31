import { ReactNode } from 'react';
import { styles } from './authStyles';

export function AuthLayout({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.brand}>
          <img src="/ambulance.svg" alt="" width={44} height={44} />
          <span>SAMU Despacho</span>
        </div>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </main>
    </div>
  );
}

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
}

// Campo do código de 6 dígitos: teclado numérico e preenchimento automático do iOS/Android
export function CodeInput({ value, onChange, onComplete, disabled }: CodeInputProps) {
  return (
    <input
      className={styles.code}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="000000"
      aria-label="Código de 6 dígitos"
      autoFocus
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete(digits);
      }}
    />
  );
}
