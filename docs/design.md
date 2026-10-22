# Checklist dos setores da Dudu Bebidas: design

> **Status: APROVADO pelo Gustavo em 21/10/2026.** Escrito pelo Claude a partir dos 4 PDFs
> de checklist (Cozinha, Garçons, Conveniência/Caixa e Limpeza). As decisões estão na
> seção 13 e as etapas na seção 14.

## 1. Objetivo

Cada setor preenche, no celular, o checklist do seu turno. Os itens marcados com (FOTO)
só podem ser marcados como feitos com uma foto. O chefe abre um painel e confere, por
data, o que cada setor fez, quem fez e as fotos.

## 2. Plano gratuito (Spark), sem cartão

- Firebase **Hosting + Firestore + Authentication**, sem servidor próprio, sem Cloud
  Functions e sem Cloud Storage. Pelo que sabemos, o Cloud Storage exige o plano Blaze em
  projetos novos.
- As **fotos ficam no Firestore**: reduzidas no próprio celular e guardadas uma por
  documento. Com 7 dias de fotos, o banco fica em torno de 243 MB, e o limite é 1 GiB.
- Projeto Firebase **novo e separado** do app de custos da cozinha.

## 3. Contas e papéis

| Conta | Quem usa | Pode |
|---|---|---|
| Cozinha | celular da cozinha | ver e preencher só o checklist da Cozinha |
| Garçons | celular dos garçons | só o dos Garçons |
| Conveniência | celular do caixa | só o da Conveniência/Caixa |
| Limpeza | celular da limpeza | só o da Limpeza |
| Chefe | o chefe | ver todos os setores e cadastrar os funcionários |

- As 5 contas (e-mail + senha) são criadas no console do Firebase. O app não tem tela de
  cadastro de contas.
- Cada conta fica logada no celular do setor e tem o botão Sair.
- **Nome de quem fez:** antes de começar, o funcionário escolhe o próprio nome numa lista.
  O chefe cadastra os nomes de cada setor. Cada resposta guarda o nome e a hora do
  servidor.

## 4. Setores, turnos e itens

- Cozinha, Garçons e Conveniência têm **2 turnos por dia: Almoço e Noite**. Cada turno é
  um checklist separado.
- A Limpeza é **diária, sem turno**, e segue o cronograma semanal (seção 5.3).
- Os itens são **os mesmos todos os dias** e estão listados no Anexo A, copiados dos PDFs.

## 5. Telas

### 5.1 Login
E-mail e senha. A mensagem de erro é genérica ("E-mail ou senha inválidos").

### 5.2 Checklist do setor (Cozinha, Garçons, Conveniência)
1. O topo mostra a data de hoje (fuso de São Paulo), a escolha do **turno** (Almoço ou
   Noite) e o seletor **"Quem está preenchendo"**.
2. A lista de itens aparece nas seções do PDF, como "1. Antes de abrir o restaurante" nos
   Garçons. Cada item tem:
   - **Sim / Não**;
   - **Observação** (opcional);
   - nos itens (FOTO), o botão **"Tirar foto"**. Para marcar **Sim** num item (FOTO), a
     foto é obrigatória. O "Não" não exige foto.
3. Cada resposta é **salva na hora**. Se o celular desligar, nada se perde.
4. Até o fim do dia dá para trocar a resposta ou a foto. A troca fica registrada com o
   novo nome e a nova hora.
5. No fim da lista há um campo de **Observações gerais** do turno, como no papel.
6. Uma barra de progresso mostra quantos itens do turno estão respondidos (ex.: 12 de 19).

### 5.3 Limpeza (cronograma semanal)
- Todo dia aparece **"Limpeza geral"**, com foto.
- Aparece também a **atividade do dia da semana** (Anexo A), já escolhida, com foto. O PDF
  permite trocar os dias, então o funcionário pode **escolher outra atividade da semana**.
