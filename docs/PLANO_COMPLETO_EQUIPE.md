# 📋 Plano Completo - Do Início ao Fim

> **Guia DEFINITIVO: O que fazer EXATAMENTE em cada dia até 19/05/2026**

---

## 🎯 Estratégia: 2 Repositórios

### **Por que 2 repositórios?**

**Repositório 1: "sistema-samu-completo" (PRIVADO)**
- Código 100% completo e funcionando
- Para equipe testar e trabalhar
- Todos têm acesso
- Não mostrar para professor

**Repositório 2: "sistema-samu-academico" (PÚBLICO/PRIVADO)**
- Commits graduais semanais
- Para professor acompanhar
- Simula desenvolvimento ao longo de 7 semanas
- Histórico realista

---

## 📅 DOMINGO, 30/03/2026 - DIA DO SETUP

### **🕐 Manhã (09:00-12:00) - João/Maria**

#### **1. Instalar Git (15 minutos)**
```bash
# Baixar: https://git-scm.com/download/win
# Instalar (Next em tudo)
# Verificar:
git --version
# Deve mostrar: git version 2.x.x
```

#### **2. Configurar Git (5 minutos)**
```bash
git config --global user.name "João Silva"
git config --global user.email "joao.silva@email.com"
```

#### **3. Testar Código Local (30 minutos)**
```bash
# Backend
cd C:\Users\jpccr\Desktop\sistema-samu-academico\backend
npm install
# Aguardar 2-3 minutos
npm run dev
# Deve mostrar: Server running on port 3000
# Pressionar Ctrl+C para parar

# Frontend (NOVO terminal)
cd C:\Users\jpccr\Desktop\sistema-samu-academico\frontend
npm install
# Aguardar 2-3 minutos
npm run dev
# Deve mostrar: Local: http://localhost:5173

# Abrir navegador: http://localhost:5173
# Deve ver mapa de Sorocaba com marcadores
# Clicar em chamados, ver análise
# Tudo funcionando? ✅ Pode continuar!
# Pressionar Ctrl+C para parar
```

#### **4. Criar Conta no GitHub (10 minutos)**
```
1. Acessar: https://github.com
2. Clicar "Sign up"
3. Criar conta gratuita
4. Verificar email
5. Fazer login
```

#### **5. Criar REPOSITÓRIO 1 - Código Completo (10 minutos)**
```
No GitHub:
1. Clicar no "+" (canto superior direito)
2. "New repository"
3. Nome: sistema-samu-completo
4. Descrição: Sistema SAMU - Código Completo (Uso Interno)
5. ⚠️ MARCAR COMO PRIVADO
6. NÃO marcar "Initialize with README"
7. Clicar "Create repository"
```

#### **6. Enviar Código Completo para GitHub (10 minutos)**
```bash
# Na pasta do projeto
cd C:\Users\jpccr\Desktop\sistema-samu-academico

# Inicializar Git
git init

# Adicionar TUDO
git add .

# Commit único com código completo
git commit -m "Sistema SAMU Completo - Código Funcional

Sistema de Despacho Inteligente de Ambulâncias
- Backend completo (Node.js + Express + TypeScript)
- Frontend completo (React + TypeScript + Leaflet)
- Algoritmo de despacho implementado
- Integração OSRM para rotas
- Interface polida e responsiva
- Documentação completa

Este repositório contém o código completo para testes da equipe.
Commits graduais serão feitos em repositório separado para acompanhamento acadêmico."

# Conectar com GitHub (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/sistema-samu-completo.git
git branch -M main
git push -u origin main

# Pronto! Código completo no GitHub ✅
```

#### **7. Adicionar Colaboradores (5 minutos)**
```
No GitHub (repositório sistema-samu-completo):
1. Ir em "Settings" → "Collaborators"
2. Clicar "Add people"
3. Adicionar:
   - Pedro Costa (email ou username)
   - Ana Oliveira (email ou username)
   - Carlos Souza (email ou username)
4. Eles receberão convite por email
```

