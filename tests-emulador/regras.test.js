// Testes das regras do Firestore (firestore.rules) no emulador.
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { SETORES, itensDoSetor } from '../src/itens.js';
import { diaSP, somarDias } from '../src/regras.js';

const UID = {
  cozinha: 'ScjaryIu84Y5IzTqSC9trkmGhsI2',
  garcons: 'NVErpPpmVHdlzlXwfTZfZFEmSMy1',
  conveniencia: 'jLYSnaK3MHdTeKSgGZhs6W9D9b92',
  limpeza: '8r2CdyO1AOTmvEVRpEE4PABPf882',
  chefe: 'EfC9RQNucAVR2BJn0Gx0iAqbSQb2',
};
const FUNC = { cozinha: 'f-coz', garcons: 'f-gar', conveniencia: 'f-conv', limpeza: 'f-limp' };
const NOME = { cozinha: 'Ana', garcons: 'Bruno', conveniencia: 'Carla', limpeza: 'Davi' };

let env;
const hoje = diaSP();
const db = (quem) => env.authenticatedContext(UID[quem]).firestore();
const intruso = () => env.authenticatedContext('O91aw1kO6pNqn7VbgbxRFLaCzVI2').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checklists',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const comoAdmin = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

beforeEach(async () => {
  await env.clearFirestore();
  await comoAdmin(async (a) => {
    for (const s of Object.keys(FUNC)) await setDoc(doc(a, 'funcionarios', FUNC[s]), { setor: s, nome: NOME[s], ativo: true });
    await setDoc(doc(a, 'funcionarios', 'f-coz-inativo'), { setor: 'cozinha', nome: 'Edu', ativo: false });
  });
});

const id = (data, setor, turno, item) => `${data}_${setor}_${turno}_${item}`;
const turnoDe = (setor) => (setor === 'limpeza' ? 'dia' : 'almoco');

function resposta(setor, item, extra = {}) {
  return {
    data: hoje,
    setor,
    turno: turnoDe(setor),
    item,
    resposta: 'nao',
    observacao: '',
    funcionario_id: FUNC[setor],
    funcionario: NOME[setor],
    tem_foto: false,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp(),
    ...extra,
  };
}
const refResposta = (banco, r) => doc(banco, 'respostas', id(r.data, r.setor, r.turno, r.item));

const JPEG = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
function foto(setor, item, extra = {}) {
  return { data: hoje, setor, turno: turnoDe(setor), item, imagem: JPEG, criado_em: serverTimestamp(), ...extra };
}
const refFoto = (banco, f) => doc(banco, 'fotos', id(f.data, f.setor, f.turno, f.item));

/** Grava foto + resposta "Sim" no mesmo lote, como o app faz. */
function simComFoto(banco, setor, item) {
  const lote = writeBatch(banco);
  const f = foto(setor, item);
  lote.set(refFoto(banco, f), f);
  const r = resposta(setor, item, { resposta: 'sim', tem_foto: true });
  lote.set(refResposta(banco, r), r);
  return lote.commit();
}

// Documento gravado direto (sem regras), com data e setor à escolha.
async function semear(colecao, dados) {
  const docId = colecao === 'observacoes_turno'
    ? `${dados.data}_${dados.setor}_${dados.turno}`
    : id(dados.data, dados.setor, dados.turno, dados.item);
  const agora = Timestamp.now();
  const completos = colecao === 'fotos' ? { ...dados, criado_em: agora } : { ...dados, criado_em: agora, atualizado_em: agora };
  if (colecao === 'observacoes_turno') delete completos.criado_em;
  await comoAdmin((a) => setDoc(doc(a, colecao, docId), completos));
  return docId;
}

