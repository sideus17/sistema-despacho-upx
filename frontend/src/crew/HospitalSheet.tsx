import { useRef, useState } from 'react';
import { Coordinates, Hospital } from '../types';
import { getErrorMessage, setCallHospital } from '../services/api';
import { useToast } from '../components/Toast';
import { HOSPITAL_KIND_LABEL, formatKm, hospitalsByDistance } from '../utils/hospitals';
import { useFocusTrap, useRestoreFocus } from '../ui/useFocusTrap';
import { styles } from './HospitalSheet.styles';

interface HospitalSheetProps {
  callId: string;
  hospitals: Hospital[];
  current?: string; // escolhido pela central ou antes
  from: Coordinates; // onde a viatura está
  onClose: () => void;
  onChosen: () => void;
}

// Hospital de destino: do mais perto para o mais longe; a central vê a escolha na hora
export default function HospitalSheet({ callId, hospitals, current, from, onClose, onChosen }: HospitalSheetProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useToast();
  const sheetRef = useRef<HTMLElement>(null);
  // Folha modal: o foco fica nela, Esc fecha e, ao fechar, volta ao botão que abriu
  useRestoreFocus();
  useFocusTrap(sheetRef, true, onClose);

  const choose = async (hospital: Hospital) => {
    setSaving(hospital.id);
    try {
      await setCallHospital(callId, hospital.id);
      toast(`Destino: ${hospital.shortName}`, 'success');
      onChosen();
      onClose();
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível escolher o hospital.'), 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Hospital de destino"
        onClick={event => event.stopPropagation()}
      >
        <h2>Hospital de destino</h2>
        <p className={styles.hint}>Do mais perto para o mais longe. A central vê a escolha.</p>
        <ul className={styles.list}>
          {hospitalsByDistance(hospitals, from).map(({ hospital, meters }) => (
            <li key={hospital.id}>
              <button
                className={styles.option}
                aria-pressed={hospital.id === current}
                disabled={!!saving}
                onClick={() => choose(hospital)}
              >
                <span className={styles.badge} aria-hidden="true">H</span>
                <span className={styles.text}>
                  <strong>{saving === hospital.id ? 'Salvando…' : hospital.shortName}</strong>
                  <small>{HOSPITAL_KIND_LABEL[hospital.kind]} · {formatKm(meters)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button className={styles.cancel} disabled={!!saving} onClick={onClose}>Cancelar</button>
      </section>
    </div>
  );
}