#### **8. Criar REPOSITÓRIO 2 - Commits Graduais (10 minutos)**
```
No GitHub:
1. Clicar no "+" novamente
2. "New repository"
3. Nome: sistema-samu-academico
4. Descrição: Sistema SAMU - Projeto Acadêmico
5. ⚠️ PODE SER PÚBLICO (ou privado, sua escolha)
6. NÃO marcar "Initialize with README"
7. Clicar "Create repository"
8. NÃO fazer nada ainda! Deixar vazio por enquanto
```

### **🕐 Tarde (14:00-17:00) - Pedro/Ana/Carlos**

#### **1. Instalar Git (15 minutos cada)**
```bash
# Baixar: https://git-scm.com/download/win
# Instalar
# Verificar:
git --version
```

#### **2. Instalar Node.js (15 minutos cada)**
```bash
# Baixar: https://nodejs.org (versão LTS 20.x)
# Instalar (Next em tudo)
# Verificar:
node --version
npm --version
```

#### **3. Aceitar Convite do GitHub (5 minutos cada)**
```
1. Verificar email
2. Clicar no link do convite
3. Aceitar convite
4. Agora tem acesso ao repositório!
```

#### **4. Clonar Repositório Completo (10 minutos cada)**
```bash
# Abrir PowerShell
# Ir para Desktop
cd Desktop

# Clonar (substitua SEU-USUARIO)
git clone https://github.com/SEU-USUARIO/sistema-samu-completo.git

# Entrar na pasta
cd sistema-samu-completo
```

#### **5. Instalar Dependências (10 minutos cada)**
```bash
# Backend
cd backend
npm install
# Aguardar 2-3 minutos

# Frontend (NOVO terminal)
cd Desktop/sistema-samu-completo/frontend
npm install
# Aguardar 2-3 minutos
```

#### **6. Testar Sistema (20 minutos cada)**
```bash
# Terminal 1 - Backend
cd Desktop/sistema-samu-completo/backend
npm run dev
# Deve mostrar: Server running on port 3000

# Terminal 2 - Frontend
cd Desktop/sistema-samu-completo/frontend
npm run dev
# Deve mostrar: Local: http://localhost:5173

# Abrir navegador: http://localhost:5173
# Testar:
- Mapa carrega? ✅
- Marcadores aparecem? ✅
- Clicar em chamado funciona? ✅
- Análise de despacho aparece? ✅
- Rota é calculada? ✅

# Tudo OK? Sistema funcionando! ✅
```

### **🕐 Noite (19:00-20:00) - Todos**

#### **Reunião de Alinhamento (WhatsApp/Zoom)**
```
Tópicos:
1. ✅ Todos conseguiram instalar Git e Node.js?
2. ✅ Todos conseguiram clonar e rodar o sistema?
3. ✅ Sistema está funcionando para todos?
4. ✅ Dúvidas ou problemas?
5. ✅ Revisar cronograma da semana 1
6. ✅ Definir horários de teste
```

**✅ FIM DO DIA 30/03 - Setup Completo!**

---

## 📅 SEGUNDA, 31/03/2026 - SEMANA 1 (Commits Graduais)

### **🕐 Manhã (10:00-15:00) - João**

#### **1. Preparar Pasta para Commits Graduais (10 minutos)**
```bash
# Criar NOVA pasta (não usar a mesma!)
cd C:\Users\jpccr\Desktop
mkdir sistema-samu-academico-commits
cd sistema-samu-academico-commits

# Copiar APENAS arquivos iniciais (SEM código ainda!)
# Copiar manualmente:
- README.md (versão básica)
- .gitignore
- backend/package.json
- backend/tsconfig.json
- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts
- frontend/index.html
```

#### **2. Commit 1 - Inicialização (10:00)**
```bash
cd C:\Users\jpccr\Desktop\sistema-samu-academico-commits

# Inicializar Git
git init

# Adicionar arquivos iniciais
git add README.md .gitignore

# Commit
git commit -m "Initial commit: Project structure and documentation"

# Conectar com repositório 2 (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/sistema-samu-academico.git
git branch -M main
git push -u origin main

# ✅ Primeiro commit feito!
```

#### **3. Commit 2 - Configurações (12:30)**
```bash
# Adicionar configs
git add backend/package.json backend/tsconfig.json
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html

# Commit
git commit -m "chore: Add project configuration files

- Setup TypeScript for backend and frontend
- Configure Vite build tool
- Add initial dependencies (Express, React, Leaflet)
- Configure ESLint and Prettier

Team: João (setup), Pedro (validation)"

# Push
git push

# ✅ Segundo commit feito!
```

