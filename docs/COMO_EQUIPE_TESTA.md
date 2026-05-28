# 👥 Como a Equipe Testa o Código

> **Guia para Pedro, Ana e Carlos testarem o sistema sem precisar programar**

---

## 🎯 Situação Atual

**Problema:** O código está rodando apenas no PC do João/Maria (programadores)

**Solução:** Compartilhar o código com a equipe para que todos possam testar

---

## 📤 Opção 1: Compartilhar via GitHub (RECOMENDADO)

### **Passo 1: João/Maria cria repositório no GitHub**

1. **Criar conta no GitHub:**
   - Acesse: https://github.com
   - Clique "Sign up"
   - Crie conta gratuita

2. **Criar repositório:**
   - Clique no "+" no canto superior direito
   - "New repository"
   - Nome: `sistema-samu-academico`
   - Descrição: `Sistema de Despacho Inteligente SAMU`
   - **Privado** (para não ficar público)
   - Clique "Create repository"

3. **Conectar repositório local:**
   ```bash
   # No PC do João/Maria
   cd C:\Users\jpccr\Desktop\sistema-samu-academico
   
   git remote add origin https://github.com/SEU-USUARIO/sistema-samu-academico.git
   git branch -M main
   git push -u origin main
   ```

4. **Adicionar colaboradores:**
   - No GitHub, vá em "Settings" → "Collaborators"
   - Clique "Add people"
   - Adicione Pedro, Ana e Carlos pelos emails/usernames

### **Passo 2: Pedro/Ana/Carlos baixam o código**

1. **Instalar Git:**
   - Windows: https://git-scm.com/download/win
   - Instalar (Next em tudo)

2. **Instalar Node.js:**
   - Acesse: https://nodejs.org
   - Baixe versão LTS (20.x)
   - Instale (Next em tudo)

3. **Clonar repositório:**
   ```bash
   # Abrir PowerShell
   # Navegar para onde quer salvar (ex: Desktop)
   cd Desktop
   
   # Clonar (substitua SEU-USUARIO)
   git clone https://github.com/SEU-USUARIO/sistema-samu-academico.git
   
   # Entrar na pasta
   cd sistema-samu-academico
   ```

4. **Instalar dependências:**
   ```bash
   # Backend
   cd backend
   npm install
   # Aguardar 2-3 minutos
   
   # Frontend (abrir NOVO terminal)
   cd Desktop/sistema-samu-academico/frontend
   npm install
   # Aguardar 2-3 minutos
   ```

5. **Rodar o sistema:**
   ```bash
   # Terminal 1 - Backend
   cd Desktop/sistema-samu-academico/backend
   npm run dev
   # Deve mostrar: Server running on port 3000
   
   # Terminal 2 - Frontend
   cd Desktop/sistema-samu-academico/frontend
   npm run dev
   # Deve mostrar: Local: http://localhost:5173
   ```

6. **Testar no navegador:**
   - Abrir: http://localhost:5173
   - Deve ver o mapa de Sorocaba
   - Clicar em chamados
   - Ver análise de despacho

### **Passo 3: Atualizar código (quando João/Maria fizerem commits)**

```bash
# Pedro/Ana/Carlos executam:
cd Desktop/sistema-samu-academico
git pull

# Se backend mudou:
cd backend
npm install
npm run dev

# Se frontend mudou:
cd frontend
npm install
npm run dev
```

---

## 📤 Opção 2: Compartilhar via Google Drive/OneDrive

### **Passo 1: João/Maria compacta o código**

```bash
# No PC do João/Maria
# Copiar pasta inteira (SEM node_modules!)
# Criar arquivo .zip

# Ou via linha de comando (excluindo node_modules):
# Windows PowerShell:
Compress-Archive -Path sistema-samu-academico -DestinationPath sistema-samu.zip -Force
```

### **Passo 2: Upload para nuvem**

1. **Google Drive:**
   - Fazer upload do .zip
   - Compartilhar link com a equipe
   - Dar permissão de visualização

2. **OneDrive:**
   - Fazer upload do .zip
   - Compartilhar link com a equipe

### **Passo 3: Pedro/Ana/Carlos baixam e testam**

1. **Baixar arquivo:**
   - Clicar no link compartilhado
   - Baixar o .zip
   - Extrair para Desktop

