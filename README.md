# Sistema de Despacho do SAMU

Projeto acadêmico da Usina de Projetos Experimentais (UPX). É um sistema web de despacho de ambulâncias que junta, numa ferramenta só, a central que atende a ligação, a regulação que classifica o risco e o app da equipe que leva a viatura até o paciente.

**No ar em https://sistema-despacho-upx.vercel.app** (entrada com conta e app autenticador). A demonstração é em Sorocaba/SP.

---

## A ideia

No despacho feito à mão, o atendente decide de cabeça qual viatura mandar, olhando o mapa e falando pelo rádio. O sistema organiza esse trabalho em etapas e ajuda em cada uma:

- a fila mostra primeiro o que é mais grave e espera há mais tempo;
- nenhuma viatura sai antes de a regulação confirmar a cor de risco;
- o despacho recomenda a viatura que chega antes com o trânsito de agora e explica o porquê;
- a equipe recebe o chamado no celular como uma ligação, navega sem sair do app e não marca etapa nenhuma: o GPS marca;
- a Gestão mostra quanto tempo levou cada etapa, por cor, por período e por pessoa.

---

## Como funciona

```
Registro → Regulação → Despacho → App da equipe → Gestão
```

### 1. Registro

O atendente abre o chamado com o endereço (busca por rua ou CEP, ou um clique no mapa), o ponto de referência, o telefone e o que está acontecendo. Os sinais de alerta da triagem (não respira, inconsciente, dor no peito, AVC…) sugerem uma cor, e vale a mais grave marcada. O chamado entra na fila como "Aguardando regulação".

### 2. Regulação

A classificação segue as 4 cores da Regulação Médica das Urgências, do Ministério da Saúde:

| Cor | Significado | Meta de tempo-resposta |
|---|---|---|
| Vermelho | Emergência | 10 min |
| Amarelo | Urgência | 20 min |
| Verde | Pouco urgente | 30 min |
| Azul | Não urgente | 60 min |

A meta conta da abertura do chamado até a chegada ao local. O regulador confirma ou muda a cor sugerida e decide entre três caminhos:

- **mandar viatura**, já com o hospital de destino, se souber;
- **encerrar com orientação** por telefone;
- **cancelar** (trote, chamado repetido, engano, desistência).

Antes da regulação, o chamado não pode ser despachado e a equipe não o vê.

### 3. Despacho

