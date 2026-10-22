import { describe, it, expect } from 'vitest';
import { dimensoesReduzidas, tamanhoAceito, LIMITE_FOTO } from '../src/foto.js';

describe('redução de foto', () => {
  it('lado maior vira 1280 mantendo a proporção', () => {
    expect(dimensoesReduzidas(4000, 3000, 1280)).toEqual({ largura: 1280, altura: 960 });
    expect(dimensoesReduzidas(3000, 4000, 1280)).toEqual({ largura: 960, altura: 1280 });
  });
  it('foto pequena não é ampliada', () => expect(dimensoesReduzidas(800, 600, 1280)).toEqual({ largura: 800, altura: 600 }));
  it('arredonda e nunca chega a zero', () => expect(dimensoesReduzidas(5000, 3, 1280)).toEqual({ largura: 1280, altura: 1 }));
  it('limite do app fica abaixo do limite das regras (950 mil caracteres)', () => expect(LIMITE_FOTO).toBeLessThan(950000));
  it('tamanhoAceito confere formato JPEG e tamanho', () => {
    expect(tamanhoAceito('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(tamanhoAceito('data:image/png;base64,AAAA')).toBe(false);
    expect(tamanhoAceito('data:image/jpeg;base64,' + 'A'.repeat(LIMITE_FOTO))).toBe(false);
  });
});
