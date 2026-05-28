# 🚑 Sistema de Despacho Inteligente de Ambulâncias SAMU

> **Projeto Acadêmico** - Usina de Projetos Experimentais  
> Sistema web para otimização de despacho de ambulâncias considerando múltiplos fatores

---

## 📋 Sobre o Projeto

Sistema que **recomenda a melhor ambulância** e **calcula a melhor rota** para atendimentos de emergência do SAMU, considerando:
- Distância até o chamado
- Disponibilidade da ambulância
- Tipo adequado para emergência
- **Análise de risco geográfico** (topografia, hidrografia, arborização)
- Condições climáticas atuais

### 🗺️ Demonstração: Sorocaba/SP

O MVP utiliza dados mockados da cidade de Sorocaba para demonstração acadêmica.

### ⚠️ Importante: Análise de Risco, não Tempo Real

O sistema **NÃO detecta eventos em tempo real**. Ele **calcula probabilidades de risco** baseado em:
- Dados geográficos (topografia, hidrografia, arborização)
- Condições climáticas atuais
- Análise preditiva (similar à Defesa Civil)

**Exemplo:** "ALTO risco de alagamento" = 89% de probabilidade baseado em topografia baixa + proximidade a córrego + chuva forte.

Ver `docs/JUSTIFICATIVA_TECNICA.md` para detalhes.

---

## 🎯 Funcionalidades

### 1. Dashboard Interativo
- Mapa de Sorocaba com marcadores
- 4 ambulâncias (USA, USB, Motolância)
- 3 chamados de emergência
- 2 bases operacionais
- 3 eventos climáticos

### 2. Sistema de Despacho Inteligente
Algoritmo de score ponderado:
- **Distância** (40%): Quanto mais próximo, melhor
- **Disponibilidade** (30%): Ambulância livre tem prioridade
- **Tipo** (20%): USA para emergências graves
- **Análise de Risco** (10%): Penaliza rotas com probabilidade de eventos adversos

### 3. Cálculo de Rota e Análise de Risco
- Rota visual no mapa (OSRM)
- Distância total e tempo estimado
- Instruções passo a passo
- **Análise preditiva de riscos** baseada em:
  - Topografia (áreas baixas = risco de alagamento)
  - Hidrografia (proximidade a córregos)
  - Arborização (densidade de árvores)
  - Clima atual (chuva, vento)

---

## 💻 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js 20 + Express + TypeScript
- **Mapa:** Leaflet + OpenStreetMap
- **Rotas:** OSRM (gratuito)
- **Dados:** JSON mockados

---

## 📦 Instalação

