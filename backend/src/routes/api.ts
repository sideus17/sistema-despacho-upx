import { createVerifierClient, supabase } from '../config/supabase';
import { Router, Request, Response } from 'express';
import { analyzeDispatch, assertAwaitingDispatch } from '../services/dispatchService';
import { calculateRoute, speedLimitsAlong } from '../services/routingService';
import { geocodeAddress, reversePlace, searchPlaces } from '../services/geocodingService';
import {
  IncidentError,
  countActiveIncidents,
  createIncident,
  listActiveIncidents,
  registerPassage,
  voteIncident
} from '../services/incidentService';
import { officialStatus, triggerOfficialRefresh } from '../services/official/refresh';
import { trafficTile, trafficTileAllowed } from '../services/trafficTiles';
import { resolveOutcome } from '../services/attendance';
import { listHospitals, trackCallProgress } from '../services/attendanceService';
import { RESPONSE_TARGETS, computeIndicators } from '../services/indicators';
import { parseHistoryQuery, parseIncludeDemo, parsePeriod, parsePriorityFilter } from '../services/history';
import { heatPoints, historyPage, indicatorRows, peopleNames, peopleRows } from '../services/managementService';
import { computePeople } from '../services/people';
import {
  CallError,
  RECENT_WINDOW_MS,
  parseCallLocation,
  parseCallerPhone,
  parsePriority,
  parseReference,
  parseTriage,
  recentMatches,
  toCall
} from '../services/calls';
import { parseRegulation, regulationChange } from '../services/regulation';
import { actorOf, buildEvent } from '../services/callEvents';
import { listCallEvents, recordCallEvent } from '../services/callEventsService';
import { invalidateProfile, requireAuth, requireRole } from '../middleware/auth';
import { duplicateMessage, parseCpf, parsePhone, profileUpdate, ProfileError, toMe } from '../services/profile';
import {
  AmbulanceStatus,
  CallEventAction,
  CallStatus,
  Coordinates,
  ApiResponse,
  Stats,
  UserRole
} from '../types';

const router = Router();

const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({ success: false, error, timestamp: new Date().toISOString() });

const failIncident = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof IncidentError) return fail(res, error.status, error.message);
  console.error(`${fallback}:`, error);
  return fail(res, 500, fallback);
};

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

// ============================================
// AUTH (público)
// ============================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cadastro pelo backend: valida a função (atendente da central exige o código da central)
// e cria o usuário já confirmado, sem depender do envio de e-mail do Supabase
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { fullName, email, password, role, inviteCode } = req.body ?? {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';

  if (name.length < 3) return fail(res, 400, 'Informe o nome completo.');
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) return fail(res, 400, 'E-mail inválido.');
  if (typeof password !== 'string' || password.length < 8) return fail(res, 400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (!Object.values(UserRole).includes(role)) return fail(res, 400, 'Escolha se você é motorista ou atendente.');

  const expectedCode = process.env.OPERATOR_INVITE_CODE;
  if (role === UserRole.OPERADOR && (!expectedCode || inviteCode !== expectedCode)) {
    return fail(res, 403, 'Código da central inválido.');
  }

  // CPF e celular para todos (a CNH deixou de ser pedida)
  const documents: Record<string, string> = {};
  try {
    documents.cpf = parseCpf(req.body.cpf);
    documents.phone = parsePhone(req.body.phone);
  } catch (error) {
    if (error instanceof ProfileError) return fail(res, 400, error.message);
    throw error;
  }

  // Avisa antes de criar a conta (o índice único do banco garante em cadastros simultâneos)
  const { data: taken } = await supabase.from('profiles').select('id').eq('cpf', documents.cpf);
  if (taken?.length) return fail(res, 409, 'Este CPF já está cadastrado em outra conta.');

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name }
  });

  if (error || !data.user) {
    const alreadyExists = error?.message?.toLowerCase().includes('already');
    return fail(res, 400, alreadyExists ? 'Já existe uma conta com este e-mail.' : error?.message || 'Erro ao criar conta.');
  }

  const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, full_name: name, role, ...documents });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    const duplicate = duplicateMessage(profileError);
    if (!duplicate) console.error('Signup profile error:', profileError);
    return fail(res, duplicate ? 409 : 500, duplicate ?? 'Erro ao criar o perfil. Tente novamente.');
  }

  res.status(201).json({
    success: true,
    data: { id: data.user.id, fullName: name, role },
    timestamp: new Date().toISOString()
  });
});

