# 🚀 Guia Passo a Passo - Do Zero ao Primeiro Commit

> **Para quem nunca usou Git antes!**

---

## 📝 Entendendo as Mensagens de Commit

### **O que é aquilo tudo no commit?**

Quando você faz um commit, a mensagem tem **duas partes**:

```bash
git commit -m "Título curto (primeira linha)

Descrição detalhada (linhas seguintes)
Pode ter várias linhas
Explicando o que foi feito"
```

**Exemplo real:**
```bash
git commit -m "docs: Add comprehensive documentation

Documentation added:
- APRESENTACAO.md: Presentation guide
- JUSTIFICATIVA_TECNICA.md: Technical justifications
- INSTALACAO.md: Installation guide

Team: Pedro (writing), Ana (presentation), Carlos (review)"
```

### **Como funciona:**

1. **Primeira linha:** Título curto (máximo 50 caracteres)
   - `docs:` = tipo do commit (documentação)
   - `Add comprehensive documentation` = o que foi feito

2. **Linhas seguintes:** Descrição detalhada
   - Explica em detalhes o que foi feito
   - Lista arquivos adicionados
   - Menciona quem ajudou
   - Pode ter quantas linhas quiser

3. **NÃO é comentário!** É a mensagem oficial do commit que fica salva no histórico do Git

---

## 🔧 Instalação do Git

### **Windows:**

1. **Baixar Git:**
   - Acesse: https://git-scm.com/download/win
   - Baixe a versão mais recente (64-bit)
   - Execute o instalador

2. **Instalação:**
   - Clique "Next" em tudo (configurações padrão estão OK)
   - **IMPORTANTE:** Marque "Git Bash Here" (para abrir terminal)
   - Clique "Install"

3. **Verificar instalação:**
   ```bash
   # Abra o PowerShell ou Git Bash
   git --version
   # Deve mostrar: git version 2.x.x
   ```

### **Mac:**

```bash
# Instalar via Homebrew
brew install git

# Ou baixar de: https://git-scm.com/download/mac
```

### **Linux:**

```bash
# Ubuntu/Debian
sudo apt-get install git

# Fedora
sudo dnf install git
```

---

## 📁 Preparação do Projeto

### **Passo 1: Verificar que o código está funcionando**

```bash
# 1. Abrir PowerShell ou Terminal
# 2. Navegar até a pasta do projeto
cd C:\Users\jpccr\Desktop\sistema-samu-academico

# 3. Testar Backend
cd backend
npm install
# Aguardar instalação (pode demorar 2-3 minutos)
npm run dev
# Deve mostrar: Server running on port 3000
# Pressione Ctrl+C para parar

# 4. Testar Frontend (abrir NOVO terminal)
cd C:\Users\jpccr\Desktop\sistema-samu-academico\frontend
npm install
# Aguardar instalação
npm run dev
# Deve mostrar: Local: http://localhost:5173
# Abra o navegador em http://localhost:5173
# Deve ver o mapa de Sorocaba
# Pressione Ctrl+C para parar
```

**✅ Se tudo funcionou, pode continuar!**

---

## 🎯 Primeiro Commit - Passo a Passo

### **Passo 1: Configurar Git (FAZER UMA VEZ APENAS)**

```bash
# Abrir PowerShell ou Git Bash
# Navegar até a pasta do projeto
cd C:\Users\jpccr\Desktop\sistema-samu-academico

# Configurar nome e email (use dados do João)
git config --global user.name "João Silva"
git config --global user.email "joao.silva@email.com"

# Verificar configuração
git config --global user.name
git config --global user.email
```

### **Passo 2: Inicializar Git (Segunda, 31/03/2026, 10:00)**

```bash
# Ainda na pasta do projeto
cd C:\Users\jpccr\Desktop\sistema-samu-academico

# Inicializar repositório Git
git init
# Deve mostrar: Initialized empty Git repository

# Verificar status
git status
# Deve mostrar muitos arquivos em vermelho (não rastreados)
```

### **Passo 3: Primeiro Commit - Inicialização**

```bash
# Adicionar apenas README e .gitignore
git add README.md .gitignore

# Verificar o que foi adicionado
git status
# Deve mostrar README.md e .gitignore em verde

# Fazer o commit
git commit -m "Initial commit: Project structure and documentation"

# Verificar histórico
git log
# Deve mostrar seu commit!
```

**🎉 Parabéns! Você fez seu primeiro commit!**

### **Passo 4: Segundo Commit - Configurações (2 horas depois, 12:30)**

```bash
# Adicionar arquivos de configuração
git add backend/package.json backend/tsconfig.json
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html

# Verificar
git status

# Commit com mensagem detalhada
git commit -m "chore: Add project configuration files

- Setup TypeScript for backend and frontend
- Configure Vite build tool
- Add initial dependencies (Express, React, Leaflet)
- Configure ESLint and Prettier

Team: João (setup), Pedro (validation)"

# Verificar histórico
git log
# Agora tem 2 commits!
```

### **Passo 5: Terceiro Commit - Backend + Dados (14:00)**

```bash
# Adicionar arquivos do backend
git add backend/src/types/index.ts backend/src/server.ts
git add backend/src/data/ambulances.ts backend/src/data/calls.ts
git add backend/src/data/bases.ts backend/src/data/weatherEvents.ts

# Verificar
git status

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

# Verificar histórico
git log
# Agora tem 3 commits!
```

**✅ Semana 1 completa! 3 commits feitos!**

---

## 📊 Comandos Git Essenciais

### **Ver status atual:**
```bash
git status
# Mostra arquivos modificados, adicionados, etc.
```

