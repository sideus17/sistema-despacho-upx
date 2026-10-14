import { setThemePreference, THEME_OPTIONS, ThemePreference } from '../theme/theme';
import styles from './ThemeSwitch.module.css';

// Seletor sobre o mapa da central
export function ThemeSwitch({ preference, className = '' }: { preference: ThemePreference; className?: string }) {
  return (
    <div className={`${styles.switch} ${className}`} role="group" aria-label="Tema">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          className={styles.option}
          aria-pressed={preference === value}
          aria-label={`Tema: ${label}`}
          title={`Tema: ${label}`}
          onClick={() => setThemePreference(value)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
