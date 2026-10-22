import { describe, it, expect } from 'vitest';
import {
  diaSP,
  dataValida,
  somarDias,
  diaDaSemana,
  idResposta,
  validarResposta,
  progresso,
  atividadeDoDia,
  semanaDe,
  alertasLimpeza,
  expirado,
  PRAZO_FOTOS_DIAS,
  PRAZO_RESPOSTAS_DIAS,
} from '../src/regras.js';

describe('datas (fuso de São Paulo)', () => {
  it('23:30 em SP ainda é o mesmo dia', () => expect(diaSP(new Date('2026-10-22T02:30:00Z'))).toBe('2026-10-21'));
  it('00:30 em SP já é o dia seguinte', () => expect(diaSP(new Date('2026-10-22T03:30:00Z'))).toBe('2026-10-22'));
  it('dataValida recusa 30/02 e formatos errados', () => {
    expect(dataValida('2028-02-29')).toBe(true);
    for (const d of ['2026-02-30', '21/10/2026', '', null]) expect(dataValida(d)).toBe(false);
  });
  it('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-10-21', -7)).toBe('2026-10-14');
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29');
  });
  it('diaDaSemana: 0 = domingo', () => {
    expect(diaDaSemana('2026-10-18')).toBe(0);
    expect(diaDaSemana('2026-10-21')).toBe(3);
  });
});

describe('idResposta', () => {
  it('monta data_setor_turno_item', () =>
    expect(idResposta('2026-10-21', 'cozinha', 'almoco', 'coz-01')).toBe('2026-10-21_cozinha_almoco_coz-01'));
  it('Limpeza usa o turno "dia"', () =>
    expect(idResposta('2026-10-21', 'limpeza', 'dia', 'limp-geral')).toBe('2026-10-21_limpeza_dia_limp-geral'));
  it.each([
    ['2026-02-30', 'cozinha', 'almoco', 'coz-01', 'Data'],
    ['2026-10-21', 'bar', 'almoco', 'coz-01', 'Setor'],
    ['2026-10-21', 'cozinha', 'dia', 'coz-01', 'Turno'],
    ['2026-10-21', 'limpeza', 'almoco', 'limp-geral', 'Turno'],
    ['2026-10-21', 'cozinha', 'almoco', 'gar-01', 'Item'],
  ])('recusa %s %s %s %s', (d, s, t, i, campo) => expect(() => idResposta(d, s, t, i)).toThrow(new RegExp(`^${campo}:`)));
});

describe('validarResposta', () => {
  it('item com foto: "Sim" sem foto é recusado', () =>
    expect(() => validarResposta('cozinha', 'coz-01', 'sim', false)).toThrow('Foto: tire a foto para marcar "Sim" neste item.'));
  it('item com foto: "Sim" com foto passa', () => expect(validarResposta('cozinha', 'coz-01', 'sim', true)).toBe('sim'));
  it('item com foto: "Não" sem foto passa', () => expect(validarResposta('cozinha', 'coz-01', 'nao', false)).toBe('nao'));
  it('item sem foto: "Sim" sem foto passa', () => expect(validarResposta('cozinha', 'coz-08', 'sim', false)).toBe('sim'));
  it('resposta só pode ser sim ou nao', () =>
    expect(() => validarResposta('cozinha', 'coz-08', 'talvez', false)).toThrow('Resposta: escolha Sim ou Não.'));
});

describe('progresso de um turno', () => {
  it('conta respondidos, sim e não', () => {
    const respostas = new Map([
      ['coz-01', { resposta: 'sim' }],
      ['coz-02', { resposta: 'nao' }],
      ['coz-08', { resposta: 'sim' }],
    ]);
    expect(progresso('cozinha', respostas)).toEqual({ total: 24, respondidos: 3, sim: 2, nao: 1 });
  });
  it('ignora respostas de itens que não existem no setor', () =>
    expect(progresso('conveniencia', new Map([['coz-01', { resposta: 'sim' }]])).respondidos).toBe(0));
});

