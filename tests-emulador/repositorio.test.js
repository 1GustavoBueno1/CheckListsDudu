// Camada de dados contra o emulador, com as regras reais ligadas.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { criarRepositorio } from '../src/repositorio.js';
import { diaSP, somarDias } from '../src/regras.js';

const UID = {
  cozinha: 'ScjaryIu84Y5IzTqSC9trkmGhsI2',
  garcons: 'NVErpPpmVHdlzlXwfTZfZFEmSMy1',
  chefe: 'ydNKFosdWkMMaVIxs1WuxwJdIwy2',
};
const JPEG = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
let env;
const banco = (quem) => env.authenticatedContext(UID[quem]).firestore();
const repo = (quem) => criarRepositorio(banco(quem));
const hoje = diaSP();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checklists',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

async function ana() {
  return repo('chefe').salvarFuncionario({ setor: 'cozinha', nome: '  Ana   Souza ' });
}

describe('funcionários', () => {
  it('chefe cadastra (nome limpo) e o setor vê só os seus ativos', async () => {
    const a = await ana();
    expect(a.nome).toBe('Ana Souza');
    await repo('chefe').salvarFuncionario({ setor: 'garcons', nome: 'Bruno' });
    await repo('chefe').salvarFuncionario({ setor: 'cozinha', nome: 'Edu', ativo: false });
    expect((await repo('cozinha').funcionariosDoSetor('cozinha')).map((f) => f.nome)).toEqual(['Ana Souza']);
    expect((await repo('chefe').todosFuncionarios()).map((f) => f.nome)).toEqual(['Ana Souza', 'Bruno', 'Edu']);
  });
  it('recusa nome repetido no mesmo setor, mas aceita em outro setor', async () => {
    await ana();
    await expect(repo('chefe').salvarFuncionario({ setor: 'cozinha', nome: 'ana souza' })).rejects.toThrow(
      'Nome: já existe "Ana Souza" em Cozinha.',
    );
    await expect(repo('chefe').salvarFuncionario({ setor: 'garcons', nome: 'Ana Souza' })).resolves.toBeTruthy();
  });
  it('recusa nome vazio e setor inválido', async () => {
    await expect(repo('chefe').salvarFuncionario({ setor: 'cozinha', nome: '   ' })).rejects.toThrow('Nome: informe o nome.');
    await expect(repo('chefe').salvarFuncionario({ setor: 'bar', nome: 'X' })).rejects.toThrow('Setor: escolha um setor da lista.');
  });
  it('setor não consegue cadastrar (as regras recusam)', async () => {
    await expect(repo('cozinha').salvarFuncionario({ setor: 'cozinha', nome: 'X' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('respostas', () => {
  const base = (f, extra = {}) => ({ setor: 'cozinha', data: hoje, turno: 'almoco', funcionario: f, ...extra });

  it('grava "Não", troca para "Sim" (item sem foto) e lê de volta', async () => {
    const f = await ana();
    const r = repo('cozinha');
    const primeira = await r.salvarResposta(base(f, { item: 'coz-08', resposta: 'nao', observacao: ' ninguém revisou ' }));
    expect(primeira).toMatchObject({ resposta: 'nao', observacao: 'ninguém revisou', funcionario: 'Ana Souza' });
    const mapa = await r.respostasDoTurno('cozinha', hoje, 'almoco');
    await r.salvarResposta(base(f, { item: 'coz-08', resposta: 'sim', existente: mapa.get('coz-08') }));
    const depois = await r.respostasDoTurno('cozinha', hoje, 'almoco');
    expect(depois.get('coz-08')).toMatchObject({ resposta: 'sim', observacao: '' });
    expect(depois.get('coz-08').criado_em.toMillis()).toBe(primeira.criado_em.toMillis());
  });
  it('"Sim" em item com foto sem foto: o app recusa antes de tentar', async () => {
    const f = await ana();
    await expect(repo('cozinha').salvarResposta(base(f, { item: 'coz-01', resposta: 'sim' }))).rejects.toThrow(
      'Foto: tire a foto para marcar "Sim" neste item.',
    );
  });
  it('"Sim" com foto grava as duas coisas', async () => {
    const f = await ana();
    const salvo = await repo('cozinha').salvarResposta(base(f, { item: 'coz-01', resposta: 'sim', imagem: JPEG }));
    expect(salvo.tem_foto).toBe(true);
    const foto = await getDoc(doc(banco('chefe'), 'fotos', salvo.id));
    expect(foto.data().imagem).toBe(JPEG);
  });
  it('troca a foto mantendo o "Sim" e lê a foto só quando pedida', async () => {
    const f = await ana();
    const r = repo('cozinha');
    const primeira = await r.salvarResposta(base(f, { item: 'coz-02', resposta: 'sim', imagem: JPEG }));
    const nova = 'data:image/jpeg;base64,' + 'B'.repeat(3000);
    const mapa = await r.respostasDoTurno('cozinha', hoje, 'almoco');
    await r.salvarResposta(base(f, { item: 'coz-02', resposta: 'sim', imagem: nova, existente: mapa.get('coz-02') }));
    expect(await r.fotoDe(primeira.id)).toBe(nova);
    expect(await repo('chefe').fotoDe(primeira.id)).toBe(nova);
    expect(await r.fotoDe(`${hoje}_cozinha_almoco_coz-03`)).toBeNull();
    await expect(repo('garcons').fotoDe(primeira.id)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('"Sim" em item com foto que já tem foto não exige foto nova', async () => {
    const f = await ana();
    const r = repo('cozinha');
    await r.salvarResposta(base(f, { item: 'coz-03', resposta: 'sim', imagem: JPEG }));
    let mapa = await r.respostasDoTurno('cozinha', hoje, 'almoco');
    await r.salvarResposta(base(f, { item: 'coz-03', resposta: 'nao', existente: mapa.get('coz-03') }));
    mapa = await r.respostasDoTurno('cozinha', hoje, 'almoco');
    await expect(r.salvarResposta(base(f, { item: 'coz-03', resposta: 'sim', existente: mapa.get('coz-03') }))).resolves.toMatchObject({ resposta: 'sim', tem_foto: true });
  });
  it('turnos são separados', async () => {
    const f = await ana();
    await repo('cozinha').salvarResposta(base(f, { item: 'coz-08', resposta: 'nao' }));
    expect((await repo('cozinha').respostasDoTurno('cozinha', hoje, 'noite')).size).toBe(0);
  });
  it('exige o nome de quem preenche', async () => {
    await expect(repo('cozinha').salvarResposta(base(null, { item: 'coz-08', resposta: 'nao' }))).rejects.toThrow(
      'Quem está preenchendo: escolha o seu nome.',
    );
  });
  it('avisa quando o dia mudou desde que a tela abriu', async () => {
    const f = await ana();
    await expect(repo('cozinha').salvarResposta(base(f, { data: somarDias(hoje, -1), item: 'coz-08', resposta: 'nao' }))).rejects.toThrow(
      /o dia mudou/,
    );
  });
  it('chefe lê as respostas do setor; outro setor não', async () => {
    const f = await ana();
    await repo('cozinha').salvarResposta(base(f, { item: 'coz-08', resposta: 'nao' }));
    expect((await repo('chefe').respostasDoTurno('cozinha', hoje, 'almoco')).size).toBe(1);
    await expect(repo('garcons').respostasDoTurno('cozinha', hoje, 'almoco')).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('observações do turno', () => {
  it('grava e lê', async () => {
    const f = await ana();
    await repo('cozinha').salvarObservacaoDoTurno({ setor: 'cozinha', data: hoje, turno: 'noite', texto: ' Faltou gás ', funcionario: f });
    expect(await repo('cozinha').observacaoDoTurno('cozinha', hoje, 'noite')).toMatchObject({ texto: 'Faltou gás', funcionario: 'Ana Souza' });
    expect(await repo('cozinha').observacaoDoTurno('cozinha', hoje, 'almoco')).toBeNull();
  });
});