- Uma área **"Esta semana"** mostra quais das 7 atividades já foram feitas.
- **Avisos**:
  - açougue e churrasqueira sem lavagem há **mais de 7 dias**;
  - câmaras frias do açougue sem higienização há **mais de 15 dias**.
- Os lembretes fixos do PDF ficam visíveis, por exemplo "O chão e o vidro do buffet são
  responsabilidade do setor de limpeza".

### 5.4 Painel do chefe
- Escolhe a **data**: as fotos ficam disponíveis por 7 dias e as respostas por 30 dias.
- Para cada setor e turno:
  - o progresso;
  - os itens marcados **"Não"** em destaque;
  - o nome de quem respondeu e a hora;
  - as fotos em miniatura. Ao tocar, a foto abre grande.
- Mostra os **avisos da Limpeza** e a semana da Limpeza.
- Mostra os **itens não respondidos** de cada turno.

### 5.5 Funcionários (só o chefe)
Para cada setor, o chefe adiciona, renomeia ou desativa os nomes que aparecem em "Quem
está preenchendo".

## 6. Dados no Firestore

| Coleção | ID do documento | Campos |
|---|---|---|
| `respostas` | `AAAA-MM-DD_setor_turno_item` | data, setor, turno, item, resposta (`sim`/`nao`), observacao, funcionario, tem_foto, criado_em, atualizado_em |
| `fotos` | igual ao da resposta | data, setor, imagem (JPEG em texto base64), criado_em |
| `observacoes_turno` | `AAAA-MM-DD_setor_turno` | data, setor, turno, texto, funcionario, atualizado_em |
| `funcionarios` | automático | setor, nome, ativo |

- Por que as fotos ficam em outra coleção: para o painel listar as respostas **sem baixar
  as fotos**. Ele só baixa a foto quando vai mostrá-la, o que economiza leituras e dados.
- O ID composto garante **uma resposta por item, turno e dia**.
- As datas ficam como texto `AAAA-MM-DD` no fuso de São Paulo, e a hora vem do servidor.

## 7. Fotos

- O botão abre a **câmera traseira** (`capture="environment"`).
- **Limite:** em alguns celulares a pessoa ainda consegue escolher uma foto da galeria. O
  sistema garante e mostra a **hora do envio**, não a hora em que a foto foi tirada.
- A foto é **reduzida no celular** antes do envio: lado maior com 1280 px, em JPEG. O alvo
  é ficar com até cerca de 300 KB, e o app recusa acima de 900 KB por causa do limite de
  1 MiB por documento do Firestore.

## 8. Por quanto tempo os dados ficam

- **Fotos: 7 dias. Respostas: 30 dias.** Os avisos da Limpeza precisam olhar até 15 dias
  para trás.
- Sem servidor, nada roda sozinho à meia-noite. Por isso, **quando o app é aberto**, ele
  apaga as fotos e as respostas mais antigas que esses prazos. As regras só permitem
  apagar o que já passou do prazo.
- Se ninguém abrir o app por alguns dias, a limpeza acontece na próxima abertura. Isso
  não causa problema.

## 9. Segurança

- **Regras do Firestore:**
  - cada conta de setor lê e grava **só os documentos do próprio setor**;
  - o chefe lê tudo;
  - só o chefe mexe em `funcionarios`.
- **Validação nas regras:**
  - campos exatos, tipos e tamanho máximo da foto;
  - resposta só `sim` ou `nao`;
  - a data precisa ser **hoje** pelo relógio do servidor, então não dá para lançar
    resposta em outro dia.
- **No navegador:** as mesmas proteções do app da cozinha.
  - Nada de `innerHTML`: o texto do usuário é exibido sempre como texto.
  - CSP estrita, proteção contra clickjacking e os outros cabeçalhos de segurança.
- **O que as regras não garantem:**
  - qual **pessoa** usou a conta do setor. O nome é escolhido na lista, e o sistema confia
    nessa escolha;
  - se a foto mostra mesmo o item.