describe('Limpeza: cronograma e avisos', () => {
  it('atividade do dia segue o PDF', () => {
    expect(atividadeDoDia('2026-10-19').texto).toBe('Faxina nos banheiros'); // segunda
    expect(atividadeDoDia('2026-10-24').texto).toBe('Açougue e churrasqueira'); // sábado
    expect(atividadeDoDia('2026-10-25').texto).toBe('Revisão da limpeza e organização'); // domingo
  });
  it('semana vai de segunda a domingo', () => {
    expect(semanaDe('2026-10-21')).toEqual({ inicio: '2026-10-19', fim: '2026-10-25' });
    expect(semanaDe('2026-10-25')).toEqual({ inicio: '2026-10-19', fim: '2026-10-25' });
    expect(semanaDe('2026-10-19')).toEqual({ inicio: '2026-10-19', fim: '2026-10-25' });
  });
  it('açougue: 7 dias ainda ok, 8 dias avisa', () => {
    expect(alertasLimpeza('2026-10-21', { acougue: '2026-10-14', camaras: '2026-10-21' })).toEqual([]);
    expect(alertasLimpeza('2026-10-22', { acougue: '2026-10-14', camaras: '2026-10-21' })).toEqual([
      { atividade: 'limp-acougue', dias: 8, mensagem: 'Açougue e churrasqueira: última lavagem há 8 dias (o mínimo é 1 vez por semana).' },
    ]);
  });
  it('câmaras frias: 15 dias ok, 16 avisa', () => {
    expect(alertasLimpeza('2026-10-21', { acougue: '2026-10-21', camaras: '2026-10-06' })).toEqual([]);
    expect(alertasLimpeza('2026-10-22', { acougue: '2026-10-21', camaras: '2026-10-06' })[0]).toMatchObject({
      atividade: 'limp-camaras',
      dias: 16,
    });
  });
  it('sem nenhum registro, avisa sem inventar número de dias', () => {
    const avisos = alertasLimpeza('2026-10-21', { acougue: null, camaras: null });
    expect(avisos.map((a) => [a.atividade, a.dias])).toEqual([
      ['limp-acougue', null],
      ['limp-camaras', null],
    ]);
    expect(avisos[0].mensagem).toBe('Açougue e churrasqueira: nenhuma lavagem registrada nos últimos 30 dias.');
  });
});

describe('prazos de guarda', () => {
  it('fotos 7 dias, respostas 30 dias', () => expect([PRAZO_FOTOS_DIAS, PRAZO_RESPOSTAS_DIAS]).toEqual([7, 30]));
  it('7 dias contando hoje: 15 a 21 ficam, 14 sai', () => {
    expect(expirado('2026-10-15', '2026-10-21', 7)).toBe(false);
    expect(expirado('2026-10-14', '2026-10-21', 7)).toBe(true);
    expect(expirado('2026-10-21', '2026-10-21', 7)).toBe(false);
  });
});

describe('turno padrão e formatação', () => {
  it('antes das 16h em SP sugere Almoço; depois, Noite', async () => {
    const { turnoPadrao } = await import('../src/regras.js');
    expect(turnoPadrao(new Date('2026-10-21T18:59:00Z'))).toBe('almoco'); // 15:59 em SP
    expect(turnoPadrao(new Date('2026-10-21T19:00:00Z'))).toBe('noite'); // 16:00 em SP
    expect(turnoPadrao(new Date('2026-10-22T02:30:00Z'))).toBe('noite'); // 23:30 em SP
  });
  it('datas e horas para a tela', async () => {
    const { formatarData, horaSP, nomeDoDia } = await import('../src/regras.js');
    expect(formatarData('2026-10-21')).toBe('21/10/2026');
    expect(horaSP(new Date('2026-10-21T17:05:00Z'))).toBe('14:05');
    expect(nomeDoDia('2026-10-21')).toBe('quarta-feira');
  });
});

