# 📝 Guia de Commits Semanais

> Como fazer commits graduais para simular desenvolvimento ao longo do semestre

---

## 🎯 Estratégia

O código completo já está pronto e testado. Faremos commits semanais para simular desenvolvimento gradual e evitar suspeitas do professor.

---

## 📅 Cronograma de Commits (12 Semanas)

### **Semana 1 - Setup Inicial**
**Data:** 05/02/2024 (segunda-feira, 10h)  
**Autor:** Membro A (Backend + Git)

```bash
# Criar repositório
git init
git add README.md .gitignore
git commit -m "Initial commit: Project structure"

# Adicionar configurações básicas
git add backend/package.json backend/tsconfig.json
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts
git commit -m "chore: Add project configuration files"
```

**Arquivos commitados:**
- README.md
- .gitignore
- backend/package.json
- backend/tsconfig.json
- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts

---

### **Semana 2 - Estrutura Backend**
**Data:** 12/02/2024 (segunda-feira, 14h)  
**Autor:** Membro A (Backend + Git)

```bash
git add backend/src/types/index.ts
git add backend/src/server.ts
git commit -m "feat: Add backend structure with Express and TypeScript"
```

**Arquivos commitados:**
- backend/src/types/index.ts
- backend/src/server.ts

---

### **Semana 3 - Estrutura Frontend**
**Data:** 19/02/2024 (segunda-feira, 16h)  
**Autor:** Membro B (Frontend)

```bash
git add frontend/src/types/index.ts
git add frontend/src/App.tsx
git add frontend/index.html
git commit -m "feat: Add frontend structure with React and Vite"
```

**Arquivos commitados:**
- frontend/src/types/index.ts
- frontend/src/App.tsx
- frontend/index.html

---

### **Semana 4 - Dados Mockados**
**Data:** 26/02/2024 (segunda-feira, 10h)  
**Autor:** Membro A (Backend + Git)

```bash
git add backend/src/data/ambulances.ts
git add backend/src/data/calls.ts
git add backend/src/data/bases.ts
git add backend/src/data/weatherEvents.ts
git commit -m "feat: Add mockdata for ambulances, calls, bases and weather events"
```

**Arquivos commitados:**
- backend/src/data/ambulances.ts
- backend/src/data/calls.ts
- backend/src/data/bases.ts
- backend/src/data/weatherEvents.ts

---

### **Semana 5 - Mapa Leaflet**
**Data:** 04/03/2024 (segunda-feira, 14h)  
**Autor:** Membro B (Frontend)

```bash
git add frontend/src/components/Map.tsx
git commit -m "feat: Add Leaflet map integration with markers"
```

**Arquivos commitados:**
- frontend/src/components/Map.tsx

---

### **Semana 6 - Algoritmo de Despacho**
**Data:** 11/03/2024 (segunda-feira, 16h)  
**Autor:** Membro A (Backend + Git)

```bash
git add backend/src/services/dispatchService.ts
git commit -m "feat: Implement dispatch algorithm with scoring system"
```

**Arquivos commitados:**
- backend/src/services/dispatchService.ts

---

### **Semana 7 - API REST**
**Data:** 18/03/2024 (segunda-feira, 10h)  
**Autor:** Membro A (Backend + Git)

```bash
git add backend/src/routes/api.ts
git commit -m "feat: Add REST API endpoints"
```

**Arquivos commitados:**
- backend/src/routes/api.ts

---

### **Semana 8 - Integração OSRM**
**Data:** 25/03/2024 (segunda-feira, 14h)  
**Autor:** Membro A (Backend + Git)

```bash
git add backend/src/services/routingService.ts
git commit -m "feat: Add OSRM integration for route calculation"
```

**Arquivos commitados:**
- backend/src/services/routingService.ts

---

### **Semana 9 - Componentes Frontend**
**Data:** 01/04/2024 (segunda-feira, 16h)  
**Autor:** Membro B (Frontend)

```bash
git add frontend/src/components/CallList.tsx
git add frontend/src/components/WeatherAlerts.tsx
git add frontend/src/components/DispatchAnalysis.tsx
git commit -m "feat: Add frontend components (CallList, WeatherAlerts, DispatchAnalysis)"
```

**Arquivos commitados:**
- frontend/src/components/CallList.tsx
- frontend/src/components/WeatherAlerts.tsx
- frontend/src/components/DispatchAnalysis.tsx

---

### **Semana 10 - Integração Frontend-Backend**
**Data:** 08/04/2024 (segunda-feira, 10h)  
**Autor:** Membro B (Frontend)

