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

## Console do Firebase (projeto `dudu-checklists`)

1. Projeto criado.
2. App web registrado. A configuração vai em `src/firebase-config.js`.
3. Authentication com **E-mail/senha** e as 5 contas, com os UIDs em `src/contas.js`.
4. Firestore em `southamerica-east1` (São Paulo), modo produção.

Nada disso pede cartão. Se aparecer pedido de upgrade para o plano Blaze, recuse.

## Desenvolvimento

```bash
npm install
npm test                 # testes sem emulador (itens, regras do checklist, contas)
npm run test:emulador    # testes nos emuladores do Firebase (precisa de Java 11+)
npm run emuladores       # terminal 1: emuladores de Auth + Firestore (projeto demo)
npm run dev:emulador     # terminal 2: app ligado aos emuladores
```