describe('quem vê o quê', () => {
  beforeEach(async () => {
    await semear('respostas', resposta('cozinha', 'coz-08'));
    await semear('respostas', resposta('garcons', 'gar-08'));
  });
  const idCoz = id(hoje, 'cozinha', 'almoco', 'coz-08');
  const idGar = id(hoje, 'garcons', 'almoco', 'gar-08');

  it('setor lê a própria resposta', () => assertSucceeds(getDoc(doc(db('cozinha'), 'respostas', idCoz))));
  it('setor NÃO lê resposta de outro setor', () => assertFails(getDoc(doc(db('cozinha'), 'respostas', idGar))));
  it('chefe lê de todos os setores', async () => {
    await assertSucceeds(getDoc(doc(db('chefe'), 'respostas', idCoz)));
    await assertSucceeds(getDoc(doc(db('chefe'), 'respostas', idGar)));
  });
  it('conta fora do sistema e visitante não leem nada', async () => {
    await assertFails(getDoc(doc(intruso(), 'respostas', idCoz)));
    await assertFails(getDoc(doc(anonimo(), 'respostas', idCoz)));
    await assertFails(getDocs(collection(intruso(), 'funcionarios')));
  });
  it('setor consulta só filtrando pelo próprio setor', async () => {
    const r = collection(db('cozinha'), 'respostas');
    await assertSucceeds(getDocs(query(r, where('setor', '==', 'cozinha'), where('data', '==', hoje))));
    await assertFails(getDocs(query(r, where('setor', '==', 'garcons'))));
    await assertFails(getDocs(r));
  });
  it('coleção fora da lista é negada até para o chefe', () =>
    assertFails(setDoc(doc(db('chefe'), 'outra/x'), { a: 1 })));
});

describe('respostas: gravar', () => {
  it('todo item de todo setor aceita "Não" com a data de hoje', async () => {
    for (const setor of Object.keys(SETORES)) {
      for (const item of itensDoSetor(setor)) {
        const r = resposta(setor, item.id);
        await assertSucceeds(setDoc(refResposta(db(setor), r), r));
      }
    }
  });
  it('turno da noite também vale', async () => {
    const r = resposta('conveniencia', 'conv-04', { turno: 'noite', resposta: 'sim' });
    await assertSucceeds(setDoc(refResposta(db('conveniencia'), r), r));
  });
  it('"Sim" em item sem (FOTO) não exige foto', async () => {
    const r = resposta('cozinha', 'coz-08', { resposta: 'sim' });
    await assertSucceeds(setDoc(refResposta(db('cozinha'), r), r));
  });
  it('"Sim" em item com (FOTO) SEM foto é recusado', async () => {
    const r = resposta('cozinha', 'coz-01', { resposta: 'sim' });
    await assertFails(setDoc(refResposta(db('cozinha'), r), r));
  });
  it('"Sim" dizendo que tem foto, mas sem gravar a foto, é recusado', async () => {
    const r = resposta('cozinha', 'coz-01', { resposta: 'sim', tem_foto: true });
    await assertFails(setDoc(refResposta(db('cozinha'), r), r));
  });
  it('"Sim" com a foto no mesmo lote é aceito (também na Limpeza)', async () => {
    await assertSucceeds(simComFoto(db('cozinha'), 'cozinha', 'coz-01'));
    await assertSucceeds(simComFoto(db('limpeza'), 'limpeza', 'limp-acougue'));
  });

  it.each([
    ['item que não existe (coz-20)', 'cozinha', { item: 'coz-20' }],
    ['item de outro setor', 'cozinha', { item: 'gar-01' }],
    ['garçons gar-23', 'garcons', { item: 'gar-23' }],
    ['conveniência conv-13', 'conveniencia', { item: 'conv-13' }],
    ['atividade inventada', 'limpeza', { item: 'limp-piscina' }],
    ['limpeza com turno almoço', 'limpeza', { turno: 'almoco' }],
    ['cozinha com turno "dia"', 'cozinha', { turno: 'dia' }],
    ['data de ontem', 'cozinha', { data: somarDias(hoje, -1) }],
    ['data de amanhã', 'cozinha', { data: somarDias(hoje, 1) }],
    ['resposta "talvez"', 'cozinha', { resposta: 'talvez' }],
    ['observação longa demais', 'cozinha', { observacao: 'x'.repeat(501) }],
    ['funcionário de outro setor', 'cozinha', { funcionario_id: 'f-gar', funcionario: 'Bruno' }],
    ['funcionário inativo', 'cozinha', { funcionario_id: 'f-coz-inativo', funcionario: 'Edu' }],
    ['nome diferente do cadastro', 'cozinha', { funcionario: 'Outra Pessoa' }],
    ['funcionário inexistente', 'cozinha', { funcionario_id: 'f-nao-existe' }],
    ['criado_em do celular', 'cozinha', { criado_em: Timestamp.fromDate(new Date('2020-01-01')) }],
    ['campo extra', 'cozinha', { nota: 10 }],
  ])('recusa: %s', async (_, setor, mudanca) => {
    const r = resposta(setor, 'coz-08', mudanca);
    if (setor !== 'cozinha' && !mudanca.item) r.item = itensDoSetor(setor).find((i) => !i.foto)?.id ?? 'limp-geral';
    await assertFails(setDoc(refResposta(db(setor), r), r));
  });

  it('recusa ID que não bate com os campos', async () => {
    const r = resposta('cozinha', 'coz-08');
    await assertFails(setDoc(doc(db('cozinha'), 'respostas', id(hoje, 'cozinha', 'almoco', 'coz-09')), r));
  });
  it('setor NÃO grava em nome de outro setor', async () => {
    const r = resposta('cozinha', 'coz-08');
    await assertFails(setDoc(refResposta(db('garcons'), r), r));
  });
  it('chefe NÃO preenche checklist', async () => {
    const r = resposta('cozinha', 'coz-08');
    await assertFails(setDoc(refResposta(db('chefe'), r), r));
  });
});