// Daqui para baixo, tudo exige login com MFA concluído
router.use(requireAuth);

// Perfil completo da própria pessoa (CPF e celular não saem para outras)
router.get('/me', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.user!.id).single();
  if (error || !data) return fail(res, 500, 'Não foi possível carregar o perfil.');
  res.json({ success: true, data: toMe(data, req.user!.email), timestamp: new Date().toISOString() });
});

router.patch('/me', async (req: Request, res: Response) => {
  let update: Record<string, unknown>;
  try {
    update = profileUpdate(req.body ?? {});
  } catch (error) {
    if (error instanceof ProfileError) return fail(res, 400, error.message);
    throw error;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', req.user!.id)
    .select('*')
    .single();

  if (error || !data) {
    const duplicate = duplicateMessage(error);
    if (duplicate) return fail(res, 409, duplicate);
    console.error('Profile update error:', error);
    return fail(res, 500, 'Não foi possível salvar o perfil.');
  }

  invalidateProfile(req.user!.id);
  res.json({ success: true, data: toMe(data, req.user!.email), timestamp: new Date().toISOString() });
});

// Troca de senha: confere a atual numa sessão à parte (a do aparelho continua valendo)
router.post('/me/password', async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) return fail(res, 400, 'Informe a senha atual.');
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return fail(res, 400, 'A nova senha precisa ter pelo menos 8 caracteres.');
  }
  if (newPassword === currentPassword) return fail(res, 400, 'A nova senha precisa ser diferente da atual.');
  if (!req.user!.email) return fail(res, 400, 'Conta sem e-mail: não dá para conferir a senha.');

  const verifier = createVerifierClient();
  const { error: signInError } = await verifier.auth.signInWithPassword({ email: req.user!.email, password: currentPassword });
  if (signInError) {
    const wrong = signInError.message.toLowerCase().includes('invalid');
    return fail(res, wrong ? 400 : 503, wrong ? 'Senha atual incorreta.' : 'Não foi possível conferir a senha agora. Tente de novo.');
  }
  await verifier.auth.signOut({ scope: 'local' });

  const { error } = await supabase.auth.admin.updateUserById(req.user!.id, { password: newPassword });
  if (error) {
    console.error('Password update error:', error);
    return fail(res, 400, 'Não foi possível trocar a senha. Tente uma senha diferente.');
  }
  res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});

// ============================================
// TURNO (motorista ↔ viatura)
// ============================================

router.post('/shifts/start', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  const { ambulanceId } = req.body ?? {};
  if (!ambulanceId) return fail(res, 400, 'ambulanceId is required');
  // Posição do celular, opcional (sem GPS a viatura fica onde estava, normalmente na base)
  const location = req.body?.location == null ? null : parseCoordinates(req.body.location);
  if (req.body?.location != null && !location) return fail(res, 400, 'Localização inválida.');

  const { data: current } = await supabase.from('ambulances').select('id, code').eq('driver_id', req.user!.id).maybeSingle();
  if (current) {
    return current.id === ambulanceId
      ? res.json({ success: true, data: { ambulanceId }, timestamp: new Date().toISOString() })
      : fail(res, 409, `Você já está em turno na ${current.code}. Encerre o turno antes de trocar.`);
  }

  // Só assume a viatura se ninguém estiver com ela
  const { data: taken, error } = await supabase
    .from('ambulances')
    .update({
      driver_id: req.user!.id,
      ...(location && { lat: location.lat, lng: location.lng, location_updated_at: new Date().toISOString() })
    })
    .eq('id', ambulanceId)
    .is('driver_id', null)
    .select('id');

  if (error) return fail(res, 500, error.message);
  if (!taken || taken.length === 0) return fail(res, 409, 'Esta viatura já está com outro motorista.');

  // Viatura parada passa a ficar disponível; se estava em atendimento, o motorista assume o chamado
  await supabase
    .from('ambulances')
    .update({ status: AmbulanceStatus.DISPONIVEL })
    .eq('id', ambulanceId)
    .eq('status', AmbulanceStatus.INDISPONIVEL);

  res.json({ success: true, data: { ambulanceId }, timestamp: new Date().toISOString() });
});

