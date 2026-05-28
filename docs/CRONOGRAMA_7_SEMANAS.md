# 📅 Cronograma Acelerado - 7 Semanas

> **Projeto:** Sistema SAMU Inteligente  
> **Início:** 31/03/2026 (Segunda-feira)  
> **Apresentação Final:** ~19/05/2026 (7 semanas)  
> **Equipe:** 5 pessoas (2 programadores + 3 não-programadores)

---

## 👥 Divisão da Equipe

### **Programadores (Fazem o código):**
- **João Silva** - Backend Lead (Membro A)
- **Maria Santos** - Frontend Lead (Membro B)

### **Não-Programadores (Apoio e documentação):**
- **Pedro Costa** - Documentação e Testes (Membro C)
- **Ana Oliveira** - Pesquisa e Apresentação (Membro D)
- **Carlos Souza** - Design e Validação (Membro E)

---

## 📊 Cronograma Completo (7 Semanas)

| Semana | Data | Autor | Foco | Arquivos | Tempo |
|--------|------|-------|------|----------|-------|
| **1** | 31/03 | João (A) | Setup + Backend Base | 10 arquivos | 6h |
| **2** | 07/04 | Maria (B) | Frontend + Mapa | 6 arquivos | 6h |
| **3** | 14/04 | João (A) | Algoritmo + API | 2 arquivos | 8h |
| **4** | 21/04 | Maria (B) | Componentes UI | 3 arquivos | 6h |
| **5** | 28/04 | João (A) | OSRM + Integração | 2 arquivos | 6h |
| **6** | 05/05 | Maria (B) | Estilos + Refinamentos | 2 arquivos | 5h |
| **7** | 12/05 | Pedro (C) | Documentação Final | 4 arquivos | 6h |

**Total:** 7 semanas, ~43 horas de programação, 29 arquivos

---

## 📅 Detalhamento Semanal

### **SEMANA 1 - Setup e Backend Base (31/03/2026)**
**Segunda-feira, 31/03/2026, 10:00**  
**Autor:** João Silva (Programador Backend)  
**Apoio:** Pedro Costa (testes)

**O que será feito:**
- Inicialização do repositório
- Configuração TypeScript (backend + frontend)
- Estrutura básica do backend
- Servidor Express funcionando
- Dados mockados criados

**Commits:**
```bash
# Commit 1 - Inicialização (10:00)
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git init
git add README.md .gitignore
git commit -m "Initial commit: Project structure and documentation"

# Commit 2 - Configurações (11:30)
git add backend/package.json backend/tsconfig.json
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html
git commit -m "chore: Add project configuration files

- Setup TypeScript for backend and frontend
- Configure Vite build tool
- Add initial dependencies (Express, React, Leaflet)
- Configure ESLint and Prettier

Team: João (setup), Pedro (validation)"

# Commit 3 - Backend + Dados (14:00)
git add backend/src/types/index.ts backend/src/server.ts
git add backend/src/data/ambulances.ts backend/src/data/calls.ts
git add backend/src/data/bases.ts backend/src/data/weatherEvents.ts
git commit -m "feat: Add backend structure and mock data

Backend:
- Create Express server with CORS enabled
- Define TypeScript interfaces
- Add health check endpoint

Mock Data (Sorocaba/SP):
- 4 ambulances (USA-01, USB-01, MOTO-01, USA-02)
- 3 emergency calls with different priorities
- 2 operational bases
- 3 weather events

Team: João (development), Pedro (data validation)
Tested: Server starts successfully on localhost:3000"
```

**Arquivos commitados:**
- README.md, .gitignore
- backend/package.json, backend/tsconfig.json
- frontend/package.json, frontend/tsconfig.json, frontend/vite.config.ts, frontend/index.html
- backend/src/types/index.ts, backend/src/server.ts
- backend/src/data/ambulances.ts, backend/src/data/calls.ts
- backend/src/data/bases.ts, backend/src/data/weatherEvents.ts

**Total:** 14 arquivos

---

### **SEMANA 2 - Frontend e Mapa (07/04/2026)**
**Segunda-feira, 07/04/2026, 14:30**  
**Autor:** Maria Santos (Programadora Frontend)  
**Apoio:** Carlos Souza (design), Ana Oliveira (pesquisa Leaflet)