### **Adicionar arquivos:**
```bash
# Adicionar arquivo específico
git add arquivo.txt

# Adicionar vários arquivos
git add arquivo1.txt arquivo2.txt

# Adicionar todos arquivos de uma pasta
git add backend/src/

# Adicionar TUDO (cuidado!)
git add .
```

### **Fazer commit:**
```bash
# Commit simples
git commit -m "Mensagem curta"

# Commit com descrição detalhada
git commit -m "Título

Descrição linha 1
Descrição linha 2
Descrição linha 3"
```

### **Ver histórico:**
```bash
# Ver todos commits
git log

# Ver resumido
git log --oneline

# Ver últimos 5 commits
git log -5
```

### **Ver diferenças:**
```bash
# Ver o que mudou (antes de adicionar)
git diff

# Ver o que foi adicionado (antes de commitar)
git diff --staged
```

### **Desfazer coisas:**
```bash
# Remover arquivo do staging (antes de commit)
git reset arquivo.txt

# Desfazer último commit (mantém arquivos)
git reset --soft HEAD~1

# Desfazer último commit (descarta mudanças)
git reset --hard HEAD~1
```

---

## 🗓️ Cronograma Simplificado

### **Semana 1 (31/03) - AMANHÃ:**
```bash
# 10:00 - Commit 1
git init
git add README.md .gitignore
git commit -m "Initial commit: Project structure and documentation"

# 12:30 - Commit 2
git add backend/package.json backend/tsconfig.json frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html
git commit -m "chore: Add project configuration files..."

# 14:00 - Commit 3
git add backend/src/types/index.ts backend/src/server.ts backend/src/data/
git commit -m "feat: Add backend structure and mock data..."
```

### **Semana 2 (07/04):**
```bash
# Mudar autor para Maria
git config user.name "Maria Santos"
git config user.email "maria.santos@email.com"

# 14:30 - Commit 1
git add frontend/src/types/index.ts frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: Add frontend structure..."

# 16:00 - Commit 2
git add frontend/src/components/Map.tsx frontend/src/styles/index.css
git commit -m "feat: Add Leaflet map integration..."
```

### **Semanas 3-7:**
- Seguir o arquivo `COMANDOS_PRONTOS.md`
- Copiar e colar os comandos
- Fazer 1 commit por semana

---

## 🔗 Conectar com GitHub (Opcional)

### **Passo 1: Criar repositório no GitHub**

1. Acesse: https://github.com
2. Faça login (ou crie conta)
3. Clique em "New repository"
4. Nome: `sistema-samu-academico`
5. Descrição: `Sistema de Despacho Inteligente de Ambulâncias SAMU`
6. **NÃO** marque "Initialize with README"
7. Clique "Create repository"

### **Passo 2: Conectar repositório local**

```bash
# Na pasta do projeto
cd C:\Users\jpccr\Desktop\sistema-samu-academico

# Adicionar remote (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/sistema-samu-academico.git

# Verificar
git remote -v

# Enviar commits para GitHub
git push -u origin main
# Ou se for branch master:
git push -u origin master
```

### **Passo 3: Enviar commits futuros**

```bash
# Após fazer commits localmente
git push
```

---

## ❓ Problemas Comuns

### **"git: command not found"**
- Git não está instalado
- Solução: Instalar Git (ver seção acima)

### **"fatal: not a git repository"**
- Você não está na pasta do projeto
- Solução: `cd C:\Users\jpccr\Desktop\sistema-samu-academico`

### **"nothing to commit"**
- Você não adicionou arquivos com `git add`
- Solução: `git add arquivo.txt` antes de `git commit`

### **"Please tell me who you are"**
- Git não sabe seu nome/email
- Solução: Configurar com `git config --global user.name "Seu Nome"`

### **"Your branch is ahead of 'origin/main'"**
- Você tem commits locais não enviados ao GitHub
- Solução: `git push`

---

## ✅ Checklist Antes de Cada Commit

- [ ] Código está funcionando (testei localmente)
- [ ] Estou na pasta correta do projeto
- [ ] Configurei autor correto (`git config user.name`)
- [ ] Adicionei arquivos corretos (`git add`)
- [ ] Verifiquei o que será commitado (`git status`)
- [ ] Mensagem de commit está clara
- [ ] Fiz o commit (`git commit -m "..."`)
- [ ] Verifiquei histórico (`git log`)

---

## 🎯 Resumo do Fluxo

```
1. Modificar/criar arquivos
   ↓
2. git add arquivo.txt (adicionar ao staging)
   ↓
3. git status (verificar o que será commitado)
   ↓
4. git commit -m "Mensagem" (salvar no histórico)
   ↓
5. git log (ver histórico)
   ↓
6. git push (enviar para GitHub - opcional)
```

---

## 📞 Dúvidas?

### **Onde executar os comandos?**
- Windows: PowerShell ou Git Bash
- Mac/Linux: Terminal

### **Como abrir terminal na pasta?**
- Windows: Shift + Botão direito na pasta → "Abrir PowerShell aqui"
- Mac: Botão direito → "New Terminal at Folder"
- Linux: Botão direito → "Open Terminal"

### **Posso desfazer um commit?**
- Sim! `git reset --soft HEAD~1` (mantém arquivos)
- Ou: `git reset --hard HEAD~1` (descarta tudo)

### **Como ver o que mudou?**
- Antes de adicionar: `git diff`
- Depois de adicionar: `git diff --staged`

---

## 🚀 Próximo Passo

**AMANHÃ (31/03/2026, 10:00):**

1. Abrir PowerShell na pasta do projeto
2. Executar os 3 comandos da Semana 1
3. Verificar com `git log`
4. Pronto! Primeira semana completa!

**Boa sorte! Você consegue!** 💪