router.post('/shifts/end', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  const { data: ambulance } = await supabase.from('ambulances').select('id, status').eq('driver_id', req.user!.id).maybeSingle();
  if (!ambulance) return fail(res, 404, 'Você não está em turno.');
  if (ambulance.status === AmbulanceStatus.EM_ATENDIMENTO) {
    return fail(res, 409, 'Finalize o atendimento antes de encerrar o turno.');
  }

  const { error } = await supabase
    .from('ambulances')
    .update({ driver_id: null, status: AmbulanceStatus.INDISPONIVEL })
    .eq('id', ambulance.id);

  if (error) return fail(res, 500, error.message);
  res.json({ success: true, data: { ambulanceId: ambulance.id }, timestamp: new Date().toISOString() });
});

// ============================================
// AMBULANCES
// ============================================

router.get('/ambulances', async (req: Request, res: Response) => {
  // "*" no motorista: funciona antes e depois da migração 003; só id, nome e avatar saem daqui
  const { data, error } = await supabase.from('ambulances').select('*, driver:profiles!driver_id(*)');
  // O celular do motorista vai só para a central, para ligar para a equipe
  const withPhone = req.user!.role === UserRole.OPERADOR;

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedAmbulances = data.map(amb => ({
    id: amb.id,
    code: amb.code,
    type: amb.type,
    status: amb.status,
    location: { lat: amb.lat, lng: amb.lng },
    baseId: amb.base_id,
    crew: {
      driver: amb.crew_driver,
      medic: amb.crew_medic,
      nurse: amb.crew_nurse || undefined
    },
    driver: amb.driver
      ? {
          id: amb.driver.id,
          name: amb.driver.full_name,
          avatar: amb.driver.avatar ?? null,
          avatarColor: amb.driver.avatar_color ?? null,
          ...(withPhone && amb.driver.phone ? { phone: amb.driver.phone } : {})
        }
      : null,
    locationUpdatedAt: amb.location_updated_at
  }));

  res.json({
    success: true,
    data: formattedAmbulances,
    timestamp: new Date().toISOString()
  });
});

// O motorista alterna disponível/indisponível só na própria viatura e fora de atendimento
router.patch('/ambulances/:id/status', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  const { status } = req.body;

  if (status !== AmbulanceStatus.DISPONIVEL && status !== AmbulanceStatus.INDISPONIVEL) {
    return res.status(400).json({ success: false, error: 'Invalid status', timestamp: new Date().toISOString() });
  }

  const { data, error } = await supabase
    .from('ambulances')
    .update({ status })
    .eq('id', req.params.id)
    .eq('driver_id', req.user!.id)
    .neq('status', AmbulanceStatus.EM_ATENDIMENTO)
    .select('id');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
  if (!data || data.length === 0) return fail(res, 409, 'Não foi possível mudar o status desta viatura agora.');

  res.json({ success: true, data: { message: 'Status updated successfully' }, timestamp: new Date().toISOString() });
});

// GPS enviado pelo app da viatura durante a navegação
router.patch('/ambulances/:id/location', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  const { lat, lng, speed } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, error: 'Invalid coordinates', timestamp: new Date().toISOString() });
  }

  const { data, error } = await supabase
    .from('ambulances')
    .update({ lat, lng, location_updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('driver_id', req.user!.id)
    .select('id');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
  if (!data || data.length === 0) return fail(res, 403, 'Esta viatura não está no seu turno.');

  res.json({ success: true, data: { message: 'Location updated successfully' }, timestamp: new Date().toISOString() });

  // Depois de responder: passar normalmente por um relato de equipe ajuda a tirá-lo do mapa
  registerPassage(req.user!, req.params.id, { lat, lng }, typeof speed === 'number' ? speed : null)
    .catch(error => console.warn('Falha ao registrar passagem por ocorrência:', error));
  // e a posição marca as etapas do atendimento (saiu, chegou ao local, ao hospital)
  trackCallProgress(req.params.id, { lat, lng }, typeof speed === 'number' ? speed : null)
    .catch(error => console.warn('Falha ao marcar a etapa do atendimento:', error));
});

// ============================================
// CALLS
// ============================================

router.get('/calls', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('calls').select('*');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  res.json({
    success: true,
    data: data.map(row => toCall(row, req.user!.role)),
    timestamp: new Date().toISOString()
  });
});

// Chamados em aberto: a central vê as filas de regulação e despacho; a equipe, só os já regulados
const OPEN_FOR_CENTRAL = [CallStatus.AGUARDANDO_REGULACAO, CallStatus.PENDENTE, CallStatus.EM_ATENDIMENTO];
const OPEN_FOR_CREW = [CallStatus.PENDENTE, CallStatus.EM_ATENDIMENTO];