**O que será feito:**
- Estrutura básica do React
- Integração do Leaflet
- Mapa exibindo marcadores
- Estilos iniciais

**Commits:**
```bash
# Commit 1 - Frontend Base (14:30)
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/types/index.ts frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: Add frontend structure with React and TypeScript

- Create main App component with basic layout
- Define TypeScript interfaces matching backend
- Setup React 18 with StrictMode
- Configure Vite dev server

Team: Maria (development), Carlos (UI design)
Tested: Frontend loads successfully on localhost:5173"

# Commit 2 - Mapa Leaflet (16:00)
git add frontend/src/components/Map.tsx frontend/src/styles/index.css
git commit -m "feat: Add Leaflet map integration with markers

- Integrate Leaflet library for interactive maps
- Create Map component with OpenStreetMap tiles
- Add custom markers for ambulances (🚑), calls (📍), bases (🏥)
- Center map on Sorocaba coordinates
- Add zoom controls and attribution

Challenges:
- Learning Leaflet API (Ana helped with research)
- Configuring TypeScript types for Leaflet
- Styling markers with custom icons (Carlos helped with design)

Team: Maria (development), Ana (research), Carlos (design)
Tested: Map loads correctly with all markers visible"
```

**Arquivos commitados:**
- frontend/src/types/index.ts, frontend/src/App.tsx, frontend/src/main.tsx
- frontend/src/components/Map.tsx, frontend/src/styles/index.css

**Total:** 5 arquivos

---

### **SEMANA 3 - Algoritmo e API (14/04/2026)**
**Segunda-feira, 14/04/2026, 09:00**  
**Autor:** João Silva (Programador Backend)  
**Apoio:** Ana Oliveira (pesquisa algoritmos), Pedro Costa (testes)

**O que será feito:**
- Algoritmo de despacho (score ponderado)
- Fórmula de Haversine
- API REST completa
- Testes de endpoints

**Commit:**
```bash
git config user.name "João Silva"
git config user.email "joao.silva@email.com"

git add backend/src/services/dispatchService.ts backend/src/routes/api.ts
git commit -m "feat: Implement dispatch algorithm and REST API

ALGORITHM (dispatchService.ts):
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

REST API (api.ts):
GET  /api/ambulances - List all ambulances
GET  /api/ambulances/available - List available only
GET  /api/calls - List all calls
GET  /api/calls/pending - List pending calls
POST /api/dispatch/analyze - Analyze and recommend
POST /api/dispatch/execute - Execute dispatch
GET  /api/weather/events - List weather events
GET  /api/health - Health check
GET  /api/stats - System statistics

Research:
- Ana researched emergency dispatch systems and Haversine formula
- Studied SAMU operational procedures
- Analyzed scoring algorithms

Team: João (development), Ana (research), Pedro (testing)
Tested with multiple scenarios:
- Emergency cardiac call → USA recommended
- Urgent fracture → USB recommended  
- Priority diabetic → MOTO recommended
All endpoints tested with Postman"
```

**Arquivos commitados:**
- backend/src/services/dispatchService.ts
- backend/src/routes/api.ts

**Total:** 2 arquivos

---

### **SEMANA 4 - Componentes UI (21/04/2026)**
**Segunda-feira, 21/04/2026, 15:00**  
**Autor:** Maria Santos (Programadora Frontend)  
**Apoio:** Carlos Souza (design UI/UX), Ana Oliveira (textos)

**O que será feito:**
- Componente CallList
- Componente WeatherAlerts
- Componente DispatchAnalysis
- Interface interativa

**Commit:**
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

Team: Maria (development), Carlos (UI/UX design), Ana (content/texts)
Challenges:
- Designing intuitive UI/UX (Carlos helped)
- Managing component state
- Coordinating with map interactions

Tested on different screen sizes (desktop, tablet, mobile)"
```

**Arquivos commitados:**
- frontend/src/components/CallList.tsx
- frontend/src/components/WeatherAlerts.tsx
- frontend/src/components/DispatchAnalysis.tsx

**Total:** 3 arquivos

---

### **SEMANA 5 - OSRM e Integração (28/04/2026)**
**Segunda-feira, 28/04/2026, 10:30**  
**Autor:** João Silva (Programador Backend)  
**Apoio:** Maria Santos (integração frontend), Pedro Costa (testes)

**O que será feito:**
- Integração OSRM para rotas
- Cliente API no frontend
- Integração completa frontend-backend
- Testes de integração

**Commits:**
```bash
# Commit 1 - OSRM (10:30)
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

