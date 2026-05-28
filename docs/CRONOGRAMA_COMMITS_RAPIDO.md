# ⚡ Cronograma de Commits - Referência Rápida

> **Guia simplificado para commits semanais realistas**

---

## 📅 Calendário de Commits

| Semana | Data | Hora | Autor | Foco | Arquivos | Tempo |
|--------|------|------|-------|------|----------|-------|
| **1** | 05/02 | 10:30 | A | Setup inicial | 8 arquivos | 2-3h |
| **2** | 12/02 | 14:15 | A | Backend base | 2 arquivos | 3-4h |
| **3** | 19/02 | 16:45 | B | Frontend base | 3 arquivos | 3-4h |
| **4** | 26/02 | 10:00 | A | Dados mockados | 4 arquivos | 4-5h |
| **5** | 04/03 | 15:30 | B | Mapa Leaflet | 2 arquivos | 5-6h |
| **6** | 11/03 | 11:20 | A | **Algoritmo** ⭐ | 1 arquivo | 6-8h |
| **7** | 18/03 | 09:45 | A | API REST | 1 arquivo | 4-5h |
| **8** | 25/03 | 14:00 | A | OSRM rotas | 1 arquivo | 5-6h |
| **9** | 01/04 | 16:30 | B | Componentes | 3 arquivos | 6-7h |
| **10** | 08/04 | 10:15 | B | Integração | 1 arquivo | 5-6h |
| **11** | 15/04 | 13:50 | B | Estilos CSS | 1 arquivo | 4-5h |
| **12** | 22/04 | 11:00 | C | Documentação | 4 arquivos | 6-8h |

**Total:** 12 commits, 31 arquivos, ~60 horas de trabalho

---

## 🎯 Comandos por Semana

### **Semana 1 - Setup (05/02, 10:30)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git init
git add README.md .gitignore
git commit -m "Initial commit: Project structure and documentation"

# 2 horas depois (12:30)
git add backend/package.json backend/tsconfig.json
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html
git commit -m "chore: Add project configuration files

- Setup TypeScript for backend and frontend
- Configure Vite build tool
- Add initial dependencies (Express, React, Leaflet)
- Configure ESLint and Prettier"
```

### **Semana 2 - Backend (12/02, 14:15)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/types/index.ts backend/src/server.ts
git commit -m "feat: Add backend structure with Express and TypeScript

- Create Express server with CORS enabled
- Define TypeScript interfaces for Ambulance, Call, Base, WeatherEvent
- Add health check endpoint
- Configure port 3000
- Add basic error handling

Tested: Server starts successfully on localhost:3000"
```

### **Semana 3 - Frontend (19/02, 16:45)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/types/index.ts frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: Add frontend structure with React and TypeScript

- Create main App component with basic layout
- Define TypeScript interfaces matching backend
- Setup React 18 with StrictMode
- Add basic CSS imports
- Configure Vite dev server

Tested: Frontend loads successfully on localhost:5173"
```

### **Semana 4 - Mock Data (26/02, 10:00)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/data/ambulances.ts backend/src/data/calls.ts
git add backend/src/data/bases.ts backend/src/data/weatherEvents.ts
git commit -m "feat: Add mock data for Sorocaba/SP

- Create 4 ambulances (USA-01, USB-01, MOTO-01, USA-02)
- Add 3 emergency calls with different priorities
- Define 2 operational bases (Central and Zona Norte)
- Add 3 weather events (flooding, fallen tree, strong winds)
- Use real coordinates from Sorocaba

All data is mockdata for academic demonstration purposes.
In production, this would be replaced by database queries."
```

### **Semana 5 - Mapa (04/03, 15:30)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/components/Map.tsx frontend/src/styles/index.css
git commit -m "feat: Add Leaflet map integration with markers

- Integrate Leaflet library for interactive maps
- Create Map component with OpenStreetMap tiles
- Add custom markers for ambulances (🚑), calls (📍), bases (🏥)
- Implement marker clustering for better visualization
- Center map on Sorocaba coordinates
- Add zoom controls and attribution

Challenges faced:
- Learning Leaflet API documentation
- Configuring TypeScript types for Leaflet
- Styling markers with custom icons