router.get('/calls/pending', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .in('status', req.user!.role === UserRole.OPERADOR ? OPEN_FOR_CENTRAL : OPEN_FOR_CREW);

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  res.json({
    success: true,
    data: data.map(row => toCall(row, req.user!.role)),
    timestamp: new Date().toISOString()
  });
});

// Aviso de chamado repetido no formulário: mesmo telefone ou mesmo local nas últimas 2 h
const MAX_RECENT = 5;
router.get('/calls/recent', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  let phone: string | null;
  try {
    phone = parseCallerPhone(typeof req.query.phone === 'string' ? req.query.phone : null);
  } catch (error) {
    return fail(res, 400, (error as Error).message);
  }
  const location = req.query.lat == null ? null : parseCoordinates({ lat: Number(req.query.lat), lng: Number(req.query.lng) });
  if (req.query.lat != null && !location) return fail(res, 400, 'Coordenadas inválidas.');
  if (!phone && !location) return fail(res, 400, 'Informe o telefone ou o local.');

  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { data, error } = await supabase.from('calls').select('*').gte('timestamp', since).neq('status', CallStatus.CANCELADO);
  if (error) return fail(res, 500, error.message);

  const matches = recentMatches(data, { phone, location }).slice(0, MAX_RECENT);
  res.json({
    success: true,
    data: matches.map(match => ({ call: toCall(match.row, req.user!.role), reasons: match.reasons, distance: match.distance })),
    timestamp: new Date().toISOString()
  });
});

router.post('/calls', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const { age, gender, address, description } = req.body ?? {};

    if (!address || !description) {
      return res.status(400).json({ success: false, error: 'Endereço e descrição são obrigatórios.', timestamp: new Date().toISOString() });
    }
    const priority = parsePriority(req.body.priority);
    const triage = parseTriage(req.body.triage);
    const reference = parseReference(req.body.reference);
    const callerPhone = parseCallerPhone(req.body.callerPhone);

    // Ponto escolhido (sugestão ou mapa) vale como está; só texto livre é procurado aqui
    const chosen = parseCallLocation(req.body.location);
    const location = chosen ?? (await geocodeAddress(address));
    if (!location) throw new CallError(422, 'Não encontramos esse endereço. Escolha uma sugestão ou marque no mapa.');

    const callId = `call-${Date.now()}`;
    const formattedAddress = chosen || address.toLowerCase().includes('sorocaba') ? address : `${address}, Sorocaba/SP`;

    const { data, error } = await supabase
      .from('calls')
      .insert([{
        id: callId,
        lat: location.lat,
        lng: location.lng,
        address: formattedAddress,
        priority,
        initial_priority: priority,
        status: CallStatus.AGUARDANDO_REGULACAO,
        created_by: req.user!.id,
        description: description,
        patient_age: age ? Number(age) : null,
        patient_gender: gender || null,
        patient_symptoms: description,
        ...(triage && { triage }),
        ...(reference && { reference_point: reference }),
        ...(callerPhone && { caller_phone: callerPhone })
      }])
      .select();

    if (error) throw new Error(error.message);

    await recordCallEvent(buildEvent(callId, CallEventAction.ABERTURA, actorOf(req.user!), {
      priority,
      ...(triage && { signals: triage.signals, suggested: triage.suggested })
    }));
    res.status(201).json({ success: true, data: toCall(data[0], req.user!.role), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(error instanceof CallError ? error.status : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar chamado.',
      timestamp: new Date().toISOString()
    });
  }
});

