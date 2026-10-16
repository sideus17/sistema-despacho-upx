import { CallPriority } from '../types';
import { PRIORITY_META } from './calls';

// Sinais de alerta da triagem: cada um sugere uma cor; vale a mais grave marcada.
// Os códigos são os mesmos do backend (backend/src/services/calls.ts). É a classificação inicial:
// a final é do médico regulador.
export interface TriageSignal {
  code: string;
  label: string;
  priority: CallPriority;
}

export const TRIAGE_SIGNALS: TriageSignal[] = [
  { code: 'NAO_RESPIRA', label: 'Não respira ou respira com muita dificuldade', priority: CallPriority.EMERGENCIA },
  { code: 'INCONSCIENTE', label: 'Inconsciente ou não responde', priority: CallPriority.EMERGENCIA },
  { code: 'SANGRAMENTO_GRAVE', label: 'Sangramento intenso', priority: CallPriority.EMERGENCIA },
  { code: 'DOR_PEITO', label: 'Dor forte no peito', priority: CallPriority.EMERGENCIA },
  { code: 'AVC', label: 'Sinais de AVC (boca torta, fala enrolada, fraqueza de um lado)', priority: CallPriority.EMERGENCIA },
  { code: 'CONVULSAO', label: 'Convulsão agora', priority: CallPriority.EMERGENCIA },
  { code: 'FALTA_AR', label: 'Falta de ar', priority: CallPriority.URGENTE },
  { code: 'TRAUMA', label: 'Trauma (queda, atropelamento, acidente de trânsito)', priority: CallPriority.URGENTE },
  { code: 'PARTO', label: 'Trabalho de parto', priority: CallPriority.URGENTE },
  { code: 'DESMAIO', label: 'Desmaio que já passou', priority: CallPriority.URGENTE },
  { code: 'DOR_INTENSA', label: 'Dor intensa', priority: CallPriority.URGENTE },
  { code: 'FEBRE', label: 'Febre', priority: CallPriority.PRIORITARIO },
  { code: 'VOMITO', label: 'Vômitos ou diarreia', priority: CallPriority.PRIORITARIO },
  { code: 'FERIMENTO_LEVE', label: 'Ferimento leve', priority: CallPriority.PRIORITARIO },
  { code: 'DOR_LEVE', label: 'Dor leve ou moderada', priority: CallPriority.PRIORITARIO }
];

const BY_CODE = new Map(TRIAGE_SIGNALS.map(signal => [signal.code, signal]));

// A cor mais grave entre os sinais marcados; sem sinal, nenhuma (o operador escolhe)
export function suggestPriority(codes: string[]): CallPriority | null {
  return codes
    .map(code => BY_CODE.get(code)?.priority)
    .filter((priority): priority is CallPriority => !!priority)
    .reduce<CallPriority | null>(
      (worst, priority) => (worst === null || PRIORITY_META[priority].order < PRIORITY_META[worst].order ? priority : worst),
      null
    );
}

// "Dor forte no peito, Falta de ar" (código desconhecido de uma versão nova fica de fora)
export function signalsText(codes: string[] = []): string {
  return codes.map(code => BY_CODE.get(code)?.label).filter(Boolean).join(', ');
}
