// As regras do Firestore repetem dados do app (UIDs, itens sem foto, limites).
// Estes testes leem firestore.rules e garantem que os dois nunca divergem.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CONTAS } from '../src/contas.js';
import { SETORES, itensDoSetor } from '../src/itens.js';
import { PRAZO_FOTOS_DIAS, PRAZO_RESPOSTAS_DIAS } from '../src/regras.js';

const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

describe('firestore.rules × app', () => {
  it('UIDs dos setores e do chefe são os de contas.js', () => {
    const mapa = Object.fromEntries([...regras.matchAll(/'([A-Za-z0-9]{28})': '([a-z]+)'/g)].map((m) => [m[1], m[2]]));
    const chefe = regras.match(/request\.auth\.uid == '([A-Za-z0-9]{28})'/)[1];
    const esperado = Object.fromEntries(
      Object.entries(CONTAS).filter(([, c]) => c.papel === 'setor').map(([uid, c]) => [uid, c.setor]),
    );
    expect(mapa).toEqual(esperado);
    expect(CONTAS[chefe]).toEqual({ papel: 'chefe' });
  });

  it('itens sem foto nas regras = itens sem (FOTO) nos PDFs', () => {
    const bloco = regras.match(/function precisaFoto\(item\) \{([\s\S]*?)\}/)[1];
    const nasRegras = [...bloco.matchAll(/'([a-z]+-\d\d)'/g)].map((m) => m[1]).sort();
    const noApp = Object.keys(SETORES).flatMap(itensDoSetor).filter((i) => !i.foto).map((i) => i.id).sort();
    expect(nasRegras).toEqual(noApp);
  });

  it('prazos das regras = prazos do app', () => {
    expect(regras).toContain(`vencido(resource.data.data, ${PRAZO_RESPOSTAS_DIAS})`);
    expect(regras).toContain(`vencido(resource.data.data, ${PRAZO_FOTOS_DIAS})`);
  });
});
