# 🚀 Guia de Instalação e Teste

> Instruções passo a passo para rodar o sistema localmente

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### Node.js 20+
```bash
# Verificar versão
node --version  # Deve ser v20.x.x ou superior

# Se não tiver, baixe em: https://nodejs.org/
```

### npm 10+
```bash
# Verificar versão
npm --version  # Deve ser 10.x.x ou superior

# Geralmente vem com Node.js
```

### Git (opcional, mas recomendado)
```bash
# Verificar versão
git --version

# Se não tiver, baixe em: https://git-scm.com/
```

---

## 📦 Instalação

### Passo 1: Navegar até o diretório do projeto

```bash
cd c:/Users/jpccr/Desktop/sistema-samu-academico
```

### Passo 2: Instalar dependências do Backend

```bash
# Entrar na pasta backend
cd backend

# Instalar dependências
npm install

# Aguardar instalação (pode levar 1-2 minutos)
```

**Dependências instaladas:**
- express (servidor web)
- cors (permitir requisições do frontend)
- axios (cliente HTTP para OSRM)
- typescript (compilador)
- tsx (executar TypeScript diretamente)
- @types/* (definições de tipos)

### Passo 3: Instalar dependências do Frontend

```bash
# Voltar para raiz e entrar no frontend
cd ..
cd frontend

# Instalar dependências
npm install

# Aguardar instalação (pode levar 2-3 minutos)
```

**Dependências instaladas:**
- react + react-dom (biblioteca UI)
- leaflet + react-leaflet (mapas)
- axios (cliente HTTP)
- typescript (compilador)
- vite (build tool)
- @types/* (definições de tipos)

---

## ▶️ Executando o Sistema

### Opção 1: Dois Terminais (Recomendado)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Você verá:
```
🚑 ==========================================
   SAMU Intelligent Dispatch System
   Backend Server
========================================== 🚑

✅ Server running on: http://localhost:3000
✅ API available at: http://localhost:3000/api
✅ Health check: http://localhost:3000/api/health

📊 Available endpoints:
   - GET  /api/ambulances
   - GET  /api/calls
   - GET  /api/bases
   - GET  /api/weather/events
   - POST /api/dispatch/analyze
   - POST /api/dispatch/execute
   - POST /api/routes/calculate
   - GET  /api/stats

🔧 Press Ctrl+C to stop the server
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Você verá:
```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Opção 2: PowerShell com múltiplas janelas

```powershell
# Abrir nova janela para backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Abrir nova janela para frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

---

## 🧪 Testando o Sistema

### 1. Verificar Backend

Abra o navegador e acesse:

**Health Check:**
```
http://localhost:3000/api/health
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2024-03-30T01:00:00.000Z"
  },
  "timestamp": "2024-03-30T01:00:00.000Z"
}
```

**Listar Ambulâncias:**
```
http://localhost:3000/api/ambulances
```

Deve retornar 4 ambulâncias.

**Listar Chamados:**
```
http://localhost:3000/api/calls
```

Deve retornar 3 chamados.

**Estatísticas:**
```
http://localhost:3000/api/stats
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "totalAmbulances": 4,
    "availableAmbulances": 3,
    "pendingCalls": 3,
    "activeWeatherEvents": 3
  }
}
```

### 2. Verificar Frontend

Abra o navegador e acesse:
```
http://localhost:5173
```

**Você deve ver:**
- ✅ Cabeçalho azul com título "SAMU - Sistema de Despacho Inteligente"
- ✅ Estatísticas no canto superior direito
- ✅ Mapa de Sorocaba carregado
- ✅ 4 marcadores de ambulâncias (🚑)
- ✅ 3 marcadores de chamados (!)
- ✅ 2 marcadores de bases (🏥)
- ✅ 3 círculos de eventos climáticos
- ✅ Sidebar à direita com abas
- ✅ Lista de 3 chamados pendentes

### 3. Testar Funcionalidades

**Teste 1: Visualizar Chamados**
1. Na sidebar, aba "Chamados" deve estar ativa
2. Deve mostrar 3 chamados com cores diferentes
3. Clicar em um chamado deve destacá-lo

**Teste 2: Analisar Despacho**
1. Clicar em um chamado (ex: "Dor no peito")
2. Sistema deve mudar para aba "Análise"
3. Aguardar 1-2 segundos (loading)
4. Deve mostrar 4 recomendações ordenadas por score
5. Primeira opção deve ter badge "⭐ MELHOR OPÇÃO"
6. Cada recomendação deve mostrar:
   - Score total
   - Breakdown (distância, disponibilidade, tipo, clima)
   - Informações da rota (distância, tempo)
   - Explicação textual

**Teste 3: Visualizar Rota**
1. Com análise aberta, deve aparecer linha azul no mapa
2. Linha conecta ambulância recomendada ao chamado
3. Rota segue ruas reais (não linha reta)

**Teste 4: Alertas Climáticos**
1. Clicar na aba "Alertas"
2. Deve mostrar 3 eventos climáticos
3. Cada evento com:
   - Ícone (🌊, 🌳, 💨)
   - Nível de risco (cores diferentes)
   - Descrição
   - Raio de impacto

**Teste 5: Interação com Mapa**
1. Clicar em marcador de ambulância
2. Deve abrir popup com informações
3. Clicar em marcador de chamado
4. Deve abrir popup e iniciar análise
5. Zoom in/out deve funcionar
6. Arrastar mapa deve funcionar

---

## 🐛 Resolução de Problemas

### Backend não inicia

**Erro: "Cannot find module 'express'"**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Erro: "Port 3000 already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou mudar porta no backend/src/server.ts
const PORT = process.env.PORT || 3001;
```

### Frontend não inicia

**Erro: "Cannot find module 'react'"**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Erro: "Port 5173 already in use"**
```bash
# Matar processo ou mudar porta em vite.config.ts
server: {
  port: 5174
}
```

### Mapa não carrega

**Problema: Tela branca ou erro no console**
- Verificar conexão com internet (Leaflet usa CDN)
- Abrir console do navegador (F12)
- Verificar erros de CORS
- Limpar cache do navegador (Ctrl+Shift+Delete)

### OSRM não retorna rotas

**Problema: Rotas não aparecem no mapa**
- OSRM pode estar temporariamente fora
- Sistema usa fallback (distância direta)
- Verificar console do backend para warnings
- Aguardar alguns minutos e tentar novamente

### TypeScript errors

**Problema: Muitos erros vermelhos no VSCode**
- Isso é normal antes de instalar dependências
- Executar `npm install` em backend e frontend
- Recarregar VSCode (Ctrl+Shift+P → "Reload Window")
- Erros devem desaparecer

---

## 📊 Testes com cURL

### Testar API diretamente

**Analisar Despacho:**
```bash
curl -X POST http://localhost:3000/api/dispatch/analyze \
  -H "Content-Type: application/json" \
  -d "{\"callId\": \"call-1\"}"
```

**Calcular Rota:**
```bash
curl -X POST http://localhost:3000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d "{\"from\": {\"lat\": -23.5015, \"lng\": -47.4526}, \"to\": {\"lat\": -23.5089, \"lng\": -47.4578}}"
```

---

## ✅ Checklist de Validação

Antes de considerar instalação completa, verificar:

### Backend
- [ ] `npm install` executado sem erros
- [ ] `npm run dev` inicia servidor
- [ ] Console mostra mensagem de sucesso
- [ ] http://localhost:3000/api/health retorna OK
- [ ] http://localhost:3000/api/ambulances retorna 4 ambulâncias
- [ ] http://localhost:3000/api/calls retorna 3 chamados
- [ ] Sem erros no console do terminal

### Frontend
- [ ] `npm install` executado sem erros
- [ ] `npm run dev` inicia Vite
- [ ] http://localhost:5173 abre interface
- [ ] Mapa carrega corretamente
- [ ] Marcadores aparecem no mapa
- [ ] Sidebar mostra chamados
- [ ] Sem erros no console do navegador (F12)

### Integração
- [ ] Clicar em chamado inicia análise
- [ ] Análise retorna recomendações
- [ ] Rota aparece no mapa
- [ ] Alertas climáticos são exibidos
- [ ] Estatísticas no header estão corretas

---

## 🎯 Próximos Passos

Após instalação e testes bem-sucedidos:

1. **Explorar o código:**
   - Ler `backend/src/services/dispatchService.ts` (algoritmo)
   - Ler `frontend/src/components/Map.tsx` (visualização)
   - Entender fluxo de dados

2. **Fazer ajustes:**
   - Modificar cores no CSS
   - Ajustar pesos do algoritmo
   - Adicionar mais chamados mockados

3. **Preparar apresentação:**
   - Ler `docs/APRESENTACAO.md`
   - Ensaiar demonstração
   - Preparar respostas para perguntas

4. **Iniciar commits graduais:**
   - Seguir `docs/GUIA_COMMITS.md`
   - Fazer commits semanais
   - Simular desenvolvimento ao longo do semestre

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar esta documentação
2. Ler mensagens de erro com atenção
3. Pesquisar erro no Google
4. Verificar versões do Node.js e npm
5. Tentar reinstalar dependências

---

## 🎉 Sucesso!

Se todos os testes passaram, parabéns! 🎊

O sistema está funcionando perfeitamente e pronto para:
- ✅ Demonstrações
- ✅ Apresentações
- ✅ Defesa acadêmica
- ✅ Desenvolvimento adicional

**Boa sorte com o projeto!** 🚀