// Depois do login, cada conta vai para a sua tela: setor -> checklist do setor,
// chefe -> painel, conta desconhecida -> aviso de sem acesso.
import { contaDe } from './contas.js';

export function destinoDe(uid) {
  const conta = contaDe(uid);
  if (!conta) return { tela: 'sem-acesso' };
  if (conta.papel === 'chefe') return { tela: 'chefe' };
  return { tela: 'setor', setor: conta.setor };
}
