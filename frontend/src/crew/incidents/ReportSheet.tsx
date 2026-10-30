import { useEffect, useRef, useState } from 'react';
import { Coordinates, IncidentType } from '../../types';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../components/Toast';
import { incidentTypeLabel } from '../../map/incidents';
import { IncidentIcon } from '../../ui/IncidentIcon';
import { ReportOutcome, submitReport } from './reportQueue';
import { useFocusTrap, useRestoreFocus } from '../../ui/useFocusTrap';
import styles from './ReportSheet.module.css';

// Como no Waze: o que bloqueia ou atrasa primeiro, depois o que só pede atenção
const REPORT_TYPES = [
  IncidentType.ACIDENTE,
  IncidentType.CONGESTIONAMENTO,
  IncidentType.VIA_BLOQUEADA,
  IncidentType.ALAGAMENTO,
  IncidentType.QUEDA_ARVORE,
  IncidentType.OBRAS,
  IncidentType.VEICULO_PARADO,
  IncidentType.PERIGO_NA_VIA,
  IncidentType.SEMAFORO_QUEBRADO
];
// Sem toque, a folha fecha sozinha para não ficar sobre o mapa
const AUTO_CLOSE_MS = 12000;

interface ReportSheetProps {
  getPosition: () => Promise<Coordinates | null>;
  onClose: () => void;
  onReported?: (outcome: ReportOutcome) => void;
  speak?: (text: string) => void;
}

// Hífen opcional: "Congestionamento" não cabe inteiro no botão de um celular estreito
const fitLabel = (label: string) => label.replace('Congestionamento', 'Conges­tionamento');

// Relato com um toque: o local é o GPS da viatura
export default function ReportSheet({ getPosition, onClose, onReported, speak }: ReportSheetProps) {
  const [sending, setSending] = useState<IncidentType | null>(null);
  const toast = useToast();
  const sheetRef = useRef<HTMLElement>(null);
  useRestoreFocus();
  useFocusTrap(sheetRef, true, onClose);
  // Foco inicial no Cancelar: um Enter sem querer não relata um Acidente
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);

  // Fecha sozinha se ninguém tocar. O onClose mais recente fica num ref: quem abre a folha passa uma
  // função nova a cada atualização (GPS, lista), e isso não pode reiniciar a contagem
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (sending) return;
    const timer = window.setTimeout(() => closeRef.current(), AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [sending]);

  const report = async (type: IncidentType) => {
    const label = incidentTypeLabel(type);
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
      <section
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Relatar ocorrência"
        onClick={event => event.stopPropagation()}
      >
        <h2>O que tem na via?</h2>
        <p className={styles.hint}>Um toque basta. Se puder, peça ao parceiro de guarnição.</p>
        <div className={styles.grid}>
          {REPORT_TYPES.map(type => (
            <button key={type} className={styles.option} disabled={!!sending} onClick={() => report(type)}>
              <span className={styles.optionIcon}><IncidentIcon type={type} /></span>
              {sending === type ? 'Enviando…' : fitLabel(incidentTypeLabel(type))}
            </button>
          ))}
        </div>
        <button ref={cancelRef} className={styles.cancel} disabled={!!sending} onClick={onClose}>Cancelar</button>
      </section>
    </div>
  );
}
