import { supabase } from '../config/supabase';
import { Router, Request, Response } from 'express';
import { analyzeDispatch } from '../services/dispatchService';
import { calculateRoute } from '../services/routingService';
import { geocodeAddress } from '../services/geocodingService';
import {
  IncidentError,
  closeIncident,
  countActiveIncidents,
  createIncident,
  listActiveIncidents,
  voteIncident
} from '../services/incidentService';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  AmbulanceStatus,
  CallStatus,
  EmergencyCall,
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

// Cadastro pelo backend: valida a função (operador exige o código da central)
// e cria o usuário já confirmado, sem depender do envio de e-mail do Supabase
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { fullName, email, password, role, inviteCode } = req.body ?? {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';

  if (name.length < 3) return fail(res, 400, 'Informe o nome completo.');
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) return fail(res, 400, 'E-mail inválido.');
  if (typeof password !== 'string' || password.length < 8) return fail(res, 400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (!Object.values(UserRole).includes(role)) return fail(res, 400, 'Escolha se você é motorista ou operador.');

  const expectedCode = process.env.OPERATOR_INVITE_CODE;
  if (role === UserRole.OPERADOR && (!expectedCode || inviteCode !== expectedCode)) {
    return fail(res, 403, 'Código da central inválido.');
  }

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

  const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, full_name: name, role });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return fail(res, 500, 'Erro ao criar o perfil. Tente novamente.');
  }

  res.status(201).json({
    success: true,
    data: { id: data.user.id, fullName: name, role },
    timestamp: new Date().toISOString()
  });
});

// Daqui para baixo, tudo exige login com MFA concluído
router.use(requireAuth);

router.get('/me', (req: Request, res: Response) => {
  res.json({ success: true, data: req.user, timestamp: new Date().toISOString() });
});

// ============================================
// TURNO (motorista ↔ viatura)
// ============================================

router.post('/shifts/start', requireRole(UserRole.MOTORISTA), async (req: Request, res: Response) => {
  const { ambulanceId } = req.body ?? {};
  if (!ambulanceId) return fail(res, 400, 'ambulanceId is required');

  const { data: current } = await supabase.from('ambulances').select('id, code').eq('driver_id', req.user!.id).maybeSingle();
  if (current) {
    return current.id === ambulanceId
      ? res.json({ success: true, data: { ambulanceId }, timestamp: new Date().toISOString() })
      : fail(res, 409, `Você já está em turno na ${current.code}. Encerre o turno antes de trocar.`);
  }

  // Só assume a viatura se ninguém estiver com ela
  const { data: taken, error } = await supabase
    .from('ambulances')
    .update({ driver_id: req.user!.id })
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
  const { data, error } = await supabase.from('ambulances').select('*, driver:profiles!driver_id(id, full_name)');

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
    driver: amb.driver ? { id: amb.driver.id, name: amb.driver.full_name } : null,
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
  const { lat, lng } = req.body;

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
});

// ============================================
// CALLS
// ============================================

router.get('/calls', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('calls').select('*, ambulance_id');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedCalls = data.map(call => ({
    id: call.id,
    ambulance_id: call.ambulance_id,
    location: { lat: call.lat, lng: call.lng },
    address: call.address,
    priority: call.priority,
    status: call.status,
    description: call.description,
    patientInfo: {
      age: call.patient_age,
      gender: call.patient_gender,
      symptoms: call.patient_symptoms
    },
    timestamp: call.timestamp
  }));

  res.json({
    success: true,
    data: formattedCalls,
    timestamp: new Date().toISOString()
  });
});

router.get('/calls/pending', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .in('status', ['PENDENTE', 'EM_ATENDIMENTO'])

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedCalls = data.map(call => ({
    id: call.id,
    ambulance_id: call.ambulance_id,
    location: { lat: call.lat, lng: call.lng },
    address: call.address,
    priority: call.priority,
    status: call.status,
    description: call.description,
    patientInfo: {
      age: call.patient_age,
      gender: call.patient_gender,
      symptoms: call.patient_symptoms
    },
    timestamp: call.timestamp
  }));

  res.json({
    success: true,
    data: formattedCalls,
    timestamp: new Date().toISOString()
  });
});

router.post('/calls', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    const { age, gender, address, description, priority } = req.body;

    if (!address || !description || !priority) {
      return res.status(400).json({ success: false, error: 'Endereço, descrição e urgência são obrigatórios.', timestamp: new Date().toISOString() });
    }

    const location = await geocodeAddress(address);
    const callId = `call-${Date.now()}`;
    const formattedAddress = address.toLowerCase().includes('sorocaba') ? address : `${address}, Sorocaba/SP`;

    const { data, error } = await supabase
      .from('calls')
      .insert([{
        id: callId,
        lat: location.lat,
        lng: location.lng,
        address: formattedAddress,
        priority: priority,
        status: CallStatus.PENDENTE,
        description: description,
        patient_age: age ? Number(age) : null,
        patient_gender: gender || null,
        patient_symptoms: description
      }])
      .select();

    if (error) throw new Error(error.message);

    const createdCall: EmergencyCall = {
      id: data[0].id,
      location: { lat: data[0].lat, lng: data[0].lng },
      address: data[0].address,
      priority: data[0].priority,
      status: data[0].status,
      description: data[0].description,
      patientInfo: {
        age: data[0].patient_age,
        gender: data[0].patient_gender,
        symptoms: data[0].patient_symptoms
      },
      timestamp: data[0].timestamp
    };

    res.status(201).json({ success: true, data: createdCall, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar chamado.',
      timestamp: new Date().toISOString()
    });
  }
});

