// Confere que os itens do app são exatamente os dos PDFs (contagens e fotos).
import { describe, it, expect } from 'vitest';
import { SETORES, TURNOS, itensDoSetor, LIMPEZA_GERAL, ATIVIDADES_LIMPEZA } from '../src/itens.js';

const contar = (setor) => {
  const itens = itensDoSetor(setor);
  return { total: itens.length, fotos: itens.filter((i) => i.foto).length };
};

describe('itens dos PDFs', () => {
  it('Cozinha: 19 itens, 16 com foto, turnos Almoço e Noite', () => {
    expect(contar('cozinha')).toEqual({ total: 19, fotos: 16 });
    expect(SETORES.cozinha.turnos).toEqual(['almoco', 'noite']);
  });
  it('Garçons: 22 itens em 3 seções, 14 com foto', () => {
    expect(contar('garcons')).toEqual({ total: 22, fotos: 14 });
    expect(SETORES.garcons.secoes.map((s) => [s.titulo, s.itens.length])).toEqual([
      ['1. Antes de abrir o restaurante', 7],
      ['2. Durante o atendimento', 9],
      ['3. Organização de bebidas e materiais', 6],
    ]);
  });
  it('Conveniência: 12 itens, 9 com foto', () => expect(contar('conveniencia')).toEqual({ total: 12, fotos: 9 }));
  it('Limpeza: geral + 7 atividades, todas com foto, sem turno', () => {
    expect(contar('limpeza')).toEqual({ total: 8, fotos: 8 });
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