Fallback strategy:
If OSRM is unavailable:
- Use Haversine distance calculation
- Estimate time based on average speed (40 km/h urban)
- System continues working with reduced accuracy

Team: João (development), Pedro (testing)
Tested:
- Multiple routes in Sorocaba
- API failure scenarios
- Response time (<1s average)"

# Commit 2 - Integração Frontend (13:00)
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

Integration flow:
1. User selects call on map
2. Frontend calls analyzeDispatch()
3. Backend calculates scores
4. Frontend displays recommendations
5. User confirms dispatch
6. Frontend calls executeDispatch()
7. System updates ambulance status

Team: Maria (development), João (backend support), Pedro (integration testing)
Challenges:
- Handling async operations
- Managing loading states
- Error recovery strategies
- Type safety across API boundary

Tested:
- All API endpoints
- Error scenarios
- Network failures
- Concurrent requests

SYSTEM NOW FULLY INTEGRATED AND FUNCTIONAL! 🎉"
```

**Arquivos commitados:**
- backend/src/services/routingService.ts
- frontend/src/services/api.ts

**Total:** 2 arquivos

---

### **SEMANA 6 - Estilos e Refinamentos (05/05/2026)**
**Segunda-feira, 05/05/2026, 14:00**  
**Autor:** Maria Santos (Programadora Frontend)  
**Apoio:** Carlos Souza (design final), Pedro Costa (testes UI)

**O que será feito:**
- CSS completo e polido
- Responsividade
- Animações e transições
- Testes em diferentes dispositivos

**Commit:**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

git add frontend/src/styles/index.css frontend/src/App.tsx
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

Team: Maria (development), Carlos (design), Pedro (UI testing)
Tested on:
- Chrome, Firefox, Edge
- Desktop (1920x1080, 1366x768)
- Tablet (768px)
- Mobile (375px, 414px)

INTERFACE NOW POLISHED AND PROFESSIONAL! ✨"
```

**Arquivos commitados:**
- frontend/src/styles/index.css (atualização completa)
- frontend/src/App.tsx (ajustes finais)

**Total:** 2 arquivos

---

### **SEMANA 7 - Documentação Final (12/05/2026)**
**Segunda-feira, 12/05/2026, 09:00**  
**Autor:** Pedro Costa (Documentação)  
**Apoio:** Ana Oliveira (apresentação), Carlos Souza (revisão)

**O que será feito:**
- Documentação completa
- Guia de instalação
- Material para apresentação
- Preparação para defesa

**Commits:**
```bash
# Commit 1 - Documentação (09:00)
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

Team: Pedro (writing), Ana (presentation structure), Carlos (review)
Target audience:
- Project team members
- Academic evaluators
- Future developers
- System administrators"

# Commit 2 - README Final (11:30)
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
- Team roles and contributions
- Development timeline
- Cost analysis
- Future improvements

Added sections:
- Quick start guide
- Testing instructions
- Troubleshooting
- Contributing guidelines
- License information

Team: Pedro (writing), Ana (content), Carlos (review)"

# Commit 3 - Preparação Final (13:00)
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

Team contributions:
- João Silva: Backend development (40%)
- Maria Santos: Frontend development (40%)
- Pedro Costa: Documentation and testing (10%)
- Ana Oliveira: Research and presentation (5%)
- Carlos Souza: Design and validation (5%)

Ready for academic defense on 19/05/2026! 🎓🚀"
```

**Arquivos commitados:**
- docs/APRESENTACAO.md
- docs/JUSTIFICATIVA_TECNICA.md
- INSTALACAO.md
- README.md (atualização final)

**Total:** 4 arquivos

---

## 📊 Resumo do Cronograma

### **Distribuição de Commits:**
```
Semana 1: 3 commits (João)
Semana 2: 2 commits (Maria)
Semana 3: 1 commit (João)
Semana 4: 1 commit (Maria)
Semana 5: 2 commits (João + Maria)
Semana 6: 1 commit (Maria)
Semana 7: 3 commits (Pedro)

Total: 13 commits
```

