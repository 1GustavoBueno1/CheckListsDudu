// Confere que os itens do app são exatamente os dos PDFs (contagens e fotos).
import { describe, it, expect } from 'vitest';
import { SETORES, TURNOS, itensDoSetor, LIMPEZA_GERAL, LIMPEZA_DIARIA, ATIVIDADES_LIMPEZA } from '../src/itens.js';

const contar = (setor) => {
  const itens = itensDoSetor(setor);
  return { total: itens.length, fotos: itens.filter((i) => i.foto).length };
};

describe('itens dos PDFs', () => {
  it('Cozinha: 19 itens dos PDFs + 5 acrescentados (24, 21 com foto), turnos Almoço e Noite', () => {
    expect(contar('cozinha')).toEqual({ total: 24, fotos: 21 });
    expect(itensDoSetor('cozinha').slice(19).map((i) => [i.id, i.texto, i.foto])).toEqual([
      ['coz-20', 'A bacia de espátulas, pegadores e colheres está organizada e limpa?', true],
      ['coz-21', 'O processador está limpo e brilhando?', true],
      ['coz-22', 'A batedeira está limpa e brilhando?', true],
      ['coz-23', 'A bancada de lanches está limpa e brilhando?', true],
      ['coz-24', 'Os alimentos estão guardados com identificação?', true],
    ]);
    expect(SETORES.cozinha.turnos).toEqual(['almoco', 'noite']);
  });
  it('Garçons: 22 itens dos PDFs + 4 acrescentados em 4 seções (26, 18 com foto)', () => {
    expect(contar('garcons')).toEqual({ total: 26, fotos: 18 });
    expect(SETORES.garcons.secoes.map((s) => [s.titulo, s.itens.length])).toEqual([
      ['1. Antes de abrir o restaurante', 10],
      ['2. Durante o atendimento', 9],
      ['3. Organização de bebidas e materiais', 6],
      ['4. Fechamento', 1],
    ]);
    const novos = ['gar-23', 'gar-24', 'gar-25', 'gar-26'];
    expect(itensDoSetor('garcons').filter((i) => novos.includes(i.id)).map((i) => [i.id, i.texto, i.foto])).toEqual([
      ['gar-23', 'O painel de LED está ligado, com som ambiente?', true],
      ['gar-24', 'A porta lateral está aberta?', true],
      ['gar-25', 'As mesas externas e as cadeiras estão limpas?', true],
      ['gar-26', 'Os lixos do exterior e do interior foram recolhidos?', true],
    ]);
    expect(SETORES.garcons.secoes[0].itens.slice(-3).map((i) => i.id)).toEqual(['gar-23', 'gar-24', 'gar-25']);
  });
  it('Churrasco: 3 itens, todos com foto, turnos Almoço e Noite', () => {
    expect(contar('churrasco')).toEqual({ total: 3, fotos: 3 });
    expect(SETORES.churrasco.turnos).toEqual(['almoco', 'noite']);
    expect(itensDoSetor('churrasco').map((i) => [i.id, i.texto])).toEqual([
      ['chur-01', 'A churrasqueira está limpa?'],
      ['chur-02', 'A câmara fria está limpa e organizada?'],
      ['chur-03', 'Os balcões de inox e mármore estão limpos?'],
    ]);
  });
  it('Conveniência: 12 itens, 9 com foto', () => expect(contar('conveniencia')).toEqual({ total: 12, fotos: 9 }));
  it('Limpeza: 2 itens diários (geral e máquina de lavar) + 7 atividades, todas com foto, sem turno', () => {
    expect(contar('limpeza')).toEqual({ total: 9, fotos: 9 });
    expect(LIMPEZA_DIARIA.map((i) => [i.id, i.foto])).toEqual([['limp-geral', true], ['limp-maquina', true]]);
    expect(LIMPEZA_DIARIA[1].texto).toBe('A máquina de lavar está limpa e brilhando?');
    expect(SETORES.limpeza.turnos).toEqual(['dia']);
    expect(LIMPEZA_GERAL.foto).toBe(true);
    expect(ATIVIDADES_LIMPEZA.map((a) => a.diaSemana).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('textos conferem com o PDF (amostra)', () => {
    expect(itensDoSetor('cozinha')[7]).toMatchObject({ texto: 'A revisão no buffet está sendo feita a cada 15 min?', foto: false });
    expect(itensDoSetor('conveniencia')[3].texto).toBe('As máquinas de cartão estão carregadas?');
    expect(ATIVIDADES_LIMPEZA.find((a) => a.diaSemana === 2).texto).toBe('Câmaras frias do açougue');
  });
  it('IDs de item são únicos, curtos e só com letras, números e hífen', () => {
    for (const setor of Object.keys(SETORES)) {
      const ids = itensDoSetor(setor).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{2,30}$/);
    }
  });
  it('todo turno usado existe em TURNOS', () => {
    for (const s of Object.values(SETORES)) for (const t of s.turnos) expect(TURNOS[t]).toBeTruthy();
  });
});