describe('Limpeza: resumo da semana e últimas datas', () => {
  const r = (data, item, resposta = 'sim') => ({ data, item, resposta });
  it('diasDaSemana lista segunda a domingo', async () => {
    const { diasDaSemana } = await import('../src/regras.js');
    expect(diasDaSemana('2026-10-22')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  });
  it('resumoSemana: quais atividades foram feitas, em que dias, e a limpeza geral', async () => {
    const { resumoSemana } = await import('../src/regras.js');
    const resumo = resumoSemana('2026-10-22', [
      r('2026-10-19', 'limp-banheiros'),
      r('2026-10-20', 'limp-banheiros'),
      r('2026-10-21', 'limp-vidros'),
      r('2026-10-21', 'limp-depositos', 'nao'), // "Não" não conta como feita
      r('2026-10-19', 'limp-geral'),
      r('2026-10-22', 'limp-geral'),
      r('2026-10-22', 'limp-geral'), // repetida não conta duas vezes
    ]);
    const porId = Object.fromEntries(resumo.atividades.map((a) => [a.id, a]));
    expect(porId['limp-banheiros']).toMatchObject({ prevista: '2026-10-19', feitaEm: ['2026-10-19', '2026-10-20'] });
    expect(porId['limp-vidros'].feitaEm).toEqual(['2026-10-21']);
    expect(porId['limp-depositos'].feitaEm).toEqual([]);
    expect(porId['limp-revisao'].prevista).toBe('2026-10-25'); // domingo fecha a semana
    expect(resumo.atividades.map((a) => a.id)).toEqual([
      'limp-banheiros', 'limp-camaras', 'limp-vidros', 'limp-depositos', 'limp-externa', 'limp-acougue', 'limp-revisao',
    ]);
    expect(resumo.geral).toEqual({ feitos: 2, dias: ['2026-10-19', '2026-10-22'] });
    expect(resumo.feitas).toBe(2);
  });
  it('ultimasDatas: data mais recente com "Sim" do açougue e das câmaras', async () => {
    const { ultimasDatas } = await import('../src/regras.js');
    expect(
      ultimasDatas([
        r('2026-10-10', 'limp-acougue'),
        r('2026-10-17', 'limp-acougue'),
        r('2026-10-18', 'limp-acougue', 'nao'),
        r('2026-10-06', 'limp-camaras'),
      ]),
    ).toEqual({ acougue: '2026-10-17', camaras: '2026-10-06' });
    expect(ultimasDatas([])).toEqual({ acougue: null, camaras: null });
  });
});

describe('painel do chefe: resumo de um turno', () => {
  const resp = (item, resposta, extra = {}) => [item, { id: `x_${item}`, item, resposta, funcionario: 'Ana', observacao: '', tem_foto: false, ...extra }];
  it('progresso, itens "Não", pendentes, nomes e fotos', async () => {
    const { resumoTurno } = await import('../src/regras.js');
    const r = resumoTurno(
      'conveniencia',
      new Map([
        resp('conv-01', 'sim', { tem_foto: true }),
        resp('conv-04', 'nao', { observacao: 'Máquina 2 sem bateria', funcionario: 'Paulo' }),
        resp('conv-05', 'sim'),
      ]),
    );
    expect(r.progresso).toEqual({ total: 12, respondidos: 3, sim: 2, nao: 1 });
    expect(r.naos).toEqual([
      { item: 'conv-04', texto: 'As máquinas de cartão estão carregadas?', observacao: 'Máquina 2 sem bateria', funcionario: 'Paulo' },
    ]);
    expect(r.pendentes).toHaveLength(9);
    expect(r.pendentes[0]).toEqual({ item: 'conv-02', texto: 'O balcão do caixa está organizado?' });
    expect(r.nomes).toEqual(['Ana', 'Paulo']);
    expect(r.fotos).toEqual([{ id: 'x_conv-01', item: 'conv-01', texto: 'As prateleiras estão repostas?', funcionario: 'Ana' }]);
  });
  it('turno vazio: tudo pendente', async () => {
    const { resumoTurno } = await import('../src/regras.js');
    const r = resumoTurno('cozinha', new Map());
    expect([r.progresso.respondidos, r.pendentes.length, r.nomes, r.fotos]).toEqual([0, 24, [], []]);
  });
  it('Limpeza: "pendente" só os itens diários e a atividade do dia, não as 7', async () => {
    const { resumoTurno } = await import('../src/regras.js');
    const r = resumoTurno('limpeza', new Map(), '2026-10-22'); // quinta: depósitos
    expect(r.pendentes.map((p) => p.item)).toEqual(['limp-geral', 'limp-maquina', 'limp-depositos']);
    expect(r.progresso.total).toBe(3);
  });
});