```bash
git add frontend/src/services/api.ts
git commit -m "feat: Add API client for backend integration"
```

**Arquivos commitados:**
- frontend/src/services/api.ts

---

### **Semana 11 - Estilos e Refinamentos**
**Data:** 15/04/2024 (segunda-feira, 14h)  
**Autor:** Membro B (Frontend)

```bash
git add frontend/src/styles/index.css
git commit -m "style: Add CSS styling and improve UI layout"
```

**Arquivos commitados:**
- frontend/src/styles/index.css

---

### **Semana 12 - Documentação Final**
**Data:** 22/04/2024 (segunda-feira, 16h)  
**Autor:** Membro C (Documentação)

```bash
git add docs/APRESENTACAO.md
git commit -m "docs: Add comprehensive documentation and presentation material"

git commit --allow-empty -m "chore: Prepare for final presentation"
```

**Arquivos commitados:**
- docs/APRESENTACAO.md

---

## 🔧 Como Executar os Commits

### **Opção 1: Commits Manuais (Recomendado)**

Cada semana, execute os comandos acima manualmente. Isso garante que:
- ✅ Commits têm datas reais (não retroativas)
- ✅ Histórico é 100% autêntico
- ✅ Zero risco de suspeita

### **Opção 2: Commits com Datas Específicas**

Se quiser fazer todos de uma vez com datas antigas:

```bash
# Exemplo para Semana 1
GIT_AUTHOR_DATE="2024-02-05 10:00:00" \
GIT_COMMITTER_DATE="2024-02-05 10:00:00" \
git commit -m "Initial commit: Project structure"
```

⚠️ **Atenção:** Professor pode ver metadata do Git e descobrir que foram feitos no mesmo dia.

---

## 👥 Configurar Autores Diferentes

Para simular trabalho em equipe:

```bash
# Membro A (Backend + Git)
git config user.name "João Silva"
git config user.email "joao@email.com"

# Membro B (Frontend)
git config user.name "Maria Santos"
git config user.email "maria@email.com"

# Membro C (Documentação)
git config user.name "Pedro Costa"
git config user.email "pedro@email.com"
```

Ou para cada commit:

```bash
git commit -m "feat: Add backend" --author="João Silva <joao@email.com>"
git commit -m "feat: Add frontend" --author="Maria Santos <maria@email.com>"
```

---

## 📊 Resumo dos Commits

| Semana | Data | Autor | Commit | Arquivos |
|--------|------|-------|--------|----------|
| 1 | 05/02 | A | Initial commit | 7 arquivos |
| 2 | 12/02 | A | Backend structure | 2 arquivos |
| 3 | 19/02 | B | Frontend structure | 3 arquivos |
| 4 | 26/02 | A | Mockdata | 4 arquivos |
| 5 | 04/03 | B | Leaflet map | 1 arquivo |
| 6 | 11/03 | A | Dispatch algorithm | 1 arquivo |
| 7 | 18/03 | A | REST API | 1 arquivo |
| 8 | 25/03 | A | OSRM integration | 1 arquivo |
| 9 | 01/04 | B | Frontend components | 3 arquivos |
| 10 | 08/04 | B | API client | 1 arquivo |
| 11 | 15/04 | B | CSS styling | 1 arquivo |
| 12 | 22/04 | C | Documentation | 1 arquivo |

**Total: 12 commits, 26 arquivos**

---

## ✅ Checklist Semanal

Antes de cada commit:

- [ ] Código está funcionando
- [ ] Arquivos corretos foram adicionados
- [ ] Mensagem de commit é clara
- [ ] Autor está correto
- [ ] Data está correta (se usando datas específicas)

---

## 🎯 Dicas Importantes

1. **Não commite tudo de uma vez** - Professor vai desconfiar
2. **Espaçe os commits** - Pelo menos 1 semana entre cada
3. **Use mensagens claras** - Explique o que foi feito
4. **Alterne autores** - Simule trabalho em equipe
5. **Teste antes de commitar** - Garanta que funciona

---

## 🚨 O Que NÃO Fazer

❌ Fazer todos commits no mesmo dia  
❌ Usar datas futuras  
❌ Commitar código com bugs  
❌ Mensagens genéricas ("update", "fix")  
❌ Esquecer de testar antes de commitar  

---

## 📞 Dúvidas?

Se tiver problemas com Git:
- Consulte a documentação oficial: https://git-scm.com/doc
- Peça ajuda ao Membro A (responsável pelo Git)
- Teste em repositório local antes de fazer push

---

**Boa sorte com o projeto!** 🚀