import { setThemePreference, THEME_OPTIONS, useTheme } from './theme';
import styles from './ThemePicker.module.css';

// Automático · Claro · Escuro, lado a lado
export function ThemePicker() {
  const { preference } = useTheme();
  return (
    <div className={styles.picker} role="group" aria-label="Tema">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-pressed={preference === value}
          onClick={() => setThemePreference(value)}
        >
          <Icon /> {label}
        </button>
      ))}
    </div>
  );
}