// Hospital de destino: a central define e a equipe confirma ou troca (null tira a escolha)
router.patch('/calls/:id/hospital', async (req: Request, res: Response) => {
  const hospitalId: unknown = req.body?.hospitalId;
  if (hospitalId !== null && typeof hospitalId !== 'string') return fail(res, 400, 'Hospital inválido.');

  try {
    if (hospitalId !== null && !(await listHospitals()).some(hospital => hospital.id === hospitalId)) {
      return fail(res, 400, 'Hospital inválido.');
    }
    const { data: call } = await supabase.from('calls').select('status, ambulance_id, hospital_id').eq('id', req.params.id).maybeSingle();
    if (!call) return fail(res, 404, 'Chamado não encontrado.');
    if (call.status !== CallStatus.EM_ATENDIMENTO) return fail(res, 409, 'Este chamado não está em atendimento.');
    if (req.user!.role === UserRole.MOTORISTA) {
      const { data: own } = await supabase.from('ambulances').select('id').eq('driver_id', req.user!.id).maybeSingle();
      if (!own || own.id !== call.ambulance_id) return fail(res, 403, 'Este chamado não é da sua viatura.');
    }

    const { error } = await supabase.from('calls').update({ hospital_id: hospitalId }).eq('id', req.params.id);
    if (error) throw new Error(error.message);
    const before = call.hospital_id ?? null;
    if (before !== hospitalId) {
      await recordCallEvent(buildEvent(req.params.id, CallEventAction.HOSPITAL, actorOf(req.user!), {
        changes: { hospitalId: [before, hospitalId] }
      }));
    }
    res.json({ success: true, data: { callId: req.params.id, hospitalId }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Falha ao escolher o hospital:', error);
    fail(res, 500, 'Não foi possível escolher o hospital.');
  }
});

// Regulação: confirma ou muda a cor, escolhe o hospital e decide (mandar viatura, orientar por telefone
// ou cancelar). Também reclassifica um chamado que ainda espera viatura.
router.post('/calls/:id/regulate', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const input = parseRegulation(req.body);
    if (input.hospitalId && !(await listHospitals()).some(hospital => hospital.id === input.hospitalId)) {
      throw new CallError(400, 'Hospital inválido.');
    }
    const { data: before, error: readError } = await supabase
      .from('calls')
      .select('status, priority, hospital_id, regulated_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!before) throw new CallError(404, 'Chamado não encontrado.');

    const { update, data: change } = regulationChange(before, input, req.user!.id, new Date().toISOString());
    // Só grava se ninguém mexeu no chamado desde a leitura (dois atendentes regulando ao mesmo tempo)
    const { data: rows, error } = await supabase
      .from('calls')
      .update(update)
      .eq('id', req.params.id)
      .eq('status', before.status)
      .select();
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new CallError(409, 'O chamado mudou enquanto você regulava. Confira e tente de novo.');

    await recordCallEvent(buildEvent(req.params.id, CallEventAction.REGULACAO, actorOf(req.user!), change));
    res.json({ success: true, data: toCall(rows[0], req.user!.role), timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof CallError) return fail(res, error.status, error.message);
    console.error('Falha na regulação:', error);
    fail(res, 500, 'Não foi possível salvar a regulação.');
  }
});

// Auditoria do chamado: quem fez cada ação, quando e o que mudou
router.get('/calls/:id/events', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await listCallEvents(req.params.id), timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Falha ao ler a auditoria do chamado:', error);
    fail(res, 500, 'Não foi possível carregar o registro do chamado.');
  }
});

// ============================================
// BASES
// ============================================

router.get('/hospitals', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await listHospitals(), timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Falha ao listar hospitais:', error);
    fail(res, 500, 'Não foi possível carregar os hospitais.');
  }
});

router.get('/bases', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('bases').select('*');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedBases = data.map(base => ({
    id: base.id,
    name: base.name,
    location: { lat: base.lat, lng: base.lng },
    address: base.address,
    capacity: base.capacity
  }));

  res.json({
    success: true,
    data: formattedBases,
    timestamp: new Date().toISOString()
  });
});


// ============================================
// OCORRÊNCIAS (equipes e fontes oficiais; a central só acompanha)
// ============================================

router.get('/incidents', async (req: Request, res: Response) => {
  try {
    // Sistema em uso: aproveita para atualizar CEMADEN e Defesa Civil (em segundo plano)
    triggerOfficialRefresh();
    const incidents = await listActiveIncidents(req.user!.id);
    res.json({ success: true, data: incidents, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao buscar ocorrências.');
  }
});

// A equipe relata onde está (o relato repetido confirma o anterior)
router.post('/incidents', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  try {
    const result = await createIncident(req.user!, req.body ?? {});
    res.status(result.created ? 201 : 200).json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao registrar a ocorrência.');
  }
});

// Quando cada fonte oficial foi lida pela última vez e se deu erro
router.get('/official/status', requireRole(UserRole.OPERADOR), (req: Request, res: Response) => {
  res.json({ success: true, data: officialStatus(), timestamp: new Date().toISOString() });
});

// "Ainda está lá?" das equipes
router.post('/incidents/:id/vote', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  try {
    const { vote } = req.body ?? {};
    if (vote !== 'SIM' && vote !== 'NAO') return fail(res, 400, 'Resposta inválida.');
    const result = await voteIncident(req.user!, req.params.id, vote);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao registrar a resposta.');
  }
});


