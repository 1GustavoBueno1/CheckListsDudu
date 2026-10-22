# Checklists Dudu

Checklist diário por setor da Dudu Bebidas (Cozinha, Garçons, Conveniência/Caixa e
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

## Console do Firebase (projeto `dudu-checklist`)

1. Projeto criado.
2. App web registrado. A configuração vai em `src/firebase-config.js`.
3. Authentication com **E-mail/senha** e as 5 contas, com os UIDs em `src/contas.js`.
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
