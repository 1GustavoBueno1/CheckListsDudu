// Etapa 2: login funciona no emulador e o banco está fechado para todos.
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CONTAS } from '../src/contas.js';

let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-checklists',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

describe('banco fechado até a etapa 4', () => {
  it.each(Object.keys(CONTAS))('conta %s não lê nem grava', async (uid) => {
    const db = env.authenticatedContext(uid).firestore();
    await assertFails(getDoc(doc(db, 'respostas/x')));
    await assertFails(setDoc(doc(db, 'respostas/x'), { a: 1 }));
  });
  it('sem login não lê', () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'respostas/x'))));
});
