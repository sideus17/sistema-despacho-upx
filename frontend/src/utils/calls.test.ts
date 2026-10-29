import { describe, expect, it } from 'vitest';
import { CallPriority, CallStatus, EmergencyCall } from '../types';
import { CREW_ACK_WAIT_MS, callStage, crewAck, elapsedLabel, formatGender, formatWait, formatWaitShort, lateSummary, queueOf, sortCallsByPriority, timeline, waitLevel, waitSpoken, waitingSince } from './calls';

const call = (id: string, priority: CallPriority, timestamp: string): EmergencyCall => ({
  id,
  priority,
  timestamp,
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua Teste, 1',
  status: CallStatus.PENDENTE,
  description: '',
  patientInfo: { symptoms: '' }
});

describe('fila de chamados', () => {
  it('mais grave primeiro e, na mesma prioridade, quem espera há mais tempo', () => {
    const sorted = sortCallsByPriority([
      call('prioritario', CallPriority.PRIORITARIO, '2026-10-15T10:00:00Z'),
      call('urgente-novo', CallPriority.URGENTE, '2026-10-15T10:05:00Z'),
      call('emergencia', CallPriority.EMERGENCIA, '2026-10-15T10:10:00Z'),
      call('urgente-antigo', CallPriority.URGENTE, '2026-10-15T09:00:00Z')
    ]);
    expect(sorted.map(c => c.id)).toEqual(['emergencia', 'urgente-antigo', 'urgente-novo', 'prioritario']);
  });

  it('não altera a lista original', () => {
    const calls = [call('b', CallPriority.URGENTE, '2026-10-15T10:00:00Z'), call('a', CallPriority.EMERGENCIA, '2026-10-15T10:00:00Z')];
    sortCallsByPriority(calls);
    expect(calls.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('confirmação da equipe: ciente, aguardando ou atrasada depois de 1 min', () => {
    const dispatched = '2026-10-28T21:40:00Z';
    const active = { ...call('a', CallPriority.URGENTE, '2026-10-28T21:38:00Z'), status: CallStatus.EM_ATENDIMENTO, times: { dispatched } };
    const at = (offset: number) => Date.parse(dispatched) + offset;
    expect(crewAck(active, at(30_000))).toEqual({ seen: false, late: false });
    expect(crewAck(active, at(CREW_ACK_WAIT_MS))).toEqual({ seen: false, late: true });
    expect(crewAck({ ...active, times: { dispatched, crewSeen: '2026-10-28T21:40:20Z' } }, at(CREW_ACK_WAIT_MS * 5)))
      .toEqual({ seen: true, at: '2026-10-28T21:40:20Z' });
    expect(crewAck(call('fila', CallPriority.URGENTE, dispatched), at(CREW_ACK_WAIT_MS * 5))).toBeNull();
  });

  it('sexo do paciente por extenso', () => {
    expect(formatGender('M')).toBe('Masculino');
    expect(formatGender('F')).toBe('Feminino');
    expect(formatGender('OUTRO')).toBe('Outro');
    expect(formatGender(undefined)).toBeNull();
  });
});

describe('cronômetro de espera', () => {
  it('amarelo a partir de 2 min, vermelho a partir de 5 min', () => {
    expect(waitLevel(119_000)).toBe('normal');
    expect(waitLevel(120_000)).toBe('atencao');
    expect(waitLevel(299_000)).toBe('atencao');
    expect(waitLevel(300_000)).toBe('critico');
    // A regulação é mais apertada: 1 min e 3 min
    expect(waitLevel(59_000, 'regulacao')).toBe('normal');
    expect(waitLevel(60_000, 'regulacao')).toBe('atencao');
    expect(waitLevel(180_000, 'regulacao')).toBe('critico');
  });

  it('a regulação conta da abertura; o despacho, da regulação', () => {
    const opened = { ...call('a', CallPriority.URGENTE, '2026-10-15T10:00:00Z'), status: CallStatus.AGUARDANDO_REGULACAO };
    expect(queueOf(opened)).toBe('regulacao');
    expect(waitingSince(opened)).toBe('2026-10-15T10:00:00Z');

    const regulated = { ...opened, status: CallStatus.PENDENTE, times: { regulated: '2026-10-15T10:02:00Z' } };
    expect(queueOf(regulated)).toBe('despacho');
    expect(waitingSince(regulated)).toBe('2026-10-15T10:02:00Z');
    // Chamado de antes da regulação: da abertura
    expect(waitingSince({ ...regulated, times: undefined })).toBe('2026-10-15T10:00:00Z');
    expect(queueOf({ ...opened, status: CallStatus.EM_ATENDIMENTO })).toBeNull();
  });

  it('m:ss, e "10 h 45 min" depois de 1 hora', () => {
    expect(formatWait(0)).toBe('0:00');
    expect(formatWait(247_900)).toBe('4:07');
    // Com horas não parece horário: "10 h 45 min", não "10:45:47"
    expect(formatWait((10 * 3600 + 45 * 60 + 47) * 1000)).toBe('10 h 45 min');
    expect(waitSpoken(247_900)).toBe('4 min 7 s');
    expect(waitSpoken(120_000)).toBe('2 min');
    expect(waitSpoken(35_000)).toBe('35 s');
    expect(waitSpoken((10 * 3600 + 45 * 60) * 1000)).toBe('10 h 45 min');
    expect(formatWait(3_729_000)).toBe('1 h 02 min');
    expect(formatWait(-5000)).toBe('0:00');
  });

  it('espera numa frase, sem os segundos', () => {
    expect(formatWaitShort(247_000)).toBe('4 min');
    expect(formatWaitShort(44_880_000)).toBe('12 h 28 min');
  });

  it('resumo da espera longa: a pior espera de verdade em cada fila, e quantos mais passaram do limite', () => {
    const now = Date.parse('2026-10-15T10:10:00Z');
    const opened = (id: string, at: string) => ({ ...call(id, CallPriority.URGENTE, at), status: CallStatus.AGUARDANDO_REGULACAO });
    const calls = [
      opened('a', '2026-10-15T10:00:00Z'),
      opened('b', '2026-10-15T10:06:00Z'),
      // Na regulação há 2 min: ainda não
      opened('c', '2026-10-15T10:08:00Z'),
      { ...opened('d', '2026-10-15T09:50:00Z'), status: CallStatus.PENDENTE, times: { regulated: '2026-10-15T10:04:00Z' } }
    ];
    expect(lateSummary(calls, now)).toEqual([
      'Amarelo aguardando regulação há 10 min · e mais 1 acima de 3 min',
      'Amarelo aguardando despacho há 6 min'
    ]);
    expect(lateSummary([opened('c', '2026-10-15T10:08:00Z')], now)).toEqual([]);
  });
});

describe('azul na fila', () => {
  it('o azul (não urgente) vem depois do verde', () => {
    const calls = [
      call('azul', CallPriority.NAO_URGENTE, '2026-10-16T10:00:00Z'),
      call('verde', CallPriority.PRIORITARIO, '2026-10-16T11:00:00Z')
    ];
    expect(sortCallsByPriority(calls).map(c => c.id)).toEqual(['verde', 'azul']);
  });
});

describe('etapas do atendimento', () => {
  const active = (times: EmergencyCall['times'], hospitalId?: string): EmergencyCall => ({
    ...call('a', CallPriority.URGENTE, '2026-10-16T09:58:00Z'),
    status: CallStatus.EM_ATENDIMENTO,
    times,
    hospitalId
  });

  it('a etapa é a do último horário marcado; saiu do local com hospital é transporte', () => {
    expect(callStage(active({ dispatched: '2026-10-16T10:00:00Z' }))).toEqual({ stage: 'DESPACHADA', since: '2026-10-16T10:00:00Z' });
    expect(callStage(active({ dispatched: '2026-10-16T10:00:00Z', enRoute: '2026-10-16T10:01:00Z' }))?.stage).toBe('A_CAMINHO');
    expect(callStage(active({ onScene: '2026-10-16T10:09:00Z', enRoute: '2026-10-16T10:01:00Z' }))?.stage).toBe('NO_LOCAL');
    expect(callStage(active({ leftScene: '2026-10-16T10:25:00Z' }))?.stage).toBe('SAIU_DO_LOCAL');
    expect(callStage(active({ leftScene: '2026-10-16T10:25:00Z' }, 'hosp-chs'))?.stage).toBe('TRANSPORTANDO');
    expect(callStage(active({ leftScene: '2026-10-16T10:25:00Z', atHospital: '2026-10-16T10:40:00Z' }))?.stage).toBe('NO_HOSPITAL');
  });

  it('despachado antes dos horários existirem conta da abertura; pendente não tem etapa', () => {
    expect(callStage(active(undefined))).toEqual({ stage: 'DESPACHADA', since: '2026-10-16T09:58:00Z' });
    expect(callStage(call('p', CallPriority.URGENTE, '2026-10-16T09:58:00Z'))).toBeNull();
  });

  it('linha do tempo só com o que aconteceu, na ordem', () => {
    const steps = timeline(active({ onScene: '2026-10-16T13:11:00Z', dispatched: '2026-10-16T13:02:00Z' }));
    expect(steps.map(step => step.label)).toEqual(['Despacho', 'Local']);
    expect(steps[0].time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('tempo na etapa', () => {
    const since = '2026-10-16T10:00:00Z';
    const at = (minutes: number) => Date.parse(since) + minutes * 60_000;
    expect(elapsedLabel(since, at(0.5))).toBe('agora');
    expect(elapsedLabel(since, at(12))).toBe('há 12 min');
    expect(elapsedLabel(since, at(75))).toBe('há 1 h 15 min');
  });
});
