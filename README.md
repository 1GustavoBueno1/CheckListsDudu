# Checklists Dudu

Checklist diário por setor da Dudu Bebidas (Cozinha, Garçons, Conveniência/Caixa, Churrasco e
Limpeza), com fotos obrigatórias e um painel para o chefe. Roda 100% no plano gratuito
(Spark) do Firebase: Hosting + Firestore + Authentication, sem servidor e sem cartão.

O design completo e as etapas estão em [`docs/design.md`](docs/design.md).

## Segurança

- A configuração em `src/firebase-config.js` **não é segredo**: ela vai para o navegador
  de qualquer visitante. Quem protege os dados são as regras do Firestore
  (`firestore.rules`).
- Cada conta tem um papel, definido pelo UID em `src/contas.js` e nas regras: uma conta
  por setor e uma do chefe.
- Nunca coloque no repositório chaves de conta de serviço, senhas ou tokens.

## Regras do Firestore (`firestore.rules`)

- **Cada setor só vê e grava o próprio setor.** O chefe lê tudo e não preenche
  checklist. Contas fora do sistema e visitantes sem login não veem nada.
- **Só a data de hoje** (fuso de São Paulo): não dá para gravar nem alterar o checklist
  de outro dia.
- **"Sim" num item com (FOTO) só é aceito com a foto gravada junto**, no mesmo lote.
- **O nome de quem fez** precisa ser de um funcionário **ativo, do mesmo setor**,
  cadastrado pelo chefe.
- Só aceita os **itens dos PDFs**, nos turnos certos: Almoço e Noite, ou "dia" na Limpeza.
- **Foto:** JPEG com até cerca de 700 KB.
- **Apagar:** só o que venceu (fotos com 7 dias e respostas com 30 dias, contando hoje).
  A exceção é a foto de hoje, que o próprio setor pode trocar.
- Testes: `npm run test:emulador`. Também foram feitas mutações nas regras para provar
  que os testes pegam cada falha.
- **Os UIDs e a lista de itens sem foto aparecem nas regras e no app.** Um teste
  (`tests/regras-arquivo.test.js`) falha se os dois divergirem.

### O que as regras não garantem

1. **Qual pessoa** usou a conta do setor. O nome é escolhido na lista e o sistema confia
   nessa escolha.
2. **O conteúdo da foto.** As regras não sabem se a foto mostra mesmo o item, nem se foi
   tirada agora ou veio da galeria.
3. **Horário de verão.** O dia de São Paulo é calculado como UTC-3. Se o Brasil voltar a
   ter horário de verão, a regra precisa ser ajustada.
4. **A senha das contas.** Quem souber a senha de um setor age como aquele setor.

## Por quanto tempo os dados ficam (`src/retencao.js`)

- **Fotos: 7 dias. Respostas e observações: 30 dias**, contando hoje.
- Sem servidor, quem apaga é o próprio app: **3 segundos depois do login**, em segundo
  plano. Cada setor apaga o que é dele, e o chefe apaga o de todos. As regras só deixam
  apagar o que já venceu.
- Cada aparelho lembra até que data já limpou. No dia a dia só a data que acabou de
  vencer é consultada, e abrir de novo no mesmo dia não faz consulta nenhuma.
- As fotos são achadas pelas respostas, que têm o mesmo ID, então o app **não baixa as
  imagens para apagá-las**.
- **Limite:** cada limpeza olha no máximo as 30 datas anteriores ao prazo. Um dado só
  escaparia se nenhum aparelho do setor nem o chefe abrisse o app por uns 2 meses. Mesmo
  assim, o espaço usado ficaria muito abaixo do limite gratuito.

## Proteções no navegador

- **Sem `innerHTML`**: todo texto digitado é exibido com `textContent` (`src/dom.js` recusa
  `innerHTML`). Um nome como `<img src=x onerror=alert(1)>` aparece como texto.
