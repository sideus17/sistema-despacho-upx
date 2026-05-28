import { supabase } from '../config/supabase';
import { Router, Request, Response } from 'express';
import { analyzeDispatch } from '../services/dispatchService';
import { calculateRoute } from '../services/routingService';
import { geocodeAddress } from '../services/geocodingService';
import { 
  AmbulanceStatus, 
  CallStatus, 
  CallPriority,
  EmergencyCall,
  ApiResponse,
  Stats
} from '../types';

const router = Router();

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
// AMBULANCES
// ============================================

router.get('/ambulances', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('ambulances').select('*');

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
    }
  }));

  res.json({
    success: true,
    data: formattedAmbulances,
    timestamp: new Date().toISOString()
  });
});


router.patch('/ambulances/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  
  if (!Object.values(AmbulanceStatus).includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status', timestamp: new Date().toISOString() });
  }

  const { error } = await supabase
    .from('ambulances')
    .update({ status })
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  res.json({ success: true, data: { message: 'Status updated successfully' }, timestamp: new Date().toISOString() });
});

router.patch('/ambulances/:id/location', async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, error: 'Invalid coordinates', timestamp: new Date().toISOString() });
  }

  const { error } = await supabase
    .from('ambulances')
    .update({ lat, lng })
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  res.json({ success: true, data: { message: 'Location updated successfully' }, timestamp: new Date().toISOString() });
});

// ============================================
// CALLS
// ============================================

router.get('/calls', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('calls').select('*');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedCalls = data.map(call => ({
    id: call.id,
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

router.post('/calls', async (req: Request, res: Response) => {
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

router.patch('/calls/:id/status', async (req: Request, res: Response) => {
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
// WEATHER EVENTS
// ============================================

router.get('/weather/events', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('weather_events').select('*');

  if (error) {
    return res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }

  const formattedEvents = data.map(event => ({
    id: event.id,
    type: event.type,
    location: { lat: event.lat, lng: event.lng },
    radius: event.radius,
    riskLevel: event.risk_level,
    description: event.description,
    startTime: event.start_time,
    estimatedEndTime: event.estimated_end_time
  }));

  res.json({
    success: true,
    data: formattedEvents,
    timestamp: new Date().toISOString()
  });
});


// ============================================
// DISPATCH
// ============================================

router.post('/dispatch/analyze', async (req: Request, res: Response) => {
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

router.post('/dispatch/execute', async (req: Request, res: Response) => {
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

    // Calcula a rota com as coordenadas que vieram do banco
    const route = await calculateRoute(
      { lat: ambData.lat, lng: ambData.lng }, 
      { lat: callData.lat, lng: callData.lng }
    );

    // Atualiza os status no banco para EM_ATENDIMENTO
    await supabase.from('calls').update({ status: CallStatus.EM_ATENDIMENTO }).eq('id', callId);
    await supabase.from('ambulances').update({ status: AmbulanceStatus.EM_ATENDIMENTO }).eq('id', ambulanceId);

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

router.post('/dispatch/finish', async (req, res) => {
  const { callId, ambulanceId } = req.body;

  try {
    const { error: callError } = await supabase
      .from('calls')
      .update({ status: 'FINALIZADO' })
      .eq('id', callId);

    if (callError) throw callError;

    const { error: ambError } = await supabase
      .from('ambulances')
      .update({ status: 'DISPONIVEL' })
      .eq('id', ambulanceId);

    if (ambError) throw ambError;

    res.json({ success: true, message: 'Atendimento finalizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao finalizar atendimento' });
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

router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Para simplificar, buscamos todos os dados para contar
    const [ambRes, callsRes, weatherRes] = await Promise.all([
      supabase.from('ambulances').select('id, status'),
      supabase.from('calls').select('id, status'),
      supabase.from('weather_events').select('id')
    ]);

    const stats: Stats = {
      totalAmbulances: ambRes.data?.length || 0,
      availableAmbulances: ambRes.data?.filter(a => a.status === 'DISPONIVEL').length || 0,
      pendingCalls: callsRes.data?.filter(c => c.status === 'PENDENTE').length || 0,
      activeWeatherEvents: weatherRes.data?.length || 0
    };

    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (error) {
     res.status(500).json({ success: false, error: 'Failed to fetch stats', timestamp: new Date().toISOString() });
  }
});

export default router;