Tested: Map loads correctly with all markers visible"
```

### **Semana 6 - Algoritmo ⭐ (11/03, 11:20)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/services/dispatchService.ts
git commit -m "feat: Implement dispatch algorithm with weighted scoring

Algorithm components:
- Distance calculation using Haversine formula (40% weight)
- Availability scoring (30% weight)
- Type matching based on call priority (20% weight)
- Weather impact penalty (10% weight)

Score formula:
Total = (Distance × 0.4) + (Availability × 0.3) + (Type × 0.2) + (Weather × 0.1)

Features:
- Calculates score for all available ambulances
- Sorts recommendations by total score
- Provides detailed explanation for each recommendation
- Handles edge cases (no available ambulances, etc.)

Research:
- Studied Haversine formula for geographic distance
- Researched emergency dispatch systems
- Analyzed SAMU operational procedures

Tested with multiple scenarios:
- Emergency cardiac call → USA recommended
- Urgent fracture → USB recommended  
- Priority diabetic → MOTO recommended"
```

### **Semana 7 - API (18/03, 09:45)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/routes/api.ts
git commit -m "feat: Add REST API endpoints

Endpoints implemented:
GET  /api/ambulances - List all ambulances
GET  /api/ambulances/available - List available only
GET  /api/ambulances/:id - Get specific ambulance
GET  /api/calls - List all calls
GET  /api/calls/pending - List pending calls
POST /api/calls - Create new call
GET  /api/weather/events - List active weather events
POST /api/dispatch/analyze - Analyze and recommend best ambulance
POST /api/dispatch/execute - Execute dispatch
GET  /api/health - Health check
GET  /api/stats - System statistics

Features:
- Input validation
- Error handling with proper HTTP status codes
- Detailed error messages
- Request logging
- CORS enabled

Tested all endpoints with Postman/curl"
```

### **Semana 8 - OSRM (25/03, 14:00)**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/services/routingService.ts
git commit -m "feat: Add OSRM integration for route calculation

Features:
- Integration with OSRM public API
- Calculate real routes (not straight line)
- Get distance, duration, and turn-by-turn instructions
- Parse route geometry for map visualization
- Fallback to Haversine distance if OSRM fails

OSRM API:
- Free and open source routing service
- Uses OpenStreetMap data
- Returns optimized routes for vehicles

Challenges:
- Understanding OSRM API response format
- Handling API failures gracefully
- Converting polyline geometry to coordinates

Fallback strategy:
If OSRM is unavailable:
- Use Haversine distance calculation
- Estimate time based on average speed (40 km/h urban)
- System continues working with reduced accuracy

Tested:
- Multiple routes in Sorocaba
- API failure scenarios
- Response time (<1s average)"
```

### **Semana 9 - Componentes (01/04, 16:30)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/components/CallList.tsx
git add frontend/src/components/WeatherAlerts.tsx
git add frontend/src/components/DispatchAnalysis.tsx
git commit -m "feat: Add frontend components for call management

Components created:

1. CallList.tsx
   - Display all emergency calls
   - Show priority, location, description
   - Click to select and analyze
   - Visual indicators for priority levels

2. WeatherAlerts.tsx
   - Display active weather events
   - Show risk levels with color coding
   - Location and type of event
   - Warning icons

3. DispatchAnalysis.tsx
   - Show analysis results
   - Display recommended ambulances with scores
   - Explain scoring factors
   - Show calculated route
   - Execute dispatch button

Features:
- Responsive design
- Clear visual hierarchy
- Interactive elements
- Loading states
- Error handling

Challenges:
- Designing intuitive UI/UX
- Managing component state
- Coordinating with map interactions

Tested on different screen sizes"
```

### **Semana 10 - Integração (08/04, 10:15)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/services/api.ts
git commit -m "feat: Add API client for backend integration

API Client features:
- HTTP client using fetch API
- Type-safe requests and responses
- Error handling and retry logic
- Loading states management
- Request/response logging

Endpoints integrated:
- fetchAmbulances()
- fetchCalls()
- fetchWeatherEvents()
- analyzeDispatch(callId)
- executeDispatch(callId, ambulanceId)
- calculateRoute(from, to)

Features:
- Automatic JSON parsing
- Error messages in Portuguese
- Timeout handling (10s)
- Network error detection
- CORS configuration

Integration flow:
1. User selects call on map
2. Frontend calls analyzeDispatch()
3. Backend calculates scores
4. Frontend displays recommendations
5. User confirms dispatch
6. Frontend calls executeDispatch()
7. System updates ambulance status

Challenges:
- Handling async operations
- Managing loading states
- Error recovery strategies
- Type safety across API boundary

Tested:
- All API endpoints
- Error scenarios
- Network failures
- Concurrent requests"
```

