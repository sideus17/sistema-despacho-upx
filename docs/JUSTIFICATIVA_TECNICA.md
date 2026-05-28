# 🎯 Justificativa Técnica - Sistema de Análise de Risco

## 📊 Abordagem: PROBABILIDADE, não Tempo Real

### **O Que o Sistema FAZ:**

O sistema **analisa riscos potenciais** baseado em:
1. **Dados geográficos** (topografia, hidrografia)
2. **Dados históricos** (onde costuma alagar, onde tem árvores)
3. **Condições climáticas atuais** (chuva forte, ventos)
4. **Cálculo de probabilidade** de eventos adversos

### **O Que o Sistema NÃO FAZ:**

❌ Não detecta alagamentos em tempo real
❌ Não tem sensores nas ruas
❌ Não monitora árvores caindo
❌ Não tem câmeras ou IoT

---

## 🧮 Como Funciona o Cálculo de Risco

### **Exemplo: Risco de Alagamento**

```
ENTRADA:
- Localização: Av. Itavuvu (coordenadas)
- Topografia: Área baixa (dados IBGE)
- Hidrografia: Próximo ao córrego (dados GeoSampa)
- Clima atual: Chuva forte (dados mockados)

CÁLCULO:
Risco = (Topografia × 0.4) + (Proximidade água × 0.3) + (Chuva × 0.3)
Risco = (0.8 × 0.4) + (0.9 × 0.3) + (1.0 × 0.3)
Risco = 0.32 + 0.27 + 0.30 = 0.89 (89% = ALTO)

RESULTADO:
⚠️ ALTO risco de alagamento na Av. Itavuvu
```

### **Exemplo: Risco de Queda de Árvore**

```
ENTRADA:
- Localização: Rua Barão de Piratininga
- Arborização: Alta densidade (dados prefeitura)
- Idade das árvores: >50 anos (dados históricos)
- Clima atual: Ventos fortes (dados mockados)

CÁLCULO:
Risco = (Densidade árvores × 0.4) + (Idade × 0.3) + (Ventos × 0.3)
Risco = (0.9 × 0.4) + (0.7 × 0.3) + (0.8 × 0.3)
Risco = 0.36 + 0.21 + 0.24 = 0.81 (81% = ALTO)

RESULTADO:
⚠️ ALTO risco de queda de árvore na Rua Barão
```

---

## 🗂️ Fontes de Dados (MVP vs Produção)

### **MVP (Atual - Dados Mockados):**

```javascript
// Dados simulados para demonstração
const weatherEvents = [
  {
    type: 'ALAGAMENTO',
    location: { lat: -23.5067, lng: -47.4612 },
    riskLevel: 'ALTO',
    // Baseado em: topografia + hidrografia + clima
    factors: {
      topografia: 0.8,  // Área baixa
      hidrografia: 0.9, // Próximo a córrego
      chuva: 1.0        // Chuva forte
    }
  }
];
```

### **Produção (Futuro - APIs Reais):**

```javascript
// Integração com APIs governamentais
const riskAnalysis = {
  // 1. Dados geográficos (IBGE)
  topografia: await IBGE.getTopografia(lat, lng),
  
  // 2. Dados de hidrografia (GeoSampa)
  hidrografia: await GeoSampa.getHidrografia(lat, lng),
  
  // 3. Dados de arborização (Prefeitura)
  arvores: await Prefeitura.getArvores(lat, lng),
  
  // 4. Clima atual (INMET)
  clima: await INMET.getClimaAtual(lat, lng),
  
  // 5. Calcular probabilidade
  risco: calcularProbabilidade(topografia, hidrografia, clima)
};
```

---

## 💬 Como Explicar para o Professor

### **Se perguntar: "Como sabem que tem alagamento?"**

> "Professor, não sabemos em tempo real. O sistema **calcula a PROBABILIDADE** de alagamento baseado em:
> 
> 1. **Topografia**: Áreas baixas têm maior risco (dados do IBGE)
> 2. **Hidrografia**: Proximidade a córregos aumenta risco (dados GeoSampa)
> 3. **Clima**: Chuva forte aumenta probabilidade (dados INMET)
> 
> O sistema **não detecta** alagamentos, ele **prevê riscos** baseado em dados geográficos e climáticos. É uma análise preditiva, não monitoramento em tempo real."

### **Se perguntar: "Como sabem que vai cair árvore?"**

> "Não sabemos se vai cair. Calculamos a **PROBABILIDADE** baseado em:
> 
> 1. **Densidade de arborização**: Mais árvores = maior risco (dados da prefeitura)
> 2. **Idade das árvores**: Árvores antigas são mais frágeis (dados históricos)
> 3. **Condições climáticas**: Ventos fortes aumentam risco (dados INMET)
> 
> É uma análise de risco preventiva, não detecção em tempo real. Similar ao que meteorologistas fazem para prever tempestades."