## 10. Consumo estimado (Spark)

Para um dia completo (109 respostas e 80 fotos). Os números detalhados e a origem de cada um
estão no README. Resumo, **com o tamanho real medido das fotos (~444 KB cada no banco)**:

| Recurso | Estimativa por dia | Limite grátis |
|---|---|---|
| Gravações | ~230 | 20.000 por dia |
| Leituras | ~3.000 a 6.000 | 50.000 por dia |
| Fotos guardadas | ~35 MB por dia, ~243 MB em 7 dias | 1 GiB no total (~24%) |
| Dados enviados | ~35 MB por conferência completa do dia | 10 GiB por mês |

> Correção: a primeira versão deste documento estimava ~16 MB por dia, usando 200 KB por
> foto. O tamanho medido é mais que o dobro, e o uso real do espaço é de ~24%, não ~11%.

## 11. Tecnologia

Igual ao app da cozinha:
- HTML, CSS e JavaScript (Vite), com o SDK modular do Firebase;
- testes com Vitest e com os emuladores do Firebase, incluindo as regras;
- deploy automático pelo GitHub Actions, só se os testes passarem;
- visual com a identidade da Dudu Bebidas, pensado primeiro para o celular.

## 12. Fora do escopo

Notificações no celular, relatório em PDF, conta individual por funcionário, fotos com
mais de 7 dias e gráficos.

## 13. Decisões (respondidas em 21/10/2026)

1. **Itens fixos no código.** Para mudar um item, o pedido vai ao Claude, que faz um novo
   deploy. **Sim.**
2. **Respostas com mais de 30 dias somem do painel.** **Sim.**
3. **Só dá para preencher o dia de hoje.** **Sim.**
4. **Repositório público:** decisão do dono do repositório. Nada secreto vai para o
   código.
5. **Projeto Firebase:** `dudu-checklist`.

**Limpeza:** em um mesmo dia o funcionário pode registrar **mais de uma** atividade da
semana. A atividade do dia vem primeiro na tela. Assim fica coberta a regra "os dias podem
ser alterados".

## 14. Etapas

Cada etapa termina com os testes passando e é mostrada antes da próxima.

1. Projeto Vite, itens dos 4 setores e regras puras (datas, Sim exige foto, progresso,
   cronograma e avisos da Limpeza, prazos de 7 e 30 dias), com testes.
2. Firebase: configuração, emuladores e README com os passos do console.
3. Login e direcionamento por conta (setor ou chefe).
4. Regras do Firestore, testadas no emulador.
5. Funcionários (chefe) e checklist do setor (Sim/Não, observação, salvar na hora).
6. Fotos: câmera, redução no celular, envio e troca.
7. Limpeza: semana, várias atividades por dia e avisos.
8. Painel do chefe.
9. Limpeza automática de fotos (7 dias) e respostas (30 dias).
10. Visual Dudu, cabeçalhos de segurança, deploy pelo GitHub Actions e checklist final.

## Anexo A. Itens por setor (copiados dos PDFs)

(F) = exige foto para marcar "Sim".

### Cozinha (Geral), turnos Almoço e Noite
1. Os pratos e garfos foram higienizados? (F)
2. O chão do acesso e da cozinha está limpo? (F)
3. As bancadas de mármore estão limpas? (F)
4. O pote dos garfos e facas está cheio? (F)
5. As 2 pilhas de pratos estão cheias? (F)
6. Há guardanapo, palito, sal, vinagre e azeite de oliva? (F)
7. Os pegadores e colheres estão em perfeitas condições? (F)
8. A revisão no buffet está sendo feita a cada 15 min?
9. A câmara fria 6 portas está limpa e organizada? (F)
10. As bancadas de inox estão limpas e brilhando? (F)
11. O fogão a gás e a chapa estão limpos e brilhando? (F)
12. As mesas da cozinha estão limpas (em cima e embaixo)? (F)
13. A fritadeira está limpa e com óleo trocado (se necessário)? (F)
14. A coifa e o exaustor estão limpos e brilhando? (F)
15. O freezer está limpo (interno e externo)? (F)
16. Os vidros e janelas estão limpos? (F)
17. Os alimentos estão organizados? (F)
18. Os utensílios e produtos de limpeza estão completos? (Se faltar algum, anotar qual em
    Observação.)