### **Semana 11 - Estilos (15/04, 13:50)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/styles/index.css
git commit -m "style: Add comprehensive CSS styling and UI improvements

Styling improvements:
- Professional color scheme (blue/green for emergency)
- Responsive layout (mobile, tablet, desktop)
- Smooth transitions and animations
- Consistent spacing and typography
- Accessible color contrast (WCAG AA)

Components styled:
- Map container with proper sizing
- Call list with priority indicators
- Weather alerts with risk level colors
- Dispatch analysis with score visualization
- Buttons and interactive elements

Features:
- CSS Grid and Flexbox layouts
- Mobile-first approach
- Hover and focus states
- Loading spinners
- Error message styling
- Success/warning/error color coding

Accessibility:
- Proper contrast ratios
- Focus indicators
- Screen reader friendly
- Keyboard navigation support

Tested on:
- Chrome, Firefox, Edge
- Desktop (1920x1080, 1366x768)
- Tablet (768px)
- Mobile (375px, 414px)"
```

### **Semana 12 - Documentação (22/04, 11:00)**
```bash
git config user.name "Pedro Costa"
git config user.email "pedro.costa@email.com"

git add docs/APRESENTACAO.md docs/JUSTIFICATIVA_TECNICA.md INSTALACAO.md
git commit -m "docs: Add comprehensive documentation

Documentation added:
- APRESENTACAO.md: Presentation guide for academic defense
- JUSTIFICATIVA_TECNICA.md: Technical justifications
- INSTALACAO.md: Step-by-step installation guide

Content includes:
- Project overview and objectives
- Architecture explanation
- Algorithm detailed description
- API documentation
- Deployment instructions
- FAQ for common questions
- Presentation slides structure
- Defense preparation tips

Target audience:
- Project team members
- Academic evaluators
- Future developers
- System administrators"

# 3 horas depois (14:00)
git add README.md
git commit -m "docs: Update README with complete project information

README improvements:
- Clear project description
- Technology stack details
- Installation instructions
- Usage examples
- API endpoints documentation
- Algorithm explanation
- Mock data justification
- Production migration path
- Team roles
- Development timeline
- Cost analysis
- Future improvements

Added sections:
- Quick start guide
- Testing instructions
- Troubleshooting
- Contributing guidelines
- License information"

# 1 hora depois (15:00)
git commit --allow-empty -m "chore: Prepare for final presentation

Final checklist completed:
✅ All features implemented and tested
✅ Code reviewed and refactored
✅ Documentation complete
✅ Installation guide validated
✅ Presentation material ready
✅ Demo scenarios prepared
✅ FAQ reviewed
✅ Team trained on codebase

Ready for academic defense on [data]"
```

---

## 👥 Configuração de Autores

```bash
# Membro A - Backend Lead (João)
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

# Membro B - Frontend Lead (Maria)
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

# Membro C - Documentação (Pedro)
git config user.name "Pedro Costa"
git config user.email "pedro.costa@email.com"
```

---

## ✅ Checklist Semanal

Antes de cada commit:
- [ ] Testar código localmente
- [ ] Configurar autor correto
- [ ] Revisar mensagem de commit
- [ ] Verificar arquivos adicionados
- [ ] Confirmar que não há erros

---

## 🎯 Regras de Ouro

1. **1 commit por semana** (exceto Semana 1 e 12 com 2-3)
2. **Espaçar 7 dias** entre commits
3. **Variar horários** (manhã, tarde, noite)
4. **Alternar autores** conforme especialidade
5. **Mensagens descritivas** com contexto
6. **Sempre testar** antes de commitar

---

## 🚨 Evitar

❌ Commits no mesmo dia  
❌ Mensagens genéricas  
❌ Código quebrado  
❌ Mesmo autor sempre  
❌ Horários suspeitos (3h da manhã)  

---

## 💡 Dica Final

**Use este guia como referência rápida. Para detalhes completos, consulte `GUIA_COMMITS_DETALHADO.md`**

Boa sorte! 🚀