2. **Instalar Node.js** (se não tiver):
   - https://nodejs.org
   - Versão LTS (20.x)

3. **Instalar dependências e rodar:**
   ```bash
   # Backend
   cd Desktop/sistema-samu-academico/backend
   npm install
   npm run dev
   
   # Frontend (novo terminal)
   cd Desktop/sistema-samu-academico/frontend
   npm install
   npm run dev
   ```

4. **Testar no navegador:**
   - http://localhost:5173

---

## 📤 Opção 3: Compartilhar via Pendrive/WhatsApp

### **Para arquivos pequenos:**

1. **João/Maria copia pasta para pendrive**
   - Copiar `sistema-samu-academico` (SEM node_modules!)

2. **Pedro/Ana/Carlos copiam para seus PCs**
   - Colar no Desktop

3. **Instalar e rodar** (mesmo processo acima)

---

## 🧪 O Que Cada Membro Testa

### **Pedro Costa (Documentação e Testes):**

**Testes Funcionais:**
- [ ] Backend inicia sem erros
- [ ] Frontend inicia sem erros
- [ ] Mapa carrega corretamente
- [ ] Marcadores aparecem (ambulâncias, chamados, bases)
- [ ] Clicar em chamado funciona
- [ ] Análise de despacho retorna resultados
- [ ] Rotas são calculadas
- [ ] Não há erros no console do navegador

**Como testar:**
```bash
# 1. Rodar backend e frontend
# 2. Abrir http://localhost:5173
# 3. Abrir DevTools (F12)
# 4. Clicar em cada chamado
# 5. Verificar se análise aparece
# 6. Anotar qualquer erro
```

**Testes de API (Postman/curl):**
```bash
# Testar endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ambulances
curl http://localhost:3000/api/calls
```

### **Ana Oliveira (Pesquisa e Apresentação):**

**Testes de Conteúdo:**
- [ ] Textos estão em português
- [ ] Descrições são claras
- [ ] Informações estão corretas
- [ ] Interface é intuitiva

**Pesquisa:**
- [ ] Pesquisar sobre algoritmos de despacho
- [ ] Pesquisar sobre fórmula de Haversine
- [ ] Pesquisar sobre sistemas SAMU
- [ ] Preparar material para apresentação

**Como testar:**
```
1. Usar o sistema como usuário final
2. Anotar dúvidas ou confusões
3. Sugerir melhorias de texto
4. Validar informações técnicas
```

### **Carlos Souza (Design e Validação):**

**Testes Visuais:**
- [ ] Interface é bonita e profissional
- [ ] Cores são adequadas (emergência)
- [ ] Botões são claros
- [ ] Layout é organizado
- [ ] Responsivo (testar em diferentes tamanhos)

**Como testar:**
```
1. Abrir sistema no navegador
2. Redimensionar janela (simular mobile)
3. Testar em diferentes navegadores (Chrome, Firefox, Edge)
4. Anotar problemas visuais
5. Sugerir melhorias de design
```

**Testar Responsividade:**
```
1. Abrir DevTools (F12)
2. Clicar no ícone de celular (Toggle device toolbar)
3. Testar em:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)
```

---

## 📝 Relatório de Testes

### **Template para Pedro:**

```markdown
# Relatório de Testes - Semana X

**Data:** ___/___/___
**Testador:** Pedro Costa
**Versão:** Commit #___

## Testes Realizados:
- [ ] Backend iniciou: ✅ / ❌
- [ ] Frontend iniciou: ✅ / ❌
- [ ] Mapa carregou: ✅ / ❌
- [ ] Marcadores visíveis: ✅ / ❌
- [ ] Análise funciona: ✅ / ❌
- [ ] Rotas calculadas: ✅ / ❌

## Problemas Encontrados:
1. _______________
2. _______________

## Sugestões:
1. _______________
2. _______________

## Status Geral: ✅ Aprovado / ⚠️ Com ressalvas / ❌ Reprovado
```

### **Template para Ana:**

