// Consultas da Limpeza (semana e avisos) no emulador, com as regras reais.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { criarRepositorio } from '../src/repositorio.js';
import { diaSP, somarDias, diasDaSemana, resumoSemana, ultimasDatas, alertasLimpeza } from '../src/regras.js';

const UID = { limpeza: '8r2CdyO1AOTmvEVRpEE4PABPf882', chefe: 'EfC9RQNucAVR2BJn0Gx0iAqbSQb2', cozinha: 'ScjaryIu84Y5IzTqSC9trkmGhsI2' };
let env;
const repo = (quem) => criarRepositorio(env.authenticatedContext(UID[quem]).firestore());
const hoje = diaSP();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checklists',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

async function semear(data, item, resposta = 'sim', setor = 'limpeza') {
  const turno = setor === 'limpeza' ? 'dia' : 'almoco';
  const agora = Timestamp.now();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'respostas', `${data}_${setor}_${turno}_${item}`), {
      data, setor, turno, item, resposta, observacao: '', funcionario_id: 'f', funcionario: 'Davi', tem_foto: true, criado_em: agora, atualizado_em: agora,
    }),
  );
}

beforeEach(async () => {
  await env.clearFirestore();
  const semana = diasDaSemana(hoje);
  await semear(semana[0], 'limp-geral');
  await semear(semana[0], 'limp-banheiros');
  await semear(somarDias(semana[0], -1), 'limp-vidros'); // domingo anterior: fora da semana
  await semear(somarDias(hoje, -9), 'limp-acougue');
  await semear(somarDias(hoje, -3), 'limp-acougue', 'nao');
  await semear(somarDias(hoje, -16), 'limp-camaras');
  await semear(hoje, 'coz-01', 'sim', 'cozinha'); // outro setor: nunca entra
});

describe('Limpeza', () => {
  it('semana: só as respostas da Limpeza dos 7 dias', async () => {
    const respostas = await repo('limpeza').respostasLimpezaNasDatas(diasDaSemana(hoje));
    const resumo = resumoSemana(hoje, respostas);
    expect(resumo.feitas).toBe(1);
    expect(resumo.atividades.find((a) => a.id === 'limp-banheiros').feitaEm).toEqual([diasDaSemana(hoje)[0]]);
    expect(resumo.geral.feitos).toBe(1);
  });
  it('avisos: açougue há 9 dias e câmaras há 16 dias (o "Não" não conta)', async () => {
    const registros = await repo('limpeza').registrosParaAvisos();
    const avisos = alertasLimpeza(hoje, ultimasDatas(registros));
    expect(avisos.map((a) => [a.atividade, a.dias])).toEqual([
      ['limp-acougue', 9],
      ['limp-camaras', 16],
    ]);
  });
  it('o chefe também consulta; a Cozinha não', async () => {
    await expect(repo('chefe').registrosParaAvisos()).resolves.toHaveLength(2);
    await expect(repo('cozinha').respostasLimpezaNasDatas(diasDaSemana(hoje))).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