- **Cabeçalhos de segurança** (`firebase.json`, aplicados pelo Firebase Hosting):
  - `Content-Security-Policy`: scripts, estilos e fontes só do próprio site; imagens do
    site e `data:` (as fotos); conexões só com o Firestore e o Authentication do Google;
    sem `eval`, sem plugins, sem scripts de terceiros.
  - `frame-ancestors 'none'` e `X-Frame-Options: DENY`: o app não pode ser embutido em
    outro site (contra *clickjacking*).
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`
    e HSTS.
  - A página inicial (`/` e `/index.html`) **nunca fica em cache**, para uma atualização
    chegar na hora. Os arquivos de `/assets` têm nome com hash e ficam em cache por 1 ano.
- **Fontes e logo servidos pelo próprio app**: nenhum pedido a Google Fonts ou a outros
  servidores. O Vite não embute arquivos como `data:` (`vite.config.js`).
- A CSP foi testada com o **build de produção** servido pelo emulador do Hosting: login,
  checklist com foto, painel, Limpeza e funcionários funcionaram **sem nenhuma violação**,
  e um script externo carregado de propósito foi bloqueado.

## Deploy (publicação)

O deploy é **automático pelo GitHub Actions** (`.github/workflows/deploy-firebase.yml`): a
cada mudança na `main` (menos só em documentos), ele roda os testes unitários e os testes no
emulador e, **só se tudo passar**, faz o build e publica o Hosting e as regras do Firestore.
Também dá para rodar à mão em GitHub > Actions > "Deploy no Firebase" > Run workflow.

- A chave da conta de serviço fica no secret `FIREBASE_SERVICE_ACCOUNT` do repositório
  (Settings > Secrets and variables > Actions > **Repository secrets**). Ela é gravada num
  arquivo temporário, usada pelo `firebase deploy` e apagada no fim. Nunca vai para o código.
- A chave é a do projeto **`dudu-checklist`** (cada projeto tem a sua).
- Endereços: https://dudu-checklist.web.app e https://dudu-checklist.firebaseapp.com
- Se o deploy falhar por **permissão** (erro 403 ou "permission denied"), a conta de
  serviço `firebase-adminsdk-…@dudu-checklist.iam.gserviceaccount.com` precisa destes papéis em
  https://console.cloud.google.com/iam-admin/iam?project=dudu-checklist : *Firebase Hosting
  Admin*, *Firebase Rules Admin* e *Service Usage Consumer*.
- O deploy publica **só o site e as regras** (não os índices). As consultas do app usam só
  filtros de igualdade, que o Firestore atende sem índice composto. **O emulador não confere
  índices**: se o app real mostrar um erro pedindo índice, avise (o erro traz um link).

## Consumo estimado do plano gratuito (Spark)

Limites do Spark consultados em 10/2026 (confira em https://firebase.google.com/pricing):
Firestore com 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia, 1 GiB guardado e
10 GiB por mês de dados enviados; Hosting com 10 GB guardados e 360 MB de transferência por dia.

Suposição: um **dia completo**, com tudo preenchido: 133 respostas (Cozinha 48, Garçons 52,
Conveniência 24, Churrasco 6, Limpeza 3) e **105 fotos**, mais observações e correções.

| Recurso | Estimativa por dia | Limite | Uso |
|---|---|---|---|
| Gravações | ~280 | 20.000 por dia | ~1% |
| Exclusões (limpeza automática) | ~260 | 20.000 por dia | ~1% |
| Leituras | ~3.000 a 6.000 | 50.000 por dia | ~6% a 12% |
| **Fotos guardadas** | **~47 MB por dia (~444 KB cada, medido)** | 1 GiB no total | **~326 MB em 7 dias = ~32%** |
| Dados enviados ao conferir | ~47 MB se o chefe abrir todas as fotos do dia | 10 GiB por mês | ~1,4 GiB em 30 dias = ~14% |
| Hosting | ~1,5 MB na 1ª visita, quase nada depois | 360 MB por dia | < 1% |

De onde vêm as leituras: cada abertura de checklist lê as respostas do turno (até 26) e os
nomes do setor; o painel lê as respostas do dia; as regras fazem 1 leitura por resposta
gravada (conferem o funcionário) e mais 1 quando há foto; a limpeza lê as respostas de uma
data por aparelho. As fotos só são baixadas quando alguém toca em "Ver foto".

**Atenção:** as fotos são o que mais pesa. Se o número de itens com foto crescer ou os
prazos aumentarem, refaça esta conta: o limite de 1 GiB é o primeiro que se aproxima.

## Checklist depois do deploy

1. Abra https://dudu-checklist.web.app: aparece a tela de login com o logo.
2. Numa aba anônima, sem login, nenhuma tela além do login aparece.
3. Entre como **Chefe** > **Funcionários** e cadastre os nomes de cada setor.
4. Entre como **Cozinha** (de preferência no celular): escolha o nome, responda um item
   sem foto e um item com foto. **Confira que a câmera abre** e que a foto aparece em "Ver foto".
5. Confirme que um item com foto **não aceita "Sim" sem a foto**.
6. Entre como **Chefe** > **Painel**: o progresso da Cozinha aparece, e "Ver fotos" mostra a
   foto enviada. Toque nela para ampliar.
7. Entre como **Limpeza**: aparecem os avisos do açougue e das câmaras (até alguém registrar),
   a atividade do dia e a semana.
8. Entre com cada conta de setor e confira que **cada uma vê só o próprio setor**.
9. No console do Firebase, em Firestore > Regras, as regras publicadas têm os 5 UIDs e não
   são `allow read, write: if false`.
10. No console, em Uso e faturamento, o plano continua **Spark**, sem cartão.
11. Apague os dados de teste (respostas e fotos) ou espere o prazo de 7 e 30 dias.

## Console do Firebase (projeto `dudu-checklist`)

1. Projeto criado.
2. App web registrado. A configuração vai em `src/firebase-config.js`.
3. Authentication com **E-mail/senha** e as 6 contas, com os UIDs em `src/contas.js`.
4. Firestore em `southamerica-east1` (São Paulo), modo produção.

Nada disso pede cartão. Se aparecer pedido de upgrade para o plano Blaze, recuse.

## Desenvolvimento

```bash
npm install
npm test                 # testes sem emulador (itens, regras do checklist, contas, regras × app)
npm run test:emulador    # testes nos emuladores do Firebase (precisa de Java 11+)
npm run emuladores       # terminal 1: emuladores de Auth + Firestore (projeto demo)
npm run dev:emulador     # terminal 2: app ligado aos emuladores
```
