import { describe, it, expect } from 'vitest';
import { cortes, datasParaLimpar } from '../src/retencao.js';

describe('retenção: quais datas apagar', () => {
  it('cortes: fotos até hoje-7, respostas até hoje-30 (o resto ainda é guardado)', () =>
    expect(cortes('2026-10-22')).toEqual({ fotos: '2026-10-15', respostas: '2026-09-22' }));
  it('primeira vez: as 30 datas que terminam no corte', () => {
    const d = datasParaLimpar(null, '2026-10-15');
    expect(d).toHaveLength(30);
    expect([d[0], d.at(-1)]).toEqual(['2026-09-16', '2026-10-15']);
  });
  it('dia seguinte: só a data nova', () => expect(datasParaLimpar('2026-10-14', '2026-10-15')).toEqual(['2026-10-15']));
  it('alguns dias sem abrir: as datas que faltam', () =>
    expect(datasParaLimpar('2026-10-11', '2026-10-15')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']));
  it('já limpo: nada', () => expect(datasParaLimpar('2026-10-15', '2026-10-15')).toEqual([]));
  it('nunca mais que 30 datas (limite do "in" do Firestore)', () =>
    expect(datasParaLimpar('2025-01-01', '2026-10-15')).toHaveLength(30));
  it('valor guardado inválido conta como primeira vez', () => expect(datasParaLimpar('lixo', '2026-10-15')).toHaveLength(30));
});
