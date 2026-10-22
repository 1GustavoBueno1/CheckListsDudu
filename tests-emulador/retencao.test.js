// Retenção no emulador: cada setor apaga só o próprio vencido; o chefe, o de todos.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { criarRepositorio } from '../src/repositorio.js';
import { diaSP, somarDias } from '../src/regras.js';
import { cortes, datasParaLimpar } from '../src/retencao.js';

const UID = { cozinha: 'ScjaryIu84Y5IzTqSC9trkmGhsI2', chefe: 'EfC9RQNucAVR2BJn0Gx0iAqbSQb2' };
let env;
const repo = (quem) => criarRepositorio(env.authenticatedContext(UID[quem]).firestore());
const hoje = diaSP();
const c = cortes(hoje);
const janelas = { datasFotos: datasParaLimpar(null, c.fotos), datasRespostas: datasParaLimpar(null, c.respostas) };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checklists',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const id = (dias, setor, item) => `${somarDias(hoje, -dias)}_${setor}_almoco_${item}`;
async function semear(dias, setor, item, comFoto = true) {
  const data = somarDias(hoje, -dias);
  const agora = Timestamp.now();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const i = id(dias, setor, item);
    await setDoc(doc(db, 'respostas', i), {
      data, setor, turno: 'almoco', item, resposta: 'sim', observacao: '', funcionario_id: 'f', funcionario: 'X', tem_foto: comFoto, criado_em: agora, atualizado_em: agora,
    });
    if (comFoto) await setDoc(doc(db, 'fotos', i), { data, setor, turno: 'almoco', item, imagem: 'data:image/jpeg;base64,AAAA', criado_em: agora });
    await setDoc(doc(db, 'observacoes_turno', `${data}_${setor}_almoco`), { data, setor, turno: 'almoco', texto: 'x', funcionario: 'X', atualizado_em: agora });
  });
}
// withSecurityRulesDisabled não devolve o valor da função: guarda numa variável.
async function existe(colecao, docId) {
  let achou;
  await env.withSecurityRulesDisabled(async (ctx) => {
    achou = (await getDoc(doc(ctx.firestore(), colecao, docId))).exists();
  });
  return achou;
}

beforeEach(async () => {
  await env.clearFirestore();
  await semear(6, 'cozinha', 'coz-01'); // foto de 6 dias: ainda fica
  await semear(7, 'cozinha', 'coz-02'); // foto de 7 dias: vence
  await semear(29, 'cozinha', 'coz-03'); // resposta de 29 dias: fica (foto vence)
  await semear(30, 'cozinha', 'coz-04'); // resposta de 30 dias: vence
  await semear(7, 'garcons', 'gar-01'); // outro setor
  await semear(30, 'garcons', 'gar-02');
});

describe('apagarVencidos', () => {
  it('setor apaga só o próprio vencido e nada dentro do prazo', async () => {
    const r = await repo('cozinha').apagarVencidos({ setor: 'cozinha', ...janelas });
    expect(await existe('fotos', id(6, 'cozinha', 'coz-01'))).toBe(true);
    expect(await existe('fotos', id(7, 'cozinha', 'coz-02'))).toBe(false);
    expect(await existe('respostas', id(7, 'cozinha', 'coz-02'))).toBe(true); // resposta fica até 30 dias
    expect(await existe('respostas', id(29, 'cozinha', 'coz-03'))).toBe(true);
    expect(await existe('fotos', id(29, 'cozinha', 'coz-03'))).toBe(false);
    expect(await existe('respostas', id(30, 'cozinha', 'coz-04'))).toBe(false);
    expect(await existe('observacoes_turno', `${somarDias(hoje, -30)}_cozinha_almoco`)).toBe(false);
    expect(await existe('observacoes_turno', `${somarDias(hoje, -29)}_cozinha_almoco`)).toBe(true);
    // Garçons intactos
    expect(await existe('fotos', id(7, 'garcons', 'gar-01'))).toBe(true);
    expect(await existe('respostas', id(30, 'garcons', 'gar-02'))).toBe(true);
    expect(r).toEqual({ fotos: 3, respostas: 1, observacoes: 1 });
  });
  it('chefe apaga o vencido de todos os setores', async () => {
    await repo('chefe').apagarVencidos({ setor: null, ...janelas });
    expect(await existe('fotos', id(7, 'garcons', 'gar-01'))).toBe(false);
    expect(await existe('respostas', id(30, 'garcons', 'gar-02'))).toBe(false);
    expect(await existe('fotos', id(6, 'cozinha', 'coz-01'))).toBe(true);
  });
  it('rodar duas vezes não dá erro (o que já sumiu é ignorado)', async () => {
    await repo('cozinha').apagarVencidos({ setor: 'cozinha', ...janelas });
    await expect(repo('cozinha').apagarVencidos({ setor: 'cozinha', ...janelas })).resolves.toEqual({ fotos: 0, respostas: 0, observacoes: 0 });
  });
});
