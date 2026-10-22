// Estrutura depois do login: topo com a marca, de quem é a conta e o botão Sair.
// O conteúdo depende do destino da conta (setor, chefe ou sem acesso).
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { el } from '../dom.js';
import { SETORES } from '../itens.js';

function conteudo(destino) {
  if (destino.tela === 'setor') {
    return [
      el('h2', {}, SETORES[destino.setor].nome),
      el('p', { class: 'aviso' }, 'O checklist do setor entra na etapa 5.'),
    ];
  }
  if (destino.tela === 'chefe') {
    return [el('h2', {}, 'Painel'), el('p', { class: 'aviso' }, 'O painel do chefe entra na etapa 8.')];
  }
  return [
    el('h2', {}, 'Sem acesso'),
    el(
      'p',
      { class: 'aviso-acao erro' },
      'Esta conta não está liberada neste sistema. Peça ao responsável para conferir a conta, ou saia e entre com a conta do seu setor.',
    ),
  ];
}

export function telaApp(destino) {
  const rotulo = destino.tela === 'setor' ? SETORES[destino.setor].nome : destino.tela === 'chefe' ? 'Chefe' : 'Sem acesso';
  const sair = el(
    'button',
    {
      type: 'button',
      class: 'secundario',
      onclick: async () => {
        sair.disabled = true;
        await signOut(auth); // main.js volta para o login.
      },
    },
    'Sair',
  );
  return el(
    'div',
    { class: 'app' },
    el(
      'header',
      { class: 'topo' },
      el(
        'span',
        { class: 'marca' },
        el('img', { src: '/logo-dudu-192.png', alt: '', width: 44, height: 44 }),
        el('span', {}, el('span', { class: 'marca-nome' }, 'Dudu'), el('span', { class: 'marca-sub' }, 'Checklists')),
      ),
      el('span', { class: 'conta' }, rotulo),
      sair,
    ),
    el('main', { id: 'conteudo', tabindex: '-1' }, conteudo(destino)),
  );
}