router.patch('/calls/:id/status', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  const { status } = req.body;
  
  if (!Object.values(CallStatus).includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status', timestamp: new Date().toISOString() });
  }

  const { error } = await supabase
    .from('calls')
    .update({ status })
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  res.json({ success: true, data: { message: 'Status updated successfully' }, timestamp: new Date().toISOString() });
});

// ============================================
// BASES
// ============================================

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
// OCORRÊNCIAS (central, equipes e fontes oficiais)
// ============================================

router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = await listActiveIncidents(req.user!.id);
    res.json({ success: true, data: incidents, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao buscar ocorrências.');
  }
});

// Central marca no mapa; a equipe relata onde está (o relato repetido confirma o anterior)
router.post('/incidents', requireRole(UserRole.OPERADOR, UserRole.MOTORISTA), async (req: Request, res: Response) => {
  try {
    const result = await createIncident(req.user!, req.body ?? {});
    res.status(result.created ? 201 : 200).json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao registrar a ocorrência.');
  }
});

router.post('/incidents/:id/close', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    await closeIncident(req.user!, req.params.id);
    res.json({ success: true, data: { id: req.params.id }, timestamp: new Date().toISOString() });
  } catch (error) {
    failIncident(res, error, 'Erro ao encerrar a ocorrência.');
  }
});

// "Ainda está lá?" das equipes; a central usa só o SIM, para confirmar o bloqueio de um relato
router.post('/incidents/:id/vote', requireRole(UserRole.OPERADOR, UserRole.MOTORISTA), async (req: Request, res: Response) => {
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
    const { data: ambData, error: ambError } = await supabase.from('ambulances').select('*').eq('id', ambulanceId).single();

    if (callError || ambError || !callData || !ambData) {
      return res.status(404).json({ success: false, error: 'Call or ambulance not found', timestamp: new Date().toISOString() });
    }

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
        ambulance_id: ambulanceId
      })
      .eq('id', callId)
      .eq('status', CallStatus.PENDENTE)
      .select('id');

    if (assignError || !assigned || assigned.length === 0) {
      await supabase.from('ambulances').update({ status: AmbulanceStatus.DISPONIVEL }).eq('id', ambulanceId);
      if (assignError) throw new Error(assignError.message);
      return res.status(409).json({ success: false, error: 'Chamado não está mais pendente', timestamp: new Date().toISOString() });
    }

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
    const { data: callData, error: callError } = await supabase.from('calls').select('ambulance_id').eq('id', callId).single();
    if (callError || !callData) {
      return res.status(404).json({ success: false, error: 'Call not found', timestamp: new Date().toISOString() });
    }

    // Motorista só finaliza o chamado da própria viatura; o operador pode finalizar qualquer um
    if (req.user!.role === UserRole.MOTORISTA) {
      const { data: own } = await supabase.from('ambulances').select('id').eq('driver_id', req.user!.id).maybeSingle();
      if (!own || own.id !== callData.ambulance_id) return fail(res, 403, 'Este chamado não é da sua viatura.');
    }

    // Finaliza o chamado
    const { error: finishError } = await supabase
      .from('calls')
      .update({ status: CallStatus.FINALIZADO, ambulance_id: null })
      .eq('id', callId);
    if (finishError) throw new Error(finishError.message);

    // Libera a ambulância
    if (callData.ambulance_id) {
      const { error: releaseError } = await supabase
        .from('ambulances')
        .update({ status: AmbulanceStatus.DISPONIVEL })
        .eq('id', callData.ambulance_id);
      if (releaseError) throw new Error(releaseError.message);
    }

    res.json({ success: true, data: { callId, ambulanceId: callData.ambulance_id }, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao finalizar', timestamp: new Date().toISOString() });
  }
});

// ============================================
// ROUTES
// ============================================

router.post('/routes/calculate', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    
    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid coordinates',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    const route = await calculateRoute(from, to);

    const response: ApiResponse<typeof route> = {
      success: true,
      data: route,
      timestamp: new Date().toISOString()
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// ============================================
// STATS
// ============================================

router.get('/stats', requireRole(UserRole.OPERADOR), async (req: Request, res: Response) => {
  try {
    // Para simplificar, buscamos todos os dados para contar
    const [ambRes, callsRes, activeIncidents] = await Promise.all([
      supabase.from('ambulances').select('id, status, driver_id'),
      supabase.from('calls').select('id, status'),
      countActiveIncidents()
    ]);

    const stats: Stats = {
      totalAmbulances: ambRes.data?.length || 0,
      // Disponível de verdade = livre e com motorista em turno para receber o chamado
      availableAmbulances: ambRes.data?.filter(a => a.status === 'DISPONIVEL' && a.driver_id).length || 0,
      pendingCalls: callsRes.data?.filter(c => c.status === 'PENDENTE').length || 0,
      activeIncidents
    };

    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
     res.status(500).json({ success: false, error: 'Failed to fetch stats', timestamp: new Date().toISOString() });
  }
});

export default router;