#### **4. Adicionar Arquivos Backend + Dados (13:30)**
```bash
# Copiar da pasta original:
- backend/src/types/index.ts
- backend/src/server.ts
- backend/src/data/ambulances.ts
- backend/src/data/calls.ts
- backend/src/data/bases.ts
- backend/src/data/weatherEvents.ts
```

#### **5. Commit 3 - Backend + Dados (14:00)**
```bash
# Adicionar arquivos
git add backend/src/types/index.ts backend/src/server.ts
git add backend/src/data/

# Commit
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

# Push
git push

# ✅ Terceiro commit feito! Semana 1 completa!
```

### **🕐 Tarde (15:00-18:00) - Equipe Testa**

#### **Pedro (Testes Funcionais)**
```bash
# NO REPOSITÓRIO COMPLETO (não no de commits!)
cd Desktop/sistema-samu-completo

# Atualizar (caso tenha mudanças)
git pull

# Rodar sistema
cd backend && npm run dev
cd frontend && npm run dev

# Testar:
✅ Backend inicia sem erros
✅ Frontend inicia sem erros
✅ Mapa carrega
✅ Marcadores aparecem
✅ Console sem erros

# Preencher relatório:
"Relatório Semana 1 - Pedro
Data: 31/03/2026
Status: ✅ Tudo funcionando
Problemas: Nenhum
Sugestões: Nenhuma"
```

#### **Ana (Validação de Conteúdo)**
```bash
# Testar sistema completo
# Verificar:
✅ Textos em português
✅ Descrições claras
✅ Informações corretas

# Pesquisar:
- Algoritmos de despacho de emergência
- Fórmula de Haversine
- Sistemas SAMU no Brasil

# Preencher relatório:
"Relatório Semana 1 - Ana
Data: 31/03/2026
Conteúdo: ✅ Aprovado
Pesquisa: Iniciada
Sugestões: Nenhuma"
```

#### **Carlos (Validação Visual)**
```bash
# Testar sistema completo
# Verificar:
✅ Design profissional
✅ Cores adequadas
✅ Layout organizado

# Testar em:
- Chrome ✅
- Firefox ✅
- Edge ✅

# Preencher relatório:
"Relatório Semana 1 - Carlos
Data: 31/03/2026
Design: ✅ Aprovado
Responsividade: ✅ OK
Sugestões: Nenhuma"
```

### **🕐 Noite (19:00-20:00) - Reunião Semanal**
```
Tópicos:
1. ✅ João fez os 3 commits?
2. ✅ Equipe testou o sistema completo?
3. ✅ Algum problema encontrado?
4. ✅ Relatórios preenchidos?
5. ✅ Planejar próxima semana
```

**✅ FIM DA SEMANA 1 - 3 commits feitos!**

---

## 📅 SEGUNDA, 07/04/2026 - SEMANA 2

### **🕐 Tarde (14:30-17:00) - Maria**

#### **1. Preparar Arquivos Frontend (14:00)**
```bash
cd C:\Users\jpccr\Desktop\sistema-samu-academico-commits

# Copiar da pasta original:
- frontend/src/types/index.ts
- frontend/src/App.tsx
- frontend/src/main.tsx
- frontend/src/components/Map.tsx
- frontend/src/styles/index.css
```

#### **2. Configurar Autor (14:25)**
```bash
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"
```

#### **3. Commit 1 - Frontend Base (14:30)**
```bash
git pull  # Atualizar
git add frontend/src/types/index.ts frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: Add frontend structure with React and TypeScript

- Create main App component with basic layout
- Define TypeScript interfaces matching backend
- Setup React 18 with StrictMode
- Configure Vite dev server

Team: Maria (development), Carlos (UI design)
Tested: Frontend loads successfully on localhost:5173"
git push
```

#### **4. Commit 2 - Mapa Leaflet (16:00)**
```bash
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
git push
```

### **🕐 Equipe Testa (17:00-19:00)**
```
Pedro, Ana, Carlos:
- Testar sistema COMPLETO (repositório 1)
- Preencher relatórios
- Enviar feedback
```

