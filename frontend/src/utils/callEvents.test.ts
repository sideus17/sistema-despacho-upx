import { describe, expect, it } from 'vitest';
import { CallEvent, CallEventAction, CallPriority, CallStatus, CloseReason, EmergencyCall, Hospital, RegulationDecision, UserRole } from '../types';
import { callTimeline } from './callEvents';

const T0 = '2026-10-17T12:00:00.000Z';
const at = (seconds: number) => new Date(Date.parse(T0) + seconds * 1000).toISOString();

const CALL: EmergencyCall = {
  id: 'call-1',
  priority: CallPriority.EMERGENCIA,
  initialPriority: CallPriority.URGENTE,
  status: CallStatus.FINALIZADO,
  timestamp: T0,
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua da Penha, 120',
  description: '',
  patientInfo: { symptoms: '' },
  times: { regulated: at(60), dispatched: at(120), enRoute: at(150), onScene: at(600), finished: at(1800) }
};

const ANA = { id: 'u-1', name: 'Ana Souza', role: UserRole.OPERADOR };
const JOAO = { id: 'u-2', name: 'João Lima', role: UserRole.MOTORISTA };
const HOSPITALS = [{ id: 'hosp-chs', shortName: 'Conjunto Hospitalar' } as Hospital];

const event = (id: number, action: CallEventAction, seconds: number, actor: CallEvent['actor'], data: Record<string, unknown> = {}): CallEvent => ({
  id,
  action,
  at: at(seconds),
  actor,
  data
});

describe('linha do tempo com quem fez cada passo', () => {
  it('junta as ações das pessoas e as etapas do GPS, na ordem', () => {
    const events = [
      event(1, CallEventAction.ABERTURA, 0, ANA, { priority: 'URGENTE' }),
      event(2, CallEventAction.REGULACAO, 60, ANA, {
        decision: RegulationDecision.DESPACHAR,
        changes: { status: ['AGUARDANDO_REGULACAO', 'PENDENTE'], priority: ['URGENTE', 'EMERGENCIA'], hospitalId: [null, 'hosp-chs'] }
      }),
      event(3, CallEventAction.DESPACHO, 120, ANA, { ambulanceCode: 'USA-01', driverName: 'João Lima' }),
      event(4, CallEventAction.FINALIZACAO, 1800, JOAO, { outcome: 'ATENDIDO_NO_LOCAL' })
    ];
    const steps = callTimeline(CALL, events, HOSPITALS);
    expect(steps.map(step => [step.label, step.who, step.detail])).toEqual([
      ['Abertura do chamado', 'Ana Souza · atendente', 'Cor sugerida: Amarelo'],
      ['Regulação', 'Ana Souza · atendente', 'Amarelo → Vermelho · Destino: Conjunto Hospitalar'],
      ['Despacho', 'Ana Souza · atendente', 'USA-01 · motorista João Lima'],
      ['Saída da viatura', 'GPS da viatura', undefined],
      ['Chegada ao local', 'GPS da viatura', undefined],
      ['Fim do atendimento', 'João Lima · motorista', 'Atendido no local']
    ]);
    expect(steps[0].since).toBeNull();
    expect(steps[2].since).toBe(120);
  });

  it('reclassificação, troca de hospital e cancelamento', () => {
    const events = [
      event(1, CallEventAction.REGULACAO, 60, ANA, { decision: 'DESPACHAR', changes: { status: ['AGUARDANDO_REGULACAO', 'PENDENTE'] } }),
      event(2, CallEventAction.REGULACAO, 90, ANA, { decision: 'DESPACHAR', changes: { priority: ['EMERGENCIA', 'URGENTE'] } }),
      event(3, CallEventAction.HOSPITAL, 100, JOAO, { changes: { hospitalId: ['hosp-chs', null] } }),
      event(4, CallEventAction.REGULACAO, 110, ANA, { decision: 'CANCELAR', reason: CloseReason.REPETIDO, note: 'Já atendido pela USB-02' })
    ];
    const steps = callTimeline({ ...CALL, times: undefined }, events, HOSPITALS);
    expect(steps.map(step => [step.label, step.detail])).toEqual([
      ['Abertura do chamado', undefined],
      ['Regulação', 'Cor confirmada'],
      ['Reclassificação', 'Vermelho → Amarelo'],
      ['Hospital de destino', 'sem escolha'],
      ['Cancelamento', 'Chamado repetido · Já atendido pela USB-02']
    ]);
  });

  it('chamado de antes da auditoria: os horários do próprio chamado, sem autor', () => {
    const steps = callTimeline(CALL, []);
    expect(steps.map(step => [step.label, step.who])).toEqual([
      ['Abertura do chamado', undefined],
      ['Regulação', undefined],
      ['Despacho', undefined],
      ['Saída da viatura', 'GPS da viatura'],
      ['Chegada ao local', 'GPS da viatura'],
      ['Fim do atendimento', undefined]
    ]);
  });

  it('orientado por telefone: o encerramento não vira "fim do atendimento"', () => {
    const steps = callTimeline({ ...CALL, status: CallStatus.ORIENTADO, times: { regulated: at(60), finished: at(60) } }, [
      event(1, CallEventAction.REGULACAO, 60, ANA, { decision: 'ORIENTACAO', note: 'Procurar a UBS' })
    ]);
    expect(steps.map(step => [step.label, step.detail])).toEqual([
      ['Abertura do chamado', undefined],
      ['Orientação por telefone', 'Procurar a UBS']
    ]);
  });
});
