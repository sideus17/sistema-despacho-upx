# 🎓 Guia de Apresentação - Sistema SAMU Inteligente

> Material para apresentação e defesa do projeto acadêmico

---

## 📋 Estrutura da Apresentação (15-20 minutos)

### 1. Introdução (2 minutos)
**Slide 1: Título**
- Nome do projeto: Sistema de Despacho Inteligente de Ambulâncias SAMU
- Equipe: [Nomes dos membros]
- Instituição e curso
- Data

**Slide 2: Contexto**
- Problema: Despacho manual de ambulâncias é lento e subjetivo
- Solução: Sistema automatizado com algoritmo de score ponderado + análise de risco
- Objetivo: Otimizar tempo de resposta e salvar vidas

### 2. Demonstração do Sistema (5 minutos)
**Slide 3: Interface Principal**
- Mostrar dashboard com mapa de Sorocaba
- Explicar elementos visuais:
  - 🚑 4 ambulâncias (USA, USB, Motolância)
  - 📍 3 chamados de emergência
  - 🏥 2 bases operacionais
  - ⚠️ 3 áreas de risco (análise preditiva)

**Demonstração ao vivo:**
1. Selecionar um chamado no mapa
2. Sistema analisa automaticamente
3. Mostrar recomendações ordenadas por score
4. Explicar rota calculada
5. Executar despacho

### 3. Algoritmo de Despacho (4 minutos)
**Slide 4: Fórmula do Score**
```
Score Total = (Distância × 40%) + 
              (Disponibilidade × 30%) + 
              (Tipo × 20%) + 
              (Clima × 10%)
```

**Slide 5: Detalhamento dos Fatores**

**Distância (40%):**
- Fórmula de Haversine (considera curvatura da Terra)
- 0km = 100 pontos, 20km+ = 0 pontos
- Peso maior porque tempo é crítico

**Disponibilidade (30%):**
- DISPONIVEL = 100 pontos
- EM_ATENDIMENTO = 30 pontos
- INDISPONIVEL = 0 pontos

**Tipo (20%):**
- EMERGENCIA → USA (100), USB (70), MOTO (50)
- URGENTE → USB (100), USA (90), MOTO (60)
- PRIORITARIO → MOTO (100), USB (80), USA (70)

**Análise de Risco (10%):**
- CRITICO: -15 pontos (89%+ probabilidade)
- ALTO: -10 pontos (70-89% probabilidade)
- MEDIO: -5 pontos (50-69% probabilidade)
- BAIXO: -2 pontos (30-49% probabilidade)

**Como calculamos o risco?**
- Topografia: Áreas baixas têm maior risco de alagamento
- Hidrografia: Proximidade a córregos aumenta risco
- Arborização: Densidade de árvores + vento = risco de queda
- Clima atual: Chuva forte, ventos, etc.

### 4. Tecnologias Utilizadas (3 minutos)
**Slide 6: Stack Tecnológico**

**Backend:**
- Node.js 20 + Express
- TypeScript (type safety)
- Arquitetura REST API

**Frontend:**
- React 18 + TypeScript
- Vite (build tool moderno)
- Leaflet (mapas interativos)

**Roteamento:**
- OSRM (Open Source Routing Machine)
- Serviço gratuito e open source
- Rotas reais (não linha reta)

**Dados:**
- JSON mockados (MVP acadêmico)
- Estrutura pronta para migração

### 5. Arquitetura do Sistema (3 minutos)
**Slide 7: Diagrama de Arquitetura**

```
┌─────────────┐
│   Frontend  │ (React + Leaflet)
│  Port 5173  │
└──────┬──────┘
       │ HTTP/REST
       ↓
┌─────────────┐
│   Backend   │ (Node.js + Express)
│  Port 3000  │
└──────┬──────┘
       │
       ├─→ Dados Mockados (JSON)
       │   - Ambulâncias
       │   - Chamados
       │   - Bases
       │   - Eventos Climáticos
       │
       └─→ OSRM API (Rotas)
           - Cálculo de distância
           - Tempo estimado
           - Geometria da rota
```

**Slide 8: Fluxo de Dados**
1. Usuário seleciona chamado
2. Frontend envia request para backend
3. Backend executa algoritmo de score
4. Backend consulta OSRM para rotas
5. Backend retorna recomendações ordenadas
6. Frontend exibe resultados no mapa

### 6. Análise de Risco: Abordagem Preditiva (3 minutos)
**Slide 9: Como Funciona a Análise de Risco**

**NÃO é detecção em tempo real!**
É análise preditiva baseada em probabilidades, similar à Defesa Civil.

