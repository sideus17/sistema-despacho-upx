import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Enable CORS for frontend (Vite can use 5173, 5174, or 5175 if a port is busy)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'SAMU Intelligent Dispatch System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      ambulances: '/api/ambulances',
      calls: '/api/calls',
      bases: '/api/bases',
      weather: '/api/weather/events',
      dispatch: '/api/dispatch/analyze',
      routes: '/api/routes/calculate',
      stats: '/api/stats'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('🚑 ========================================');
  console.log('   SAMU Intelligent Dispatch System');
  console.log('   Backend Server');
  console.log('========================================== 🚑');
  console.log('');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`✅ API available at: http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📊 Available endpoints:');
  console.log('   - GET  /api/ambulances');
  console.log('   - GET  /api/calls');
  console.log('   - GET  /api/bases');
  console.log('   - GET  /api/weather/events');
  console.log('   - POST /api/dispatch/analyze');
  console.log('   - POST /api/dispatch/execute');
  console.log('   - POST /api/routes/calculate');
  console.log('   - GET  /api/stats');
  console.log('');
  console.log('🔧 Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('');
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;


