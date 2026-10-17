import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority, CallStatus, CloseReason, RegulationDecision } from '../types';
import { CallError } from './calls';
import { MAX_NOTE, RegulationBefore, parseRegulation, regulationChange } from './regulation';

const NOW = '2026-10-17T12:05:00.000Z';
const ACTOR = '11111111-1111-1111-1111-111111111111';

const WAITING: RegulationBefore = {
  status: CallStatus.AGUARDANDO_REGULACAO,
  priority: CallPriority.URGENTE,
  hospital_id: null,
  regulated_at: null
};

const REGULATED: RegulationBefore = {
  status: CallStatus.PENDENTE,
  priority: CallPriority.EMERGENCIA,
  hospital_id: 'hosp-chs',
  regulated_at: '2026-10-17T12:01:00.000Z'
};

const errorWith = (status: number, message: RegExp) => (error: unknown) =>
  error instanceof CallError && error.status === status && message.test(error.message);

describe('parseRegulation', () => {
  it('mandar viatura exige a cor', () => {
    assert.throws(() => parseRegulation({ decision: 'DESPACHAR' }), errorWith(400, /classificação de risco/));
    assert.deepEqual(parseRegulation({ decision: 'DESPACHAR', priority: 'EMERGENCIA' }), {
      decision: RegulationDecision.DESPACHAR,
      priority: CallPriority.EMERGENCIA
    });
  });

  it('decisão desconhecida ou ausente é recusada', () => {
    assert.throws(() => parseRegulation({}), errorWith(400, /o que fazer/));
    assert.throws(() => parseRegulation({ decision: 'ARQUIVAR' }), errorWith(400, /o que fazer/));
    assert.throws(() => parseRegulation(null), errorWith(400, /o que fazer/));
  });

  it('hospital só quando vai viatura; null tira a escolha', () => {
    assert.equal(parseRegulation({ decision: 'DESPACHAR', priority: 'URGENTE', hospitalId: null }).hospitalId, null);
    assert.equal(parseRegulation({ decision: 'DESPACHAR', priority: 'URGENTE', hospitalId: 'hosp-chs' }).hospitalId, 'hosp-chs');
    assert.throws(
      () => parseRegulation({ decision: 'ORIENTACAO', note: 'Repouso', hospitalId: 'hosp-chs' }),
      errorWith(400, /só vale quando vai viatura/)
    );
    assert.throws(() => parseRegulation({ decision: 'DESPACHAR', priority: 'URGENTE', hospitalId: 42 }), errorWith(400, /Hospital inválido/));
  });

  it('orientação por telefone exige registrar o que foi orientado', () => {
    assert.throws(() => parseRegulation({ decision: 'ORIENTACAO' }), errorWith(400, /orientação dada/));
    assert.throws(() => parseRegulation({ decision: 'ORIENTACAO', note: '   ' }), errorWith(400, /orientação dada/));
    const input = parseRegulation({ decision: 'ORIENTACAO', priority: 'NAO_URGENTE', note: '  Procurar a UBS   amanhã ' });
    assert.equal(input.note, 'Procurar a UBS amanhã');
    assert.equal(input.priority, CallPriority.NAO_URGENTE);
  });

  it('cancelar exige o motivo; "outro" exige a explicação', () => {
    assert.throws(() => parseRegulation({ decision: 'CANCELAR' }), errorWith(400, /motivo do cancelamento/));
    assert.throws(() => parseRegulation({ decision: 'CANCELAR', reason: 'PREGUICA' }), errorWith(400, /motivo do cancelamento/));
    assert.throws(() => parseRegulation({ decision: 'CANCELAR', reason: 'OUTRO' }), errorWith(400, /Conte o motivo/));
    assert.equal(parseRegulation({ decision: 'CANCELAR', reason: 'TROTE' }).reason, CloseReason.TROTE);
    assert.throws(() => parseRegulation({ decision: 'DESPACHAR', priority: 'URGENTE', reason: 'TROTE' }), errorWith(400, /só vale para cancelar/));
  });

  it('observação tem limite de tamanho', () => {
    assert.throws(
      () => parseRegulation({ decision: 'CANCELAR', reason: 'OUTRO', note: 'x'.repeat(MAX_NOTE + 1) }),
      errorWith(400, /até 500 caracteres/)
    );
    assert.throws(() => parseRegulation({ decision: 'CANCELAR', reason: 'TROTE', note: 12 }), errorWith(400, /Observação inválida/));
  });
});