describe('respostas: alterar e apagar', () => {
  it('troca a resposta de hoje e não muda criado_em', async () => {
    await semear('respostas', resposta('cozinha', 'coz-08'));
    const ref = doc(db('cozinha'), 'respostas', id(hoje, 'cozinha', 'almoco', 'coz-08'));
    await assertSucceeds(updateDoc(ref, { resposta: 'sim', atualizado_em: serverTimestamp() }));
    await assertFails(updateDoc(ref, { item: 'coz-09', atualizado_em: serverTimestamp() }));
    await assertFails(updateDoc(ref, { criado_em: serverTimestamp(), atualizado_em: serverTimestamp() }));
  });
  it('NÃO altera resposta de ontem', async () => {
    const ontem = await semear('respostas', resposta('cozinha', 'coz-08', { data: somarDias(hoje, -1) }));
    await assertFails(updateDoc(doc(db('cozinha'), 'respostas', ontem), { resposta: 'sim', atualizado_em: serverTimestamp() }));
  });
  it('apaga só resposta vencida (30 dias contando hoje)', async () => {
    const dia29 = await semear('respostas', resposta('cozinha', 'coz-08', { data: somarDias(hoje, -29) }));
    const dia30 = await semear('respostas', resposta('cozinha', 'coz-09', { data: somarDias(hoje, -30) }));
    await assertFails(deleteDoc(doc(db('cozinha'), 'respostas', dia29)));
    await assertSucceeds(deleteDoc(doc(db('cozinha'), 'respostas', dia30)));
  });
  it('chefe apaga resposta vencida de qualquer setor; outro setor não', async () => {
    const velha = await semear('respostas', resposta('garcons', 'gar-08', { data: somarDias(hoje, -40) }));
    await assertFails(deleteDoc(doc(db('cozinha'), 'respostas', velha)));
    await assertSucceeds(deleteDoc(doc(db('chefe'), 'respostas', velha)));
  });
  it('NÃO apaga resposta de hoje', async () => {
    const atual = await semear('respostas', resposta('cozinha', 'coz-08'));
    await assertFails(deleteDoc(doc(db('cozinha'), 'respostas', atual)));
    await assertFails(deleteDoc(doc(db('chefe'), 'respostas', atual)));
  });
});