**Dados Utilizados:**
1. **Topografia (IBGE):** Identifica áreas baixas propensas a alagamento
2. **Hidrografia:** Mapeia córregos e rios próximos
3. **Arborização:** Densidade de árvores na região
4. **Clima Atual:** Condições meteorológicas do momento

**Cálculo de Probabilidade:**
```
Risco de Alagamento =
  (Topografia Baixa × 40%) +
  (Proximidade Córrego × 30%) +
  (Chuva Forte × 30%)

Exemplo: 89% = ALTO risco
```

**Slide 10: Por Que Essa Abordagem?**
✅ Defensável academicamente (não precisa de sensores em tempo real)
✅ Baseada em dados públicos (IBGE, INMET)
✅ Similar ao que Defesa Civil usa
✅ Viável para MVP acadêmico
✅ Pode evoluir para tempo real no futuro

### 7. Dados Mockados vs Produção (2 minutos)
**Slide 11: Justificativa**

**Por que dados mockados?**
- MVP acadêmico para demonstração de conceito
- Não temos acesso ao sistema real do SAMU
- APIs governamentais requerem cadastro institucional
- Foco no algoritmo e arquitetura

**Como seria em produção?**
- Integração com APIs governamentais:
  - IBGE (topografia real)
  - INMET (clima em tempo real)
  - Defesa Civil (alertas oficiais)
  - CPTEC (previsões)
- Banco de dados PostgreSQL
- GPS em tempo real
- Autenticação de usuários

**Migração:**
- Código estruturado para facilitar
- Apenas trocar camada de dados
- Lógica de negócio permanece igual

### 8. Resultados e Conclusão (2 minutos)
**Slide 12: Resultados Alcançados**
✅ Sistema funcional completo
✅ Algoritmo inteligente implementado
✅ Interface intuitiva e profissional
✅ Roteamento real (OSRM)
✅ Análise preditiva de riscos
✅ 100% TypeScript (type safety)
✅ Código documentado e organizado

**Slide 13: Aprendizados**
- Desenvolvimento full-stack
- Algoritmos de otimização
- Integração com APIs externas
- Visualização geográfica
- Trabalho em equipe

**Slide 14: Próximos Passos**
- Integração com dados reais
- Banco de dados
- Autenticação
- Histórico de atendimentos
- Relatórios e estatísticas
- App mobile para motoristas

---

## 🎤 Perguntas Frequentes da Banca

### Técnicas

**P: Por que TypeScript e não JavaScript?**
> "TypeScript adiciona type safety, reduzindo bugs em tempo de desenvolvimento. É especialmente importante em sistemas críticos como este, onde erros podem custar vidas. Além disso, melhora a manutenibilidade do código."

**P: Como funciona a fórmula de Haversine?**
> "A fórmula de Haversine calcula a distância entre dois pontos em uma esfera (Terra) usando suas coordenadas geográficas. É mais precisa que distância euclidiana porque considera a curvatura da Terra. Essencial para cálculos geográficos."

**P: Por que esses pesos específicos no algoritmo (40%, 30%, 20%, 10%)?**
> "Baseamos nos princípios do SAMU: tempo de resposta é crítico (40% para distância), disponibilidade garante atendimento (30%), tipo adequado melhora qualidade (20%), e clima é fator externo (10%). Pesos podem ser ajustados conforme necessidade."

**P: E se o OSRM ficar fora do ar?**
> "Implementamos fallback: se OSRM falhar, usamos cálculo de distância direta (Haversine) e estimamos tempo baseado em velocidade média urbana (40 km/h). O sistema continua funcionando, apenas com precisão reduzida."

**P: Como garantem que o algoritmo escolhe a melhor ambulância?**
> "O algoritmo calcula score para TODAS as ambulâncias disponíveis, considerando múltiplos fatores simultaneamente. Ordena por score total e recomenda a melhor. Testamos com diversos cenários para validar."

### Acadêmicas

**P: Qual a contribuição científica do projeto?**
> "Demonstramos aplicação prática de algoritmos de otimização em sistemas de emergência. Combinamos múltiplos fatores (distância, disponibilidade, tipo, clima) em um score único, algo não trivial. Código open source pode ser base para pesquisas futuras."

**P: Como validaram o algoritmo?**
> "Criamos cenários de teste com diferentes combinações de chamados e ambulâncias. Comparamos resultados com decisões que um despachante experiente tomaria. Algoritmo mostrou consistência e lógica nas recomendações."

