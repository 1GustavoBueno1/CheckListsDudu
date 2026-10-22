import { describe, it, expect } from 'vitest';
import { destinoDe } from '../src/destino.js';

describe('para onde cada conta vai depois do login', () => {
  it('conta de setor vai para o checklist do próprio setor', () => {
    expect(destinoDe('ScjaryIu84Y5IzTqSC9trkmGhsI2')).toEqual({ tela: 'setor', setor: 'cozinha' });
    expect(destinoDe('8r2CdyO1AOTmvEVRpEE4PABPf882')).toEqual({ tela: 'setor', setor: 'limpeza' });
  });
  it('chefe vai para o painel', () => expect(destinoDe('EfC9RQNucAVR2BJn0Gx0iAqbSQb2')).toEqual({ tela: 'chefe' }));
  it('conta que não é do sistema fica sem acesso', () =>
    expect(destinoDe('O91aw1kO6pNqn7VbgbxRFLaCzVI2')).toEqual({ tela: 'sem-acesso' }));
});