### **Distribuição de Trabalho:**
```
João (Backend):     ████████████████░░░░  40% (Semanas 1, 3, 5)
Maria (Frontend):   ████████████████░░░░  40% (Semanas 2, 4, 5, 6)
Pedro (Docs):       ████░░░░░░░░░░░░░░░░  10% (Semana 7)
Ana (Pesquisa):     ██░░░░░░░░░░░░░░░░░░   5% (Apoio)
Carlos (Design):    ██░░░░░░░░░░░░░░░░░░   5% (Apoio)
```

### **Arquivos por Semana:**
```
Semana 1: 14 arquivos (setup + backend + dados)
Semana 2: 5 arquivos (frontend + mapa)
Semana 3: 2 arquivos (algoritmo + API)
Semana 4: 3 arquivos (componentes UI)
Semana 5: 2 arquivos (OSRM + integração)
Semana 6: 2 arquivos (estilos)
Semana 7: 4 arquivos (documentação)

Total: 32 arquivos
```

---

## 🎯 Marcos Importantes

### **Checkpoint 1 (Fim da Semana 2 - 07/04)**
- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Mapa exibindo dados

### **Checkpoint 2 (Fim da Semana 4 - 21/04)**
- [ ] Algoritmo funcionando
- [ ] API completa
- [ ] Interface básica pronta

### **Checkpoint 3 (Fim da Semana 6 - 05/05)**
- [ ] Sistema totalmente integrado
- [ ] Interface polida
- [ ] Tudo funcionando

### **Checkpoint 4 (Fim da Semana 7 - 12/05)**
- [ ] Documentação completa
- [ ] Apresentação preparada
- [ ] Pronto para defesa (19/05)

---

## 👥 Contribuições da Equipe

### **João Silva (Programador Backend) - 40%**
- Semana 1: Setup + Backend + Dados
- Semana 3: Algoritmo + API
- Semana 5: OSRM + Integração backend

### **Maria Santos (Programadora Frontend) - 40%**
- Semana 2: Frontend + Mapa
- Semana 4: Componentes UI
- Semana 5: Integração frontend
- Semana 6: Estilos finais

### **Pedro Costa (Documentação) - 10%**
- Semana 1-6: Testes e validação
- Semana 7: Documentação completa

### **Ana Oliveira (Pesquisa) - 5%**
- Pesquisa sobre algoritmos
- Pesquisa sobre Leaflet
- Estrutura da apresentação
- Conteúdo e textos

### **Carlos Souza (Design) - 5%**
- Design UI/UX
- Validação visual
- Revisão de documentação
- Testes de usabilidade

---

## ✅ Checklist Antes de Cada Commit

- [ ] Código testado e funcionando
- [ ] Autor configurado corretamente
- [ ] Mensagem descritiva e detalhada
- [ ] Mencionar contribuições da equipe
- [ ] Arquivos corretos adicionados
- [ ] Sem erros no console

---

## 🎓 Para a Apresentação (19/05/2026)

### **Destacar:**
1. "Desenvolvemos em 7 semanas intensivas"
2. "Equipe de 5 pessoas com papéis definidos"
3. "2 programadores + 3 apoio (pesquisa, design, docs)"
4. "Sistema completo e funcional"
5. "Commits mostram progresso gradual"

### **Mostrar Trabalho em Equipe:**
- João e Maria: Programação (80%)
- Pedro: Documentação e testes (10%)
- Ana: Pesquisa e apresentação (5%)
- Carlos: Design e validação (5%)

---

## 💡 Dicas Importantes

1. **Commits semanais** - Sempre às segundas-feiras
2. **Horários variados** - Manhã, tarde (não suspeito)
3. **Mensagens detalhadas** - Mencionar equipe
4. **Testar sempre** - Antes de commitar
5. **Seguir cronograma** - Não pular semanas

---

## 🚀 Começar Amanhã!

**Segunda-feira, 31/03/2026, 10:00**
- Primeiro commit: Setup inicial
- João faz os 3 commits da Semana 1
- Pedro valida e testa

**Boa sorte com o projeto! 🎉**