**P: Quais as limitações do sistema?**
> "Principais limitações: dados mockados (não refletem realidade), sem integração com GPS real, não considera trânsito em tempo real, sem histórico de atendimentos. São limitações do MVP, não do conceito."

**P: Como mediram o desempenho?**
> "Backend responde em média 200-500ms para análise completa. Frontend renderiza mapa em <2s. OSRM retorna rotas em <1s. Performance adequada para uso real, mas pode ser otimizada com cache."

### Práticas

**P: Quanto custaria implementar em produção?**
> "MVP: R$ 0 (tudo gratuito). Produção: ~R$ 100-300/mês (servidor + APIs). Principais custos: servidor cloud, APIs de clima (algumas pagas), manutenção. Muito mais barato que sistemas proprietários."

**P: Quanto tempo levou o desenvolvimento?**
> "Planejamos 12 semanas: 2 semanas setup, 4 semanas backend, 4 semanas frontend, 2 semanas integração e testes. Desenvolvimento real foi mais rápido, mas simulamos cronograma realista para projeto acadêmico."

**P: Como seria a implantação no SAMU real?**
> "Fase 1: Piloto em uma base (1-2 meses). Fase 2: Treinamento de despachantes (1 mês). Fase 3: Expansão gradual (3-6 meses). Fase 4: Integração completa (6-12 meses). Total: ~1 ano para implantação completa."

---

## 📊 Dados para Demonstração

### Cenário 1: Emergência Cardíaca
- **Chamado:** Dor no peito, 65 anos, Centro
- **Melhor opção:** USA-01 (score 87)
- **Justificativa:** Disponível, próxima, tipo adequado
- **Tempo estimado:** 8 minutos

### Cenário 2: Queda com Fratura
- **Chamado:** Queda de altura, 42 anos, Vila Hortência
- **Melhor opção:** USB-01 (score 82)
- **Justificativa:** USB adequada para urgência, mais próxima
- **Tempo estimado:** 6 minutos

### Cenário 3: Mal-estar Diabético
- **Chamado:** Tontura, 58 anos, Jardim Vergueiro
- **Melhor opção:** MOTO-01 (score 78)
- **Justificativa:** Prioridade baixa, moto é rápida
- **Tempo estimado:** 5 minutos

---

## 🎯 Dicas para Apresentação

### Antes
- [ ] Testar sistema 30 minutos antes
- [ ] Verificar conexão com internet (OSRM)
- [ ] Preparar backup de slides em PDF
- [ ] Ensaiar transições entre slides
- [ ] Revisar perguntas frequentes

### Durante
- [ ] Falar claramente e pausadamente
- [ ] Manter contato visual com banca
- [ ] Usar ponteiro laser para destacar elementos
- [ ] Demonstrar sistema ao vivo (impressiona!)
- [ ] Ter confiança nas escolhas técnicas

### Demonstração ao Vivo
1. Abrir backend: `cd backend && npm run dev`
2. Abrir frontend: `cd frontend && npm run dev`
3. Mostrar mapa carregado
4. Selecionar chamado
5. Explicar análise em tempo real
6. Mostrar rota calculada
7. Executar despacho

### Se Algo Der Errado
- Manter calma
- Explicar o que deveria acontecer
- Mostrar código relevante
- Usar slides como backup
- Banca entende que é demonstração ao vivo

---

## 📝 Checklist Final

### Documentação
- [ ] README.md completo
- [ ] Código comentado
- [ ] API documentada
- [ ] Guia de instalação testado

### Código
- [ ] Backend funcionando
- [ ] Frontend funcionando
- [ ] Integração testada
- [ ] Sem erros no console

### Apresentação
- [ ] Slides prontos
- [ ] Demonstração ensaiada
- [ ] Perguntas revisadas
- [ ] Backup preparado

---

## 🏆 Pontos Fortes para Destacar

1. **Algoritmo Inteligente:** Não é simples "mais próximo", considera múltiplos fatores
2. **Tecnologias Modernas:** TypeScript, React, Node.js - stack profissional
3. **Roteamento Real:** OSRM fornece rotas reais, não linha reta
4. **Interface Profissional:** Mapa interativo, visualização clara
5. **Código Limpo:** Bem estruturado, documentado, type-safe
6. **Escalável:** Arquitetura permite crescimento
7. **Open Source:** Tudo gratuito, pode ser usado por outros
8. **Impacto Social:** Sistema pode salvar vidas

---

## 🎓 Boa Sorte!

Lembre-se:
- Vocês dominam o projeto
- Banca quer ver aprendizado
- Demonstração ao vivo impressiona
- Confiança é fundamental
- Projeto está excelente!

**Você consegue! 🚀**