describe('fotos', () => {
  const grava = (quem, f) => setDoc(refFoto(db(quem), f), f);
  it('aceita JPEG de hoje do próprio setor', () => assertSucceeds(grava('cozinha', foto('cozinha', 'coz-01'))));
  it('aceita foto grande (~700 KB de texto)', () =>
    assertSucceeds(grava('cozinha', foto('cozinha', 'coz-01', { imagem: 'data:image/jpeg;base64,' + 'A'.repeat(700000) }))));
  it.each([
    ['maior que o limite', { imagem: 'data:image/jpeg;base64,' + 'A'.repeat(950000) }],
    ['PNG', { imagem: 'data:image/png;base64,AAAA' }],
    ['texto que não é imagem', { imagem: 'data:image/jpeg;base64,<script>' }],
    ['data de ontem', { data: somarDias(hoje, -1) }],
    ['item inválido', { item: 'coz-99' }],
  ])('recusa foto: %s', (_, mudanca) => assertFails(grava('cozinha', foto('cozinha', 'coz-01', mudanca))));
  it('NÃO grava foto em outro setor', () => assertFails(grava('garcons', foto('cozinha', 'coz-01'))));
  it('outro setor NÃO vê a foto; o chefe vê', async () => {
    const fid = await semear('fotos', foto('cozinha', 'coz-01'));
    await assertFails(getDoc(doc(db('garcons'), 'fotos', fid)));
    await assertSucceeds(getDoc(doc(db('chefe'), 'fotos', fid)));
  });
  it('setor apaga a própria foto de hoje (troca) e as vencidas, não as de 3 dias atrás', async () => {
    const deHoje = await semear('fotos', foto('cozinha', 'coz-01'));
    const de3 = await semear('fotos', foto('cozinha', 'coz-02', { data: somarDias(hoje, -3) }));
    const de7 = await semear('fotos', foto('cozinha', 'coz-03', { data: somarDias(hoje, -7) }));
    await assertSucceeds(deleteDoc(doc(db('cozinha'), 'fotos', deHoje)));
    await assertFails(deleteDoc(doc(db('cozinha'), 'fotos', de3)));
    await assertSucceeds(deleteDoc(doc(db('cozinha'), 'fotos', de7)));
  });
  it('fotos: 6 dias atrás ainda fica (7 dias contando hoje)', async () => {
    const de6 = await semear('fotos', foto('cozinha', 'coz-01', { data: somarDias(hoje, -6) }));
    await assertFails(deleteDoc(doc(db('chefe'), 'fotos', de6)));
  });
  it('chefe apaga foto vencida, não a de hoje', async () => {
    const deHoje = await semear('fotos', foto('cozinha', 'coz-01'));
    const velha = await semear('fotos', foto('cozinha', 'coz-02', { data: somarDias(hoje, -8) }));
    await assertFails(deleteDoc(doc(db('chefe'), 'fotos', deHoje)));
    await assertSucceeds(deleteDoc(doc(db('chefe'), 'fotos', velha)));
  });
});

describe('observações do turno', () => {
  const obs = (extra = {}) => ({
    data: hoje, setor: 'cozinha', turno: 'noite', texto: 'Faltou gás', funcionario: 'Ana', atualizado_em: serverTimestamp(), ...extra,
  });
  const ref = (banco, o) => doc(banco, 'observacoes_turno', `${o.data}_${o.setor}_${o.turno}`);
  it('setor grava a do próprio turno de hoje', () => assertSucceeds(setDoc(ref(db('cozinha'), obs()), obs())));
  it('recusa outro setor, ontem e texto longo', async () => {
    await assertFails(setDoc(ref(db('garcons'), obs()), obs()));
    const ontem = obs({ data: somarDias(hoje, -1) });
    await assertFails(setDoc(ref(db('cozinha'), ontem), ontem));
    const longa = obs({ texto: 'x'.repeat(2001) });
    await assertFails(setDoc(ref(db('cozinha'), longa), longa));
  });
});

describe('funcionários', () => {
  it('chefe cadastra, renomeia e desativa', async () => {
    const ref = doc(db('chefe'), 'funcionarios', 'novo');
    await assertSucceeds(setDoc(ref, { setor: 'limpeza', nome: 'Fátima', ativo: true }));
    await assertSucceeds(updateDoc(ref, { nome: 'Fátima S.', ativo: false }));
  });
  it('recusa setor inválido e nome vazio', async () => {
    await assertFails(setDoc(doc(db('chefe'), 'funcionarios', 'x'), { setor: 'bar', nome: 'X', ativo: true }));
    await assertFails(setDoc(doc(db('chefe'), 'funcionarios', 'x'), { setor: 'limpeza', nome: '', ativo: true }));
  });
  it('setor NÃO cadastra funcionário', () =>
    assertFails(setDoc(doc(db('cozinha'), 'funcionarios', 'x'), { setor: 'cozinha', nome: 'X', ativo: true })));
  it('setor lê só os funcionários do próprio setor', async () => {
    const f = collection(db('cozinha'), 'funcionarios');
    await assertSucceeds(getDocs(query(f, where('setor', '==', 'cozinha'))));
    await assertFails(getDocs(query(f, where('setor', '==', 'garcons'))));
    await assertFails(getDoc(doc(db('cozinha'), 'funcionarios', 'f-gar')));
  });
});