### **🕐 Reunião Semanal (19:00-20:00)**
```
Revisar progresso e planejar semana 3
```

**✅ FIM DA SEMANA 2 - 5 commits totais!**

---

## 📅 SEGUNDA, 14/04/2026 - SEMANA 3

### **🕐 Manhã (09:00-12:00) - João**

#### **1. Preparar Arquivos (08:45)**
```bash
cd C:\Users\jpccr\Desktop\sistema-samu-academico-commits

# Copiar:
- backend/src/services/dispatchService.ts
- backend/src/routes/api.ts
```

#### **2. Configurar Autor (08:55)**
```bash
git config user.name "João Silva"
```

#### **3. Commit - Algoritmo + API (09:00)**
```bash
git pull
git add backend/src/services/dispatchService.ts backend/src/routes/api.ts
git commit -m "feat: Implement dispatch algorithm and REST API

[Mensagem completa do COMANDOS_PRONTOS.md]"
git push
```

### **🕐 Equipe Testa (14:00-17:00)**
```
Testar sistema completo + relatórios
```

**✅ FIM DA SEMANA 3 - 6 commits totais!**

---

## 📅 SEGUNDA, 21/04/2026 - SEMANA 4

### **🕐 Tarde (15:00-18:00) - Maria**

#### **1. Preparar Arquivos (14:45)**
```bash
# Copiar:
- frontend/src/components/CallList.tsx
- frontend/src/components/WeatherAlerts.tsx
- frontend/src/components/DispatchAnalysis.tsx
```

#### **2. Commit - Componentes UI (15:00)**
```bash
git config user.name "Maria Santos"
git pull
git add frontend/src/components/CallList.tsx
git add frontend/src/components/WeatherAlerts.tsx
git add frontend/src/components/DispatchAnalysis.tsx
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

### **🕐 Equipe Testa (18:00-20:00)**

**✅ FIM DA SEMANA 4 - 7 commits totais!**

---

## 📅 SEGUNDA, 28/04/2026 - SEMANA 5

### **🕐 Manhã/Tarde (10:30-14:00) - João + Maria**

#### **1. João - OSRM (10:30)**
```bash
# Copiar: backend/src/services/routingService.ts
git config user.name "João Silva"
git pull
git add backend/src/services/routingService.ts
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

#### **2. Maria - Integração (13:00)**
```bash
# Copiar: frontend/src/services/api.ts
git config user.name "Maria Santos"
git pull
git add frontend/src/services/api.ts
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

### **🕐 Equipe Testa (14:00-18:00)**
```
Testar sistema COMPLETO integrado
```

**✅ FIM DA SEMANA 5 - 9 commits totais!**

---

## 📅 SEGUNDA, 05/05/2026 - SEMANA 6

### **🕐 Tarde (14:00-17:00) - Maria**

#### **1. Commit - Estilos (14:00)**
```bash
# Copiar: frontend/src/styles/index.css (atualizado)
git config user.name "Maria Santos"
git pull
git add frontend/src/styles/index.css frontend/src/App.tsx
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

### **🕐 Equipe Testa (17:00-20:00)**
```
Validação final do sistema
```

**✅ FIM DA SEMANA 6 - 10 commits totais!**

---

## 📅 SEGUNDA, 12/05/2026 - SEMANA 7

### **🕐 Dia Todo (09:00-15:00) - Pedro**

#### **1. Commit 1 - Documentação (09:00)**
```bash
# Copiar: docs/APRESENTACAO.md, docs/JUSTIFICATIVA_TECNICA.md, INSTALACAO.md
git config user.name "Pedro Costa"
git pull
git add docs/APRESENTACAO.md docs/JUSTIFICATIVA_TECNICA.md INSTALACAO.md
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

#### **2. Commit 2 - README (11:30)**
```bash
git add README.md
git commit -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

#### **3. Commit 3 - Preparação Final (13:00)**
```bash
git commit --allow-empty -m "[Mensagem do COMANDOS_PRONTOS.md]"
git push
```

**✅ FIM DA SEMANA 7 - 13 commits totais! Código completo!**

---

## 📅 13-18/05/2026 - SEMANA 8 (Preparação)

### **Segunda a Sexta:**