19. O controle de estoque está em dia, sem faltar produtos e usando antes da data de
    vencimento?

### Garçons, turnos Almoço e Noite
**1. Antes de abrir o restaurante**
1. O salão está limpo e organizado? (F)
2. As mesas, cadeiras e bancos foram limpos? (F)
3. Todas as mesas estão alinhadas? (F)
4. O chão está limpo e seco? (F)
5. Os cardápios e materiais de atendimento estão organizados? (F)
6. Há copos, talheres e pratos limpos disponíveis? (F)
7. A área externa e a entrada estão organizadas? (F)

**2. Durante o atendimento**
8. A cozinha foi informada sobre as observações e restrições dos pedidos?
9. Os pedidos foram acompanhados e os possíveis atrasos comunicados?
10. Os pratos e bebidas foram servidos com cuidado?
11. Cada pedido entregue correspondia à mesa correta?
12. Foi verificado se os clientes precisavam de algo durante a refeição?
13. Os pratos, copos e utensílios usados foram retirados quando apropriado?
14. As mesas foram limpas e reorganizadas após a saída dos clientes? (F)
15. O salão foi mantido organizado, inclusive nos horários de movimento? (F)
16. Reclamações e problemas foram comunicados ao responsável?

**3. Organização de bebidas e materiais**
17. As bebidas de serviço estão organizadas? (F)
18. As geladeiras e expositores estão organizados conforme a orientação da casa? (F)
19. O responsável foi avisado sobre os produtos que estão acabando?
20. Os copos e taças estão limpos e guardados corretamente? (F)
21. O salão está sem caixas, garrafas ou materiais espalhados? (F)
22. A estação de serviço está limpa e abastecida? (F)

### Conveniência / Caixa, turnos Almoço e Noite
1. As prateleiras estão repostas? (F)
2. O balcão do caixa está organizado? (F)
3. As geladeiras estão limpas e repostas para a demanda alta? (F)
4. As máquinas de cartão estão carregadas?
5. Os computadores e as impressoras estão funcionando corretamente?
6. As prateleiras estão limpas? Produtos sem poeira? (F)
7. A adega de vinho está limpa e devidamente reposta? (F)
8. A bancada do café está limpa e organizada? (F)
9. Você pegou seu turno organizado?
10. A parte externa da frente está limpa? (calçada, mesas, calçamento) (F)
11. O estacionamento está sem lixo? (F)
12. O depósito da conveniência está organizado? (F)

### Limpeza (cronograma semanal, sem turno)
Todo dia: **Limpeza geral** (F), mais a atividade do dia (F):

| Dia | Atividade |
|---|---|
| Segunda | Faxina nos banheiros |
| Terça | Câmaras frias do açougue |
| Quarta | Vidros |
| Quinta | Depósitos |
| Sexta | Limpeza externa |
| Sábado | Açougue e churrasqueira |
| Domingo | Revisão da limpeza e organização |

Regras e lembretes do PDF:
- O açougue e a churrasqueira devem ser lavados (chão, paredes e teto) no mínimo 1 vez
  por semana. O app avisa depois de 7 dias.
- As câmaras frias do açougue devem ser higienizadas internamente a cada 15 dias. O app
  avisa depois de 15 dias.
- As atividades podem mudar de dia, desde que todas sejam feitas.
- O chão e o vidro do buffet são responsabilidade do setor de limpeza.
- Tirar 1 foto de cada atividade feita.

Observação: o PDF dos Garçons lista 22 itens. A contagem de 23 na conversa estava errada.
