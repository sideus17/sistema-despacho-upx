import { AutoThemeIcon, DayIcon, IconComponent, NightIcon } from '../ui/icons';
import { setThemePreference, ThemePreference } from './useMapTheme';
import styles from './ThemeSwitch.module.css';

export const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: IconComponent }[] = [
  { value: 'auto', label: 'Automático', Icon: AutoThemeIcon },
  { value: 'day', label: 'Dia', Icon: DayIcon },
  { value: 'night', label: 'Noite', Icon: NightIcon }
];

// Botão único (painel da navegação): Automático → Dia → Noite
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_OPTIONS.findIndex(option => option.value === current);
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length].value;
}

// Seletor sobre o mapa da central
export function ThemeSwitch({ preference, className = '' }: { preference: ThemePreference; className?: string }) {
  return (
    <div className={`${styles.switch} ${className}`} role="group" aria-label="Tema do mapa">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          className={styles.option}
          aria-pressed={preference === value}
          aria-label={`Mapa: ${label}`}
          title={`Mapa: ${label}`}
          onClick={() => setThemePreference(value)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