### **Se perguntar: "De onde vêm os dados?"**

> "No MVP usamos dados mockados para demonstração. Em produção, integraríamos com:
> 
> - **IBGE**: Topografia e relevo
> - **GeoSampa/GeoPortal**: Hidrografia e infraestrutura
> - **Prefeitura**: Arborização e manutenção
> - **INMET**: Clima em tempo real
> - **Defesa Civil**: Histórico de ocorrências
> 
> Essas APIs são gratuitas e públicas. Não temos acesso agora porque requerem cadastro institucional, mas a estrutura do código está pronta para integração."

---

## 📚 Embasamento Teórico

### **Conceitos Utilizados:**

1. **Análise de Risco Geográfico**
   - Usado em planejamento urbano
   - Combina múltiplos fatores
   - Gera probabilidades

2. **Sistemas de Informação Geográfica (SIG)**
   - Análise espacial
   - Sobreposição de camadas
   - Cálculo de proximidade

3. **Análise Preditiva**
   - Baseada em dados históricos
   - Modelos probabilísticos
   - Não é tempo real

### **Referências Acadêmicas:**

- Análise de risco de alagamentos urbanos (IBGE)
- Sistemas de alerta precoce (Defesa Civil)
- GIS aplicado a emergências médicas (artigos científicos)

---

## 🎯 Vantagens da Abordagem

### **Por que PROBABILIDADE é melhor que TEMPO REAL:**

✅ **Mais realista para MVP**
- Não precisa de sensores caros
- Não precisa de infraestrutura complexa
- Dados são acessíveis

✅ **Academicamente sólido**
- Baseado em ciência de dados
- Usa conceitos de SIG
- Tem embasamento teórico

✅ **Defensável na banca**
- Não promete o que não pode entregar
- Foco em análise, não monitoramento
- Escopo adequado para TCC

✅ **Escalável para produção**
- Estrutura pronta para APIs reais
- Pode evoluir para tempo real no futuro
- Base sólida para expansão

---

## 📊 Comparação: Tempo Real vs Probabilidade

| Aspecto | Tempo Real | Probabilidade (Nossa) |
|---------|------------|----------------------|
| **Custo** | Alto (sensores, IoT) | Baixo (APIs públicas) |
| **Complexidade** | Muito alta | Média |
| **Viabilidade TCC** | Baixa | Alta ✅ |
| **Precisão** | Alta (se funcionar) | Boa (baseada em dados) |
| **Manutenção** | Complexa | Simples |
| **Escalabilidade** | Difícil | Fácil |

---

## 🔄 Evolução Futura

### **Fase 1 (MVP - Atual):**
- Dados mockados
- Cálculo de probabilidade
- Demonstração de conceito

### **Fase 2 (Produção):**
- Integração com APIs governamentais
- Dados reais de topografia e clima
- Cálculo refinado

### **Fase 3 (Futuro):**
- Machine Learning para melhorar previsões
- Histórico de acertos/erros
- Ajuste automático de pesos

### **Fase 4 (Ideal):**
- Integração com sensores (se disponível)
- Tempo real (se viável)
- Validação contínua

---

## 💡 Mensagem Final

**O sistema não promete detectar eventos em tempo real.**

**O sistema analisa RISCOS baseado em dados geográficos e climáticos.**

Isso é:
- ✅ Mais honesto
- ✅ Mais viável
- ✅ Mais defensável
- ✅ Academicamente sólido
- ✅ Tecnicamente correto

**É exatamente o que sistemas profissionais fazem!**

Exemplos reais:
- Previsão de enchentes (Defesa Civil)
- Alertas de deslizamento (Geologia)
- Risco de incêndio (Bombeiros)

Todos usam **análise de risco**, não detecção em tempo real!

---

## 🎓 Para a Apresentação

**Slide: "Sistema de Análise de Risco"**

> "Nosso sistema não detecta eventos em tempo real. Ele **analisa probabilidades** de riscos baseado em dados geográficos (topografia, hidrografia, arborização) combinados com condições climáticas atuais. É uma abordagem preditiva, similar ao que a Defesa Civil usa para alertas de enchentes."

**Demonstração:**

> "Veja: esta área tem ALTO risco de alagamento porque:
> 1. Topografia baixa (dados IBGE)
> 2. Próxima a córrego (dados GeoSampa)
> 3. Chuva forte no momento (dados INMET)
> 
> O sistema calcula: 89% de probabilidade de alagamento.
> Por isso, penaliza rotas que passam por ali."

**Defesa:**

> "Não prometemos tempo real porque seria inviável para um TCC. Focamos em análise de risco, que é tecnicamente sólido, academicamente defensável e praticamente útil."