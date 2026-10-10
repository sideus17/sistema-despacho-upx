import { useEffect, useState } from 'react';
import { Coordinates, IncidentType } from '../../types';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import { INCIDENT_LABEL } from '../../map/incidents';
import { IncidentIcon } from '../../ui/IncidentIcon';
import { ReportOutcome, submitReport } from './reportQueue';
import styles from './ReportSheet.module.css';

const REPORT_TYPES = [IncidentType.ALAGAMENTO, IncidentType.QUEDA_ARVORE, IncidentType.VIA_BLOQUEADA, IncidentType.ACIDENTE];
// Sem toque, a folha fecha sozinha para não ficar sobre o mapa
const AUTO_CLOSE_MS = 12000;

interface ReportSheetProps {
  getPosition: () => Promise<Coordinates | null>;
  onClose: () => void;
  onReported?: (outcome: ReportOutcome) => void;
  speak?: (text: string) => void;
}

// Relato com um toque: o local é o GPS da viatura
export default function ReportSheet({ getPosition, onClose, onReported, speak }: ReportSheetProps) {
  const [sending, setSending] = useState<IncidentType | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (sending) return;
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [sending, onClose]);

  const report = async (type: IncidentType) => {
    const label = INCIDENT_LABEL[type];
    setSending(type);
    try {
      const position = await getPosition();
      if (!position) {
        toast('Não foi possível obter sua localização. Confira o GPS.', 'error');
        return;
      }

      const outcome = await submitReport(type, position);
      if (outcome.status === 'queued') {
        toast(`Sem sinal: ${label.toLowerCase()} guardado e enviado quando a conexão voltar.`, 'info');
        speak?.('Relato guardado');
      } else if (outcome.result.merged) {
        toast(`${label} já estava marcado ali: sua confirmação foi registrada.`, 'success');
        speak?.('Confirmação registrada');
      } else {
        toast(`${label} relatado. As outras viaturas serão avisadas.`, 'success');
        speak?.(`${label} relatado`);
      }
      onReported?.(outcome);
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível enviar o relato.'), 'error');
    } finally {
      setSending(null);
      onClose();
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.sheet} role="dialog" aria-label="Relatar ocorrência" onClick={event => event.stopPropagation()}>
        <h2>O que tem na via?</h2>
        <p className={styles.hint}>Um toque basta. Se puder, peça ao parceiro de guarnição.</p>
        <div className={styles.grid}>
          {REPORT_TYPES.map(type => (
            <button key={type} className={styles.option} disabled={!!sending} onClick={() => report(type)}>
              <span className={styles.optionIcon}><IncidentIcon type={type} /></span>
              {sending === type ? 'Enviando…' : INCIDENT_LABEL[type]}
            </button>
          ))}
        </div>
        <button className={styles.cancel} disabled={!!sending} onClick={onClose}>Cancelar</button>
      </section>
    </div>
  );
}