### Pré-requisitos
- Node.js 20+ ([Download](https://nodejs.org/))
- npm 10+

### Backend

```bash
cd backend
npm install
npm run dev
```

Servidor rodará em: `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Interface rodará em: `http://localhost:5173`

---

## 🧪 Testando o Sistema

### 1. Health Check
Abra: `http://localhost:3000/api/health`

### 2. Ver Ambulâncias
Abra: `http://localhost:3000/api/ambulances`

### 3. Ver Chamados
Abra: `http://localhost:3000/api/calls`

### 4. Analisar Despacho
```bash
curl -X POST http://localhost:3000/api/dispatch/analyze \
  -H "Content-Type: application/json" \
  -d '{"callId": "call-1"}'
```

### 5. Interface Web
Abra: `http://localhost:5173`

---

## 📊 Estrutura do Projeto

```
sistema-samu-academico/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Servidor Express
│   │   ├── data/
│   │   │   ├── ambulances.ts      # 4 ambulâncias
│   │   │   ├── calls.ts           # 3 chamados
│   │   │   ├── bases.ts           # 2 bases
│   │   │   └── weatherEvents.ts   # 3 eventos
│   │   ├── services/
│   │   │   ├── dispatchService.ts # Algoritmo
│   │   │   └── routingService.ts  # OSRM
│   │   ├── routes/
│   │   │   └── api.ts             # Endpoints
│   │   └── types/
│   │       └── index.ts           # Interfaces
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Componente raiz
│   │   ├── components/
│   │   │   ├── Map.tsx            # Mapa Leaflet
│   │   │   ├── CallList.tsx       # Lista chamados
│   │   │   ├── DispatchAnalysis.tsx # Análise
│   │   │   └── WeatherAlerts.tsx  # Alertas
│   │   ├── services/
│   │   │   └── api.ts             # Cliente HTTP
│   │   ├── types/
│   │   │   └── index.ts           # Interfaces
│   │   └── styles/
│   │       └── index.css          # Estilos
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docs/
│   ├── GUIA_COMMITS.md            # Guia de commits semanais
│   └── APRESENTACAO.md            # Material para banca
│
└── README.md
```

---

## 🎓 Dados Mockados vs Produção

### MVP (Atual)
✅ Dados mockados de Sorocaba  
✅ 4 ambulâncias, 3 chamados, 2 bases  
✅ 3 eventos climáticos fixos  
✅ Algoritmo funcional  
✅ Rotas reais (OSRM)  

### Produção (Futuro)
🔄 Integração com APIs governamentais:
- IBGE (topografia)
- GeoSampa/GeoPortal (árvores)
- Defesa Civil (alagamentos)
- INMET (clima em tempo real)
- CPTEC (ventos)

🔄 Banco de dados PostgreSQL  
🔄 GPS em tempo real  
🔄 Autenticação de usuários  
🔄 Suporte a múltiplas cidades  

---

## 🧮 Algoritmo de Despacho

### Fórmula do Score

```
Score Total = (Score Distância × 0.4) + 
              (Score Disponibilidade × 0.3) + 
              (Score Tipo × 0.2) + 
              (Penalidade Climática × 0.1)
```

### Cálculo de Distância
- Fórmula de Haversine (distância entre coordenadas)
- Score: 100 pontos para 0km, decrescendo até 0 para 20km+

### Score de Disponibilidade
- DISPONIVEL: 100 pontos
- EM_ATENDIMENTO: 30 pontos
- INDISPONIVEL: 0 pontos

### Score de Tipo
Baseado na gravidade do chamado:
- EMERGENCIA → USA (100), USB (70), MOTO (50)
- URGENTE → USB (100), USA (90), MOTO (60)
- PRIORITARIO → MOTO (100), USB (80), USA (70)

### Penalidade Climática
Se ambulância próxima a evento:
- CRITICO: -15 pontos
- ALTO: -10 pontos
- MEDIO: -5 pontos
- BAIXO: -2 pontos

---

## 📝 API Endpoints

### Ambulâncias
- `GET /api/ambulances` - Listar todas
- `GET /api/ambulances/available` - Disponíveis
- `GET /api/ambulances/:id` - Específica

### Chamados
- `GET /api/calls` - Listar todos
- `GET /api/calls/pending` - Pendentes
- `POST /api/calls` - Criar novo

### Eventos Climáticos
- `GET /api/weather/events` - Eventos ativos

### Despacho
- `POST /api/dispatch/analyze` - Analisar e recomendar
- `POST /api/dispatch/execute` - Executar despacho

### Rotas
- `POST /api/routes/calculate` - Calcular rota

### Utilitários
- `GET /api/health` - Health check
- `GET /api/stats` - Estatísticas

---

## 🎯 Exemplo de Uso

### 1. Listar Chamados Pendentes
```bash
curl http://localhost:3000/api/calls/pending
```

### 2. Analisar Melhor Ambulância
```bash
curl -X POST http://localhost:3000/api/dispatch/analyze \
  -H "Content-Type: application/json" \
  -d '{"callId": "call-1"}'
```

Resposta:
```json
{
  "success": true,
  "data": {
    "callId": "call-1",
    "recommendations": [
      {
        "ambulanceId": "amb-1",
        "score": 87,
        "route": {
          "distance": 3200,
          "duration": 480,
          "riskLevel": "BAIXO"
        },
        "explanation": "USA-01 é a melhor opção..."
      }
    ]
  }
}
```

### 3. Executar Despacho
```bash
curl -X POST http://localhost:3000/api/dispatch/execute \
  -H "Content-Type: application/json" \
  -d '{"callId": "call-1", "ambulanceId": "amb-1"}'
```

---

## 🎓 Defesa Técnica

### Perguntas Esperadas

**P: Por que dados mockados?**
> "Usamos dados mockados para demonstração acadêmica. Não temos acesso às APIs governamentais (IBGE, INMET) que requerem cadastro institucional. Em produção, integraríamos com essas APIs."

**P: Como seria com dados reais?**
> "Substituiríamos os arquivos JSON por consultas a banco de dados PostgreSQL e integração com APIs governamentais via REST. O código está estruturado para facilitar essa migração."

**P: Como funciona o algoritmo?**
> "Usamos score ponderado com 4 fatores: distância (40%), disponibilidade (30%), tipo (20%) e clima (10%). Cada fator gera pontuação de 0-100, multiplicada pelo peso, resultando no score final."

**P: Como calculam a distância?**
> "Usamos a fórmula de Haversine, que calcula distância entre coordenadas geográficas considerando a curvatura da Terra. É a forma mais precisa para distâncias curtas."

**P: E se o OSRM ficar fora do ar?**
> "Implementamos fallback: se OSRM falhar, usamos cálculo de distância direta (Haversine) e estimamos tempo baseado em velocidade média."

---

## 👥 Equipe

- **Membro A:** Backend + Git
- **Membro B:** Frontend
- **Membro C:** Documentação + Testes

---

## 📅 Cronograma

Desenvolvimento distribuído em 12 semanas (ver `docs/GUIA_COMMITS.md`)

---

## 💰 Custo

**MVP:** R$ 0,00 (tudo gratuito)

**Produção:**
- APIs governamentais: Gratuitas
- OpenWeatherMap: R$ 0-200/mês
- Servidor: R$ 50-200/mês

---

## 📚 Documentação Adicional

- [Guia de Commits Semanais](docs/GUIA_COMMITS.md)
- [Material para Apresentação](docs/APRESENTACAO.md)

---

## 🚀 Próximos Passos

1. Testar o sistema localmente
2. Validar funcionalidades
3. Estudar o código
4. Iniciar commits graduais (ver guia)
5. Preparar apresentação

---

## 📄 Licença

Projeto acadêmico - Uso educacional

---

## 🤝 Contribuindo

Este é um projeto acadêmico. Para sugestões ou melhorias, entre em contato com a equipe.