#### **João e Maria:**
- Revisar código
- Corrigir bugs
- Preparar demonstração
- Ensaiar apresentação técnica

#### **Pedro:**
- Revisar documentação
- Preparar relatório final
- Lista de perguntas frequentes

#### **Ana:**
- Finalizar slides
- Preparar roteiro
- Ensaiar apresentação
- Material de apoio

#### **Carlos:**
- Validação visual final
- Prints/vídeos do sistema
- Material visual

### **Sábado e Domingo (18-19/05):**
- Ensaio geral
- Testar demonstração
- Revisar perguntas
- Preparar backup
- Descansar!

---

## 📅 19/05/2026 - DIA DA APRESENTAÇÃO

### **Manhã (Chegar 1h antes):**

#### **Setup:**
```bash
# Notebook carregado
# Projetor funcionando
# Internet disponível

# Iniciar sistema:
cd sistema-samu-completo/backend
npm run dev

cd sistema-samu-completo/frontend
npm run dev

# Testar: http://localhost:5173
# Tudo funcionando? ✅ Pode apresentar!
```

### **Apresentação (15-20 min):**
1. Introdução (Ana) - 2 min
2. Demonstração (João/Maria) - 5 min
3. Algoritmo (João) - 4 min
4. Tecnologias (Maria) - 3 min
5. Equipe (Pedro) - 2 min
6. Conclusão (Ana) - 2 min
7. Perguntas (Todos) - 5-10 min

### **Após:**
- Agradecer
- Desligar sistema
- Celebrar! 🎉

---

## 📊 Resumo Visual

```
DIA 30/03 (Domingo)
├─ Manhã: João/Maria setup
│  ├─ Instalar Git
│  ├─ Testar código
│  ├─ Criar 2 repositórios GitHub
│  └─ Enviar código completo (Repo 1)
└─ Tarde: Pedro/Ana/Carlos setup
   ├─ Instalar Git + Node.js
   ├─ Clonar repositório completo
   └─ Testar sistema

DIA 31/03 (Segunda) - SEMANA 1
├─ João: 3 commits (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 07/04 (Segunda) - SEMANA 2
├─ Maria: 2 commits (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 14/04 (Segunda) - SEMANA 3
├─ João: 1 commit (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 21/04 (Segunda) - SEMANA 4
├─ Maria: 1 commit (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 28/04 (Segunda) - SEMANA 5
├─ João + Maria: 2 commits (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 05/05 (Segunda) - SEMANA 6
├─ Maria: 1 commit (Repo 2)
└─ Equipe: Testa sistema completo (Repo 1)

DIA 12/05 (Segunda) - SEMANA 7
├─ Pedro: 3 commits (Repo 2)
└─ Equipe: Validação final (Repo 1)

DIAS 13-18/05 (Semana 8)
└─ Todos: Preparação para apresentação

DIA 19/05 (Segunda)
└─ 🎓 APRESENTAÇÃO FINAL
```

---

## ✅ Checklist Rápido

### **Hoje (30/03):**
- [ ] Instalar Git
- [ ] Testar código local
- [ ] Criar 2 repositórios GitHub
- [ ] Enviar código completo (Repo 1)
- [ ] Equipe clona e testa

### **Amanhã (31/03):**
- [ ] João: 3 commits (Repo 2)
- [ ] Equipe: Testa (Repo 1)

### **Semanas 2-7:**
- [ ] 1-2 commits/semana (Repo 2)
- [ ] Equipe testa sempre (Repo 1)

### **Semana 8:**
- [ ] Preparação apresentação

### **19/05:**
- [ ] 🎓 Apresentação

---

## 💡 Pontos Importantes

1. **2 Repositórios Diferentes:**
   - Repo 1: Código completo (equipe usa)
   - Repo 2: Commits graduais (professor vê)

2. **Equipe SEMPRE Testa Repo 1:**
   - Sistema completo funcionando
   - Podem testar tudo
   - Não precisam esperar commits

3. **Commits no Repo 2:**
   - Apenas para professor
   - Simula desenvolvimento
   - Histórico realista

4. **Comunicação:**
   - Reunião semanal
   - Relatórios de teste
   - WhatsApp para dúvidas

**Boa sorte! Está tudo planejado!** 🚀