// ============================================
// DISPATCH
// ============================================

router.post('/dispatch/analyze', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const { callId } = req.body;
    
    if (!callId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'callId is required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    const recommendation = await analyzeDispatch(callId);

    const response: ApiResponse<typeof recommendation> = {
      success: true,
      data: recommendation,
      timestamp: new Date().toISOString()
    };
    res.json(response);

  } catch (error) {
    if (error instanceof CallError) return fail(res, error.status, error.message);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

router.post('/dispatch/execute', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const { callId, ambulanceId } = req.body;
    
    if (!callId || !ambulanceId) {
      return res.status(400).json({ success: false, error: 'callId and ambulanceId are required', timestamp: new Date().toISOString() });
    }

    // Busca o chamado e a ambulância diretamente no Supabase
    const { data: callData, error: callError } = await supabase.from('calls').select('*').eq('id', callId).single();
    const { data: ambData, error: ambError } = await supabase
      .from('ambulances')
      .select('*, driver:profiles!driver_id(full_name)')
      .eq('id', ambulanceId)
      .single();

    if (callError || ambError || !callData || !ambData) {
      return res.status(404).json({ success: false, error: 'Call or ambulance not found', timestamp: new Date().toISOString() });
    }
    assertAwaitingDispatch(callData.status);

    // Reserva a ambulância só se ela estiver disponível e com motorista em turno (evita despacho duplo
    // e garante que alguém recebe o chamado no app)
    const { data: reserved, error: reserveError } = await supabase
      .from('ambulances')
      .update({ status: AmbulanceStatus.EM_ATENDIMENTO })
      .eq('id', ambulanceId)
      .eq('status', AmbulanceStatus.DISPONIVEL)
      .not('driver_id', 'is', null)
      .select('id');

    if (reserveError) throw new Error(reserveError.message);
    if (!reserved || reserved.length === 0) {
      return res.status(409).json({ success: false, error: 'Ambulância não está disponível ou está sem motorista', timestamp: new Date().toISOString() });
    }

    // Vincula o chamado só se ele ainda estiver pendente; senão devolve a ambulância
    const { data: assigned, error: assignError } = await supabase
      .from('calls')
      .update({
        status: CallStatus.EM_ATENDIMENTO,
        ambulance_id: ambulanceId,
        dispatched_by: req.user!.id,
        driver_id: ambData.driver_id, // quem estava em turno na viatura (o turno não fica guardado)
        // Onde a viatura estava: andar 100 m dali é sinal de que saiu
        dispatched_at: new Date().toISOString(),
        dispatch_lat: ambData.lat,
        dispatch_lng: ambData.lng
      })
      .eq('id', callId)
      .eq('status', CallStatus.PENDENTE)
      .select('id');

    if (assignError || !assigned || assigned.length === 0) {
      await supabase.from('ambulances').update({ status: AmbulanceStatus.DISPONIVEL }).eq('id', ambulanceId);
      if (assignError) throw new Error(assignError.message);
      return res.status(409).json({ success: false, error: 'Chamado não está mais pendente', timestamp: new Date().toISOString() });
    }

    const driver = ambData.driver as { full_name: string } | null;
    await recordCallEvent(buildEvent(callId, CallEventAction.DESPACHO, actorOf(req.user!), {
      ambulanceId,
      ambulanceCode: ambData.code,
      driverId: ambData.driver_id,
      driverName: driver?.full_name ?? null
    }));

    // Calcula a rota com as coordenadas que vieram do banco
    const route = await calculateRoute(
      { lat: ambData.lat, lng: ambData.lng },
      { lat: callData.lat, lng: callData.lng }
    );

    // Calcula a estimativa de chegada
    const estimatedArrival = new Date(Date.now() + route.duration * 1000).toISOString();

    const execution = {
      callId,
      ambulanceId,
      route,
      estimatedArrival,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: execution, timestamp: new Date().toISOString() });

  } catch (error) {
    if (error instanceof CallError) return fail(res, error.status, error.message);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() });
  }
});