```markdown
# Validação de Conteúdo - Semana X

**Data:** ___/___/___
**Validador:** Ana Oliveira

## Textos Revisados:
- [ ] Interface em português: ✅ / ❌
- [ ] Descrições claras: ✅ / ❌
- [ ] Informações corretas: ✅ / ❌

## Pesquisa Realizada:
- Algoritmos de despacho: _______________
- Fórmula de Haversine: _______________
- Sistemas SAMU: _______________

## Sugestões de Melhoria:
1. _______________
2. _______________
```

### **Template para Carlos:**

```markdown
# Validação Visual - Semana X

**Data:** ___/___/___
**Designer:** Carlos Souza

## Aspectos Visuais:
- [ ] Design profissional: ✅ / ❌
- [ ] Cores adequadas: ✅ / ❌
- [ ] Layout organizado: ✅ / ❌
- [ ] Responsivo: ✅ / ❌

## Testado em:
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1920px)

## Problemas Visuais:
1. _______________
2. _______________

## Sugestões de Design:
1. _______________
2. _______________
```

---

## 🔄 Fluxo de Trabalho Semanal

### **Segunda-feira (Dia do Commit):**

1. **João/Maria fazem commits**
2. **João/Maria fazem push para GitHub**
   ```bash
   git push
   ```

3. **Pedro/Ana/Carlos atualizam código**
   ```bash
   git pull
   npm install  # Se necessário
   ```

4. **Equipe testa durante a semana**

### **Durante a Semana:**

1. **Pedro:** Testes funcionais
2. **Ana:** Validação de conteúdo
3. **Carlos:** Validação visual
4. **Todos:** Reportam problemas no WhatsApp/grupo

### **Domingo (Antes do próximo commit):**

1. **Equipe envia relatórios**
2. **João/Maria corrigem problemas**
3. **Preparam próximo commit**

---

## 💡 Dicas Importantes

### **Para Quem Não Programa:**

1. **Não precisa entender o código!**
   - Foco em testar se funciona
   - Validar visual e conteúdo
   - Reportar problemas

2. **Como reportar problemas:**
   ```
   ❌ Ruim: "Não funciona"
   ✅ Bom: "Quando clico no chamado 'Dor no peito', 
            nada acontece. Console mostra erro 404."
   ```

3. **Tirar prints:**
   - Print da tela quando der erro
   - Print do console (F12)
   - Facilita correção

4. **Testar em horários diferentes:**
   - Não deixar para última hora
   - Testar várias vezes
   - Anotar tudo

---

## 🚨 Problemas Comuns

### **"npm install falha"**
```bash
# Limpar cache
npm cache clean --force

# Tentar novamente
npm install
```

### **"Porta 3000 já está em uso"**
```bash
# Windows: Matar processo
netstat -ano | findstr :3000
taskkill /PID [número] /F

# Ou mudar porta no backend/src/server.ts
```

### **"Frontend não conecta com backend"**
```bash
# Verificar se backend está rodando
# Abrir http://localhost:3000/api/health
# Deve retornar: {"status": "ok"}
```

### **"Git pull dá conflito"**
```bash
# Descartar mudanças locais
git reset --hard
git pull
```

---

## ✅ Checklist de Setup (Para Cada Membro)

### **Pedro Costa:**
- [ ] Git instalado
- [ ] Node.js instalado
- [ ] Código clonado/baixado
- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Postman instalado (opcional)
- [ ] Template de relatório pronto

### **Ana Oliveira:**
- [ ] Git instalado
- [ ] Node.js instalado
- [ ] Código clonado/baixado
- [ ] Sistema rodando
- [ ] Pesquisa iniciada
- [ ] Template de validação pronto

### **Carlos Souza:**
- [ ] Git instalado
- [ ] Node.js instalado
- [ ] Código clonado/baixado
- [ ] Sistema rodando
- [ ] Navegadores instalados (Chrome, Firefox, Edge)
- [ ] Template de validação pronto

---

## 🎯 Resumo

**Melhor opção:** GitHub (Opção 1)
- Fácil de atualizar
- Todos têm acesso
- Histórico de versões

**Como funciona:**
1. João/Maria fazem commits e push
2. Equipe faz pull e testa
3. Equipe reporta problemas
4. João/Maria corrigem
5. Repete semanalmente

**Resultado:**
- ✅ Todos testam o código
- ✅ Problemas são encontrados cedo
- ✅ Qualidade aumenta
- ✅ Trabalho em equipe real

**Boa sorte com os testes!** 🧪