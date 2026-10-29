# Guia de Apresentação

Roteiro para apresentar o sistema à banca, com a demonstração no site no ar (https://sistema-despacho-upx.vercel.app) e as perguntas que costumam aparecer. O funcionamento completo e a arquitetura estão no [README](../README.md).

---

## Roteiro (15 a 20 minutos)

### 1. O problema (2 min)

- No despacho feito à mão, o atendente escolhe a viatura de cabeça, pelo mapa e pelo rádio.
- A viatura mais perto em linha reta nem sempre é a que chega antes: trânsito, alagamento e via bloqueada mudam a conta.
- A equipe dirigindo não deveria precisar mexer no celular para dizer em que etapa está.

### 2. A solução em uma frase (1 min)

Um sistema só para a central, a regulação e a equipe: o chamado passa por **registro → regulação → despacho → app da equipe → Gestão**, e cada etapa fica registrada com horário e autor.

### 3. Demonstração ao vivo (7 min)

Duas telas lado a lado: a central no computador e o app da equipe no celular (ou numa janela estreita).

1. **Central, registro:** abrir um chamado pelo endereço, marcar "dor no peito" na triagem e mostrar a cor sugerida (Vermelho).
2. **Regulação:** confirmar a cor, mostrar as outras saídas (orientação por telefone, cancelamento por trote) e mandar para o despacho.
3. **Despacho:** mostrar a lista de viaturas com a nota, o tempo com o trânsito de agora e a frase que explica a escolha. Despachar a primeira.
4. **App da equipe:** o alarme em tela cheia com som e vibração até o "Ciente"; depois, a rota no mapa e a navegação por voz.
5. **Ocorrências:** mostrar no mapa um alagamento ou bloqueio e como a rota desvia dele.
6. **Gestão:** tempo-resposta por cor contra a meta, a linha do tempo do chamado que acabou de ser feito e a auditoria de quem fez cada passo.

### 4. Como a viatura é escolhida (3 min)

```
Nota = Tempo de chegada × 0,4 + Disponibilidade × 0,3 + Tipo × 0,2 + Ocorrências × 0,1
```

- **Tempo de chegada (40%):** o tempo da rota com o trânsito de agora. Até 3 min vale 100; 25 min ou mais, 0.
- **Disponibilidade (30%):** disponível 100, em atendimento 30, indisponível 0.
- **Tipo (20%):** USA para o Vermelho, USB para o Amarelo, Motolância para o Verde e o Azul.
- **Ocorrências (10%):** a pior ocorrência a até 1 km da viatura ou do chamado (bloqueio −15, risco −10, aviso −5).

Livres vêm primeiro; depois, a maior nota; no empate, quem chega antes.

### 5. Arquitetura (3 min)

- **Frontend:** React, TypeScript e Vite, com mapa MapLibre, publicado na Vercel. O app da equipe é o mesmo site, instalável no celular.
- **Backend:** Node.js, Express e TypeScript, publicado no Render.
- **Banco e login:** Supabase, com Postgres, RLS e MFA por app autenticador.
- **Rotas:** Valhalla, que desvia de áreas, com OSRM de reserva. O TomTom cronometra a rota com o trânsito.
- **Ocorrências:** CEMADEN (chuva) com os setores de inundação do SGB, alertas da Defesa Civil, trânsito do TomTom e relatos das equipes.
- **Aviso no celular:** Web Push.

### 6. Fechamento (2 min)

- O que o sistema já faz de ponta a ponta, em produção.
- O que ficou de fora e por quê (ver "Limitações").
- Aprendizados do grupo.

---

## Perguntas frequentes da banca

### Técnicas

**Por que esses pesos (40%, 30%, 20%, 10%)?**
> O tempo até o paciente é o que mais pesa no desfecho. A disponibilidade vem em seguida, porque uma viatura ocupada só serve se não houver outra. O tipo garante o recurso certo para a gravidade, e as ocorrências são um ajuste fino, já que o trânsito entra pelo próprio tempo. Os pesos ficam num lugar só no código e são fáceis de mudar.

**E se o serviço de rotas cair?**
> O Valhalla é o principal. Se ele não responde, o OSRM calcula a rota sem o desvio de áreas; se nenhum responde, a nota usa a distância em linha reta (Haversine) a 40 km/h. O despacho nunca trava por causa da rota.

**Como o sistema sabe que a viatura chegou?**
> Pela posição do celular do motorista. "No local" é parar a até 150 m do chamado; "no hospital", parar a até 200 m do hospital. Passar em frente não conta, para a outra pista da avenida não marcar a etapa errada.

**Como os dados ficam protegidos?**
> Só o login fala direto com o Supabase, e exige senha e o código do app autenticador. Os dados passam pelo backend, que confere o token e o papel da pessoa. As tabelas têm RLS ligado sem nenhuma política, então a chave pública do site sozinha não lê nada.

**Como vocês testam?**
> Testes automáticos no backend e no frontend rodam a cada push no GitHub Actions, e o `main` só aceita merge com eles passando. Quando o banco muda, outro workflow sobe um Supabase de teste e faz um chamado inteiro, do registro ao fim, conferindo a auditoria.

### Acadêmicas

**Qual a contribuição do projeto?**
> Juntar num fluxo só a classificação de risco do Ministério da Saúde, a escolha da viatura pelo tempo real de chegada e a coleta automática dos tempos de cada etapa, que alimenta os indicadores da Gestão.

**Quais as limitações?**
> A cobertura é de Sorocaba, com as fontes públicas disponíveis. Os serviços de rota são públicos e gratuitos, sem garantia de disponibilidade. A Gestão pode incluir um histórico de demonstração, marcado como tal, para os gráficos terem volume. A classificação inicial é uma sugestão: a decisão clínica é sempre do regulador.

### Práticas

**Quanto custa manter?**
> As rotas vêm de servidores públicos e gratuitos (Valhalla e OSRM), e o TomTom é usado dentro da cota gratuita diária, com um teto no próprio backend. Para uso real, o caminho é um Valhalla próprio (licença MIT) e planos pagos de hospedagem.

**Como seria a implantação num SAMU de verdade?**
> Piloto numa base, treinamento dos atendentes e das equipes, e expansão gradual, com os indicadores da Gestão comparando antes e depois.

---

## Antes de apresentar

- [ ] Abrir o site 30 minutos antes e entrar com as duas contas (central e equipe), com o app autenticador à mão.
- [ ] Começar o turno do motorista no celular e permitir localização, som e notificações.
- [ ] Conferir se há viaturas livres e se o mapa mostra o trânsito.
- [ ] Ter capturas de tela de cada etapa como reserva, caso a internet falhe.
- [ ] Ensaiar a demonstração com o tempo marcado.