router.post('/dispatch/finish', async (req: Request, res: Response) => {
  const { callId } = req.body;

  if (!callId) {
    return res.status(400).json({ success: false, error: 'callId is required', timestamp: new Date().toISOString() });
  }

  try {
    // A ambulância vinculada vem do próprio chamado, não do frontend
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('ambulance_id, status, hospital_arrival_at')
      .eq('id', callId)
      .single();
    if (callError || !callData) {
      return res.status(404).json({ success: false, error: 'Call not found', timestamp: new Date().toISOString() });
    }
    if (callData.status !== CallStatus.EM_ATENDIMENTO) return fail(res, 409, 'Este chamado não está em atendimento.');

    // Motorista só finaliza o chamado da própria viatura; o operador pode finalizar qualquer um
    if (req.user!.role === UserRole.MOTORISTA) {
      const { data: own } = await supabase.from('ambulances').select('id').eq('driver_id', req.user!.id).maybeSingle();
      if (!own || own.id !== callData.ambulance_id) return fail(res, 403, 'Este chamado não é da sua viatura.');
    }

    // Finaliza o chamado; a viatura continua nele (histórico)
    const outcome = resolveOutcome(callData, req.body.outcome);
    const { data: finished, error: finishError } = await supabase
      .from('calls')
      .update({ status: CallStatus.FINALIZADO, finished_at: new Date().toISOString(), outcome })
      .eq('id', callId)
      .eq('status', CallStatus.EM_ATENDIMENTO)
      .select('id');
    if (finishError) throw new Error(finishError.message);
    // Outra pessoa finalizou entre a leitura e agora: não libera a viatura de novo nem registra duas vezes
    if (!finished?.length) return fail(res, 409, 'Este chamado não está em atendimento.');
    await recordCallEvent(buildEvent(callId, CallEventAction.FINALIZACAO, actorOf(req.user!), { outcome }));

    // Libera a ambulância
    if (callData.ambulance_id) {
      const { error: releaseError } = await supabase
        .from('ambulances')
        .update({ status: AmbulanceStatus.DISPONIVEL })
        .eq('id', callData.ambulance_id);
      if (releaseError) throw new Error(releaseError.message);
    }

    res.json({ success: true, data: { callId, ambulanceId: callData.ambulance_id, outcome }, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof CallError) return fail(res, error.status, error.message);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao finalizar', timestamp: new Date().toISOString() });
  }
});

// ============================================
// ROUTES
// ============================================

// Ponto {lat, lng} com números de verdade (0 é válido; texto não)
function parseCoordinates(value: unknown): Coordinates | null {
  const point = value as { lat?: unknown; lng?: unknown } | null;
  const lat = point?.lat;
  const lng = point?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// `alternatives: true` traz também até 2 caminhos diferentes (painel de rotas e prévia da equipe)
router.post('/routes/calculate', async (req: Request, res: Response) => {
  const from = parseCoordinates(req.body?.from);
  const to = parseCoordinates(req.body?.to);
  if (!from || !to) return fail(res, 400, 'Coordenadas inválidas.');

  try {
    const route = await calculateRoute(from, to, { alternatives: req.body?.alternatives === true });
    res.json({ success: true, data: route, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao calcular rota:', error);
    fail(res, 500, 'Não foi possível calcular a rota.');
  }
});

// Limites de velocidade ao longo da rota que a equipe está seguindo (placa na navegação)
const MAX_LIMIT_POINTS = 5000;
router.post('/routes/limits', async (req: Request, res: Response) => {
  const raw: unknown = req.body?.geometry;
  const line = Array.isArray(raw) && raw.length <= MAX_LIMIT_POINTS ? raw.map(parseCoordinates) : null;
  if (!line || line.length < 2 || line.some(point => !point)) return fail(res, 400, 'Rota inválida.');

  try {
    res.json({ success: true, data: await speedLimitsAlong(line as Coordinates[]), timestamp: new Date().toISOString() });
  } catch (error) {
    console.warn('Limites de velocidade indisponíveis:', error instanceof Error ? error.message : error);
    fail(res, 502, 'Limites de velocidade indisponíveis agora.');
  }
});

// Endereços e locais para o autocompletar (Photon, região de Sorocaba)
router.get('/geocode/search', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 3 || query.length > 120) return fail(res, 400, 'Digite de 3 a 120 caracteres.');

  try {
    res.json({ success: true, data: await searchPlaces(query), timestamp: new Date().toISOString() });
  } catch (error) {
    console.warn('Busca de endereço falhou:', error instanceof Error ? error.message : error);
    fail(res, 502, 'A busca de endereços não respondeu. Tente de novo ou escolha no mapa.');
  }
});

// Nome do ponto escolhido no mapa
router.get('/geocode/reverse', async (req: Request, res: Response) => {
  const point = parseCoordinates({ lat: Number(req.query.lat), lng: Number(req.query.lng) });
  if (!point) return fail(res, 400, 'Coordenadas inválidas.');

  try {
    res.json({ success: true, data: await reversePlace(point), timestamp: new Date().toISOString() });
  } catch (error) {
    console.warn('Busca reversa falhou:', error instanceof Error ? error.message : error);
    res.json({ success: true, data: null, timestamp: new Date().toISOString() });
  }
});

// Blocos do trânsito ao vivo (TomTom) para a camada do mapa; a chave fica aqui no servidor
router.get('/traffic/flow/:z/:x/:y.pbf', async (req: Request, res: Response) => {
  const [z, x, y] = [req.params.z, req.params.x, req.params.y].map(Number);
  if (!trafficTileAllowed(z, x, y)) return fail(res, 400, 'Bloco fora da região atendida.');

  const tile = await trafficTile(z, x, y);
  // Sem chave ou sem resposta do TomTom: o mapa só fica sem trânsito
  if (!tile) return res.status(204).end();
  res.set('Content-Type', 'application/x-protobuf').set('Cache-Control', 'private, max-age=60').send(tile);
});

// ============================================
// STATS
// ============================================

router.get('/stats', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    // Os chamados só são contados (com o histórico, trazer a tabela seria pesado)
    const [ambRes, pendingRes, regulationRes, activeIncidents] = await Promise.all([
      supabase.from('ambulances').select('id, status, driver_id'),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', CallStatus.PENDENTE),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', CallStatus.AGUARDANDO_REGULACAO),
      countActiveIncidents()
    ]);

    const stats: Stats = {
      totalAmbulances: ambRes.data?.length || 0,
      // Disponível de verdade = livre e com motorista em turno para receber o chamado
      availableAmbulances: ambRes.data?.filter(a => a.status === 'DISPONIVEL' && a.driver_id).length || 0,
      pendingCalls: pendingRes.count ?? 0,
      awaitingRegulation: regulationRes.count ?? 0,
      activeIncidents
    };

    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
     res.status(500).json({ success: false, error: 'Failed to fetch stats', timestamp: new Date().toISOString() });
  }
});

