import { describe, it, expect } from 'vitest';
import { CONTAS, contaDe } from '../src/contas.js';
import { SETORES } from '../src/itens.js';

describe('contas', () => {
  it('uma conta por setor e uma do chefe', () => {
    const setores = Object.values(CONTAS).filter((c) => c.papel === 'setor').map((c) => c.setor).sort();
    expect(setores).toEqual(Object.keys(SETORES).sort());
    expect(Object.values(CONTAS).filter((c) => c.papel === 'chefe')).toHaveLength(1);
  });
  it('UIDs com o formato do Firebase (28 caracteres)', () => {
    for (const uid of Object.keys(CONTAS)) expect(uid).toMatch(/^[A-Za-z0-9]{28}$/);
  });
  it('mapa conferido com o que o Gustavo informou', () => {
    expect(contaDe('ScjaryIu84Y5IzTqSC9trkmGhsI2')).toEqual({ papel: 'setor', setor: 'cozinha' });
    expect(contaDe('NVErpPpmVHdlzlXwfTZfZFEmSMy1')).toEqual({ papel: 'setor', setor: 'garcons' });
    expect(contaDe('jLYSnaK3MHdTeKSgGZhs6W9D9b92')).toEqual({ papel: 'setor', setor: 'conveniencia' });
    expect(contaDe('8r2CdyO1AOTmvEVRpEE4PABPf882')).toEqual({ papel: 'setor', setor: 'limpeza' });
    expect(contaDe('EfC9RQNucAVR2BJn0Gx0iAqbSQb2')).toEqual({ papel: 'chefe' });
  });
  it('conta desconhecida não tem papel', () => {
    expect(contaDe('O91aw1kO6pNqn7VbgbxRFLaCzVI2')).toBeNull(); // UID antigo da Cozinha, descartado
    expect(contaDe(undefined)).toBeNull();
  });
});