describe('regulationChange', () => {
  it('mandar viatura: vai para a fila de despacho com a cor final e registra a primeira regulação', () => {
    const { update, data } = regulationChange(
      WAITING,
      { decision: RegulationDecision.DESPACHAR, priority: CallPriority.EMERGENCIA, hospitalId: 'hosp-regional' },
      ACTOR,
      NOW
    );
    assert.deepEqual(update, {
      status: CallStatus.PENDENTE,
      priority: CallPriority.EMERGENCIA,
      hospital_id: 'hosp-regional',
      regulated_at: NOW,
      regulated_by: ACTOR
    });
    assert.deepEqual(data, {
      decision: RegulationDecision.DESPACHAR,
      changes: {
        status: [CallStatus.AGUARDANDO_REGULACAO, CallStatus.PENDENTE],
        priority: [CallPriority.URGENTE, CallPriority.EMERGENCIA],
        hospitalId: [null, 'hosp-regional']
      }
    });
  });

  it('confirmar a cor sugerida só muda o status', () => {
    const { update, data } = regulationChange(WAITING, { decision: RegulationDecision.DESPACHAR, priority: CallPriority.URGENTE }, ACTOR, NOW);
    assert.equal(update.status, CallStatus.PENDENTE);
    assert.equal('priority' in update, false);
    assert.deepEqual(data.changes, { status: [CallStatus.AGUARDANDO_REGULACAO, CallStatus.PENDENTE] });
  });

  it('orientação por telefone encerra o chamado com a observação', () => {
    const { update, data } = regulationChange(
      WAITING,
      { decision: RegulationDecision.ORIENTACAO, priority: CallPriority.NAO_URGENTE, note: 'Procurar a UBS' },
      ACTOR,
      NOW
    );
    assert.equal(update.status, CallStatus.ORIENTADO);
    assert.equal(update.priority, CallPriority.NAO_URGENTE);
    assert.equal(update.finished_at, NOW);
    assert.equal(update.close_note, 'Procurar a UBS');
    assert.equal(update.close_reason, null);
    assert.equal(data.note, 'Procurar a UBS');
  });

  it('cancelar encerra com o motivo, também quando já esperava viatura', () => {
    const { update, data } = regulationChange(REGULATED, { decision: RegulationDecision.CANCELAR, reason: CloseReason.REPETIDO }, ACTOR, NOW);
    assert.equal(update.status, CallStatus.CANCELADO);
    assert.equal(update.close_reason, CloseReason.REPETIDO);
    assert.equal(update.finished_at, NOW);
    assert.equal(data.reason, CloseReason.REPETIDO);
    // O horário da regulação continua o da primeira
    assert.equal('regulated_at' in update, false);
  });

  it('reclassificar um chamado que espera viatura muda só a cor e o hospital', () => {
    const { update, data } = regulationChange(
      REGULATED,
      { decision: RegulationDecision.DESPACHAR, priority: CallPriority.URGENTE, hospitalId: null },
      ACTOR,
      NOW
    );
    assert.deepEqual(update, { priority: CallPriority.URGENTE, hospital_id: null });
    assert.deepEqual(data.changes, { priority: [CallPriority.EMERGENCIA, CallPriority.URGENTE], hospitalId: ['hosp-chs', null] });
  });

  it('salvar sem mudar nada é recusado', () => {
    assert.throws(
      () => regulationChange(REGULATED, { decision: RegulationDecision.DESPACHAR, priority: CallPriority.EMERGENCIA }, ACTOR, NOW),
      errorWith(400, /Nada mudou/)
    );
  });

  it('chamado antigo, despachável sem regulação, ganha o horário ao ser reclassificado', () => {
    const legacy = { ...REGULATED, regulated_at: null };
    const { update } = regulationChange(legacy, { decision: RegulationDecision.DESPACHAR, priority: CallPriority.URGENTE }, ACTOR, NOW);
    assert.equal(update.regulated_at, NOW);
    assert.equal(update.regulated_by, ACTOR);
  });

  it('depois do despacho ou do fim, a regulação não muda mais nada', () => {
    const input = { decision: RegulationDecision.CANCELAR, reason: CloseReason.TROTE };
    assert.throws(() => regulationChange({ ...WAITING, status: CallStatus.EM_ATENDIMENTO }, input, ACTOR, NOW), errorWith(409, /já foi despachado/));
    for (const status of [CallStatus.FINALIZADO, CallStatus.ORIENTADO, CallStatus.CANCELADO]) {
      assert.throws(() => regulationChange({ ...WAITING, status }, input, ACTOR, NOW), errorWith(409, /já foi encerrado/));
    }
  });
});