// ============================================
// GESTÃO (indicadores, histórico e mapa de calor; só a central)
// ============================================

const failManagement = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof CallError) return fail(res, error.status, error.message);
  console.error(`${fallback}:`, error);
  return fail(res, 500, fallback);
};

// Tempos de cada etapa, tempo-resposta por cor com a meta e distribuições do período
// Indicadores por pessoa: atendentes (registro, regulação e despacho) e motoristas
router.get('/management/people', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query);
    const includeDemo = parseIncludeDemo(req.query);
    const { rows, truncated } = await peopleRows(period, includeDemo);
    res.json({
      success: true,
      data: { period, includeDemo, truncated, ...computePeople(rows, await peopleNames(rows)) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    failManagement(res, error, 'Não foi possível calcular os indicadores por pessoa.');
  }
});

router.get('/management/indicators', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query);
    const includeDemo = parseIncludeDemo(req.query);
    const { rows, truncated } = await indicatorRows(period, includeDemo);
    res.json({
      success: true,
      data: { period, includeDemo, targets: RESPONSE_TARGETS, truncated, ...computeIndicators(rows, period) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    failManagement(res, error, 'Não foi possível calcular os indicadores.');
  }
});

// Histórico com busca e filtros, em páginas
router.get('/management/calls', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const query = parseHistoryQuery(req.query);
    const { rows, total } = await historyPage(query);
    res.json({
      success: true,
      data: { items: rows.map(row => toCall(row, req.user!.role)), total, page: query.page, pageSize: query.pageSize },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    failManagement(res, error, 'Não foi possível buscar o histórico.');
  }
});

// Pontos dos chamados para o mapa de calor: [lat, lng, cor]
router.get('/management/heatmap', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query);
    const result = await heatPoints(period, parseIncludeDemo(req.query), parsePriorityFilter(req.query.priority));
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    failManagement(res, error, 'Não foi possível carregar o mapa de calor.');
  }
});

export default router;