Para o chamado regulado, o backend calcula a rota de cada viatura até o local e dá uma nota a cada uma (ver [Algoritmo de despacho](#algoritmo-de-despacho)). As livres aparecem primeiro, com a explicação em português: *"USA-01 (USA) chega em ~6 min com o trânsito de agora e está disponível. É o tipo ideal para este chamado."* O atendente escolhe e despacha.

### 4. App da equipe

O motorista entra pelo mesmo endereço no celular (dá para instalar como app), assume uma viatura e começa o turno. A posição do celular passa a ser a da viatura.

- **Alarme:** o despacho chega em tela cheia, como uma ligação, com som e vibração a cada 2,5 s até a equipe tocar em "Ciente". Com o app fechado, o aviso chega por Web Push.
- **Navegação própria:** rota no mapa, instruções por voz, velocímetro com o limite da via e a opção de abrir no Waze. A rota já desvia das ocorrências.
- **Etapas pelo GPS:** a caminho (a viatura andou), no local (parou a até 150 m), saiu do local e no hospital (parou a até 200 m do hospital escolhido ou, sem escolha, de qualquer um da lista). Uma etapa marcada não volta atrás.
- **Fim do atendimento:** a equipe registra como terminou: levado ao hospital, atendido no local, recusa, óbito ou não localizado.
- **Ocorrências, no modelo do Waze:** a equipe marca alagamento, árvore caída, via bloqueada e outras; quem passa depois confirma ou avisa que não está mais lá.

### 5. Gestão

Só para a central:

- **Indicadores:** tempo de cada etapa e tempo-resposta contra a meta de cada cor;
- **Histórico:** a linha do tempo e a auditoria de cada chamado (quem abriu, regulou, despachou e dirigiu);
- **Mapa de calor** dos chamados;
- **Por pessoa:** quanto cada atendente registrou, regulou e despachou, e quanto cada motorista atendeu.

Um histórico de demonstração, marcado como tal no banco, dá volume aos gráficos e pode ser tirado por um filtro.

### Ocorrências no mapa

A central só acompanha. Quem põe e tira ocorrências são as fontes oficiais, as equipes e o vencimento:

| Fonte | O que traz |
|---|---|
| CEMADEN | Chuva acumulada das estações de Sorocaba. Perto de um setor de risco de inundação do Serviço Geológico do Brasil (SGB), vira "alagamento provável". |
| Defesa Civil | Alertas oficiais do feed CAP (IDAP/MIDR). |
| TomTom | Incidentes de trânsito e a camada de fluxo do mapa. Ficam só na memória, porque mudam a cada minuto. |
| Equipes | Relatos que valem até outra equipe confirmar ou desmentir. |

Cada ocorrência tem um efeito na rota: **bloqueio** (a rota desvia), **risco** (a rota evita se o desvio custar até 20% a mais, entre 1 e 3 min) e **aviso** (só informa).

---

## Arquitetura

```
 Central e Gestão (navegador) ──┐
 App da equipe (celular, PWA) ──┤
                                ├── login (senha + TOTP) ──> Supabase Auth
                                │
                                └── /api (token do Supabase) ──> Backend Express (Render)
                                                                  ├─> Supabase Postgres (RLS)
                                                                  ├─> Valhalla / OSRM (rotas)
                                                                  ├─> TomTom (trânsito)
                                                                  ├─> CEMADEN, SGB, Defesa Civil (ocorrências)
                                                                  ├─> Nominatim, Photon, ViaCEP (endereços)
                                                                  └─> Web Push (aviso do despacho)
```

| Parte | Tecnologia | Onde roda |
|---|---|---|
| Frontend | React 18, TypeScript, Vite e MapLibre GL (mapa da OpenFreeMap, com dados do OpenStreetMap) | Vercel |
| Backend | Node.js, Express e TypeScript | Render |
| Banco e login | Supabase: Postgres com RLS e Auth com MFA por app autenticador (TOTP) | Supabase |
| Rotas | Valhalla, que desvia de áreas; OSRM de reserva; linha reta se nenhum responder | Servidores públicos |
| Trânsito | TomTom: incidentes, camada de fluxo e tempo da rota | API do TomTom |
| Ocorrências | CEMADEN (PED), setores do SGB e Defesa Civil (CAP) | APIs públicas |
| Aviso | Web Push com chaves VAPID e service worker | Navegador da equipe |

Como as partes conversam:

- **Só o login fala direto com o Supabase.** Todos os dados passam pelo backend, que confere o token (com o MFA concluído, nível `aal2`) e o papel da pessoa: operador da central ou motorista. As tabelas têm RLS ligado e nenhuma política, então a chave pública do site sozinha não lê nada.
- **Cadastro de operador** exige um código de convite da central.
- **Atualização:** a central e o app consultam o backend a cada 10 s. A central continua consultando com a aba em segundo plano, para avisar chamado novo.
- **Rotas:** o Valhalla escolhe o caminho e desvia das ocorrências; o TomTom só cronometra esse caminho com o trânsito de agora. A mesma rota fica 10 min em cache.
- **Banco:** as migrações SQL ficam em `backend/supabase/migrations`. A auditoria de cada chamado (`call_events`) guarda quem fez cada passo.

---

## Algoritmo de despacho

```
Nota = Tempo de chegada × 0,4 + Disponibilidade × 0,3 + Tipo × 0,2 + Ocorrências × 0,1
```

**Tempo de chegada (40%):** o tempo da rota com o trânsito de agora. Até 3 min vale 100, e 25 min ou mais vale 0, em linha reta entre os dois. Sem rota, a estimativa é a distância em linha reta (Haversine) a 40 km/h.

**Disponibilidade (30%):** disponível 100, em atendimento 30, indisponível 0.

**Tipo (20%):** a viatura certa para a cor do chamado.

| Cor | USA | USB | Motolância |
|---|---|---|---|
| Vermelho | 100 | 70 | 50 |
| Amarelo | 90 | 100 | 60 |
| Verde e Azul | 70 | 80 | 100 |

**Ocorrências (10%):** vale a pior ocorrência a até 1 km da viatura ou do chamado, contando da borda da área: bloqueio −15, risco −10, aviso −5. O trânsito do TomTom não entra aqui, porque já pesa no tempo; alertas sem área (para a cidade toda) também não, porque pesariam igual em todas.

**Ordem:** primeiro as livres, que são as únicas que podem ser despachadas; depois a maior nota; no empate, quem chega antes.

O cálculo fica em `backend/src/services/dispatchScore.ts`, testado sem banco em `dispatchScore.test.ts`.

---

## API

Base `/api`. Fora `GET /health` e `POST /auth/signup`, toda rota exige `Authorization: Bearer <token do Supabase>` com o MFA concluído. **(central)** é só para operador e **(equipe)**, só para motorista.

| Grupo | Rotas |
|---|---|
| Conta | `POST /auth/signup`, `GET /me`, `PATCH /me`, `POST /me/password` |
| Turno e viaturas | `POST /shifts/start` e `POST /shifts/end` (equipe), `GET /ambulances`, `PATCH /ambulances/:id/status` e `PATCH /ambulances/:id/location` (equipe) |
| Chamados | `GET /calls`, `GET /calls/pending`, `GET /calls/recent` (central), `POST /calls` (central), `POST /calls/:id/regulate` (central), `PATCH /calls/:id/hospital`, `POST /calls/:id/seen` (equipe), `GET /calls/:id/events` (central) |
| Despacho | `POST /dispatch/analyze` (central), `POST /dispatch/execute` (central), `POST /dispatch/finish` |
| Mapa e rotas | `POST /routes/calculate`, `POST /routes/limits`, `GET /geocode/search`, `GET /geocode/reverse`, `GET /traffic/flow/:z/:x/:y.pbf`, `GET /hospitals`, `GET /bases` |
| Ocorrências | `GET /incidents`, `POST /incidents` (equipe), `POST /incidents/:id/vote` (equipe), `GET /official/status` (central) |
| Aviso no celular | `GET /push/key`, `POST /push/subscribe` e `DELETE /push/subscribe` (equipe) |
| Gestão (central) | `GET /stats`, `GET /management/indicators`, `GET /management/calls`, `GET /management/heatmap`, `GET /management/people` |

As respostas em JSON têm o formato `{ success, data | error, timestamp }`, com a mensagem de erro em português.

---

## Decisões do desenvolvimento

### As 4 cores de risco são as únicas cores fortes

Vermelho, amarelo, verde e azul só aparecem para dizer a cor de um chamado. O resto da interface é neutro: botões em tinta escura de dia e grafite à noite, avisos em cinza e os gráficos da Gestão com um violeta que não se confunde com a classificação. Assim, quando algo está vermelho, é um Vermelho.

- A cor de cada chamado aparece como uma **pulseira**: a faixa na borda do cartão, igual à pulseira da classificação de risco no hospital.
- A cor nunca vem sozinha: tem sempre o nome ("Vermelho") e um ícone, para quem não distingue as cores.
- As cores saem de um lugar só (`PRIORITY_META`, em `frontend/src/utils/calls.ts`) e viram variáveis do CSS; os gráficos e o mapa de calor não guardam cópias.

### Despacho que se explica

A nota é uma soma ponderada simples de propósito: o atendente vê os quatro fatores e a frase que resume a escolha, e a decisão final continua sendo dele. O tempo de chegada usa a rota real com o trânsito de agora, não a distância, porque a viatura mais perta em linha reta muitas vezes não é a que chega antes.

### Tema dia e noite

O padrão é "Automático": o tema troca no nascer e no pôr do sol de Sorocaba, calculados no próprio aparelho. A pessoa pode fixar Claro ou Escuro, e a escolha fica na conta. O escuro existe para a equipe dirigindo à noite: fundo escuro, menos brilho e as cores de risco ajustadas para manter o contraste.

### Etapas sem toque

Quem dirige não deve mexer no celular. Por isso as etapas do atendimento saem da posição da viatura, e as regras exigem parar (passar em frente não conta), para que a outra pista da avenida ou um hospital no caminho não marquem a etapa errada.

### Testes e CI

- **Backend:** testes com `node:test` das regras que não dependem do banco: nota do despacho, regulação, etapas pelo GPS, desvio de áreas, leitura das fontes oficiais, indicadores e Web Push.
- **Frontend:** Vitest e Testing Library para os componentes e as regras, incluindo um teste de contraste que confere as cores dos dois temas.
- **CI (GitHub Actions):** a cada push, os jobs `Backend` (tipos e testes) e `Frontend` (testes, tipos e o mesmo build da Vercel), exigidos pela regra do `main`.
- **Banco:** quando as migrações mudam, um workflow sobe o Supabase local e confere de ponta a ponta o seed, o RLS, o login com MFA, o cadastro e um chamado passando por registro, regulação, despacho e fim, com a auditoria de cada passo.
- **Deploy:** a Vercel publica o frontend e o Render publica o backend a cada merge no `main`.
