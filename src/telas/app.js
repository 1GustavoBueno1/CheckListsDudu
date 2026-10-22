// Estrutura depois do login: topo com a marca, de quem é a conta e o botão Sair.
// Setor: o checklist do setor. Chefe: abas Painel e Funcionários. Outras: "Sem acesso".
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { el, trocar } from '../dom.js';
import { SETORES } from '../itens.js';
import { telaSetor } from './setor.js';
import { telaFuncionarios } from './funcionarios.js';
import { telaPainel } from './painel.js';

const ABAS_CHEFE = [
  { id: 'painel', nome: 'Painel', tela: (repo) => telaPainel(repo) },
  { id: 'funcionarios', nome: 'Funcionários', tela: (repo) => telaFuncionarios(repo) },
];

function semAcesso() {
  return el(
    'div',
    {},
    el('h2', {}, 'Sem acesso'),
    el(
      'p',
      { class: 'aviso-acao erro' },
      'Esta conta não está liberada neste sistema. Peça ao responsável para conferir a conta, ou saia e entre com a conta do seu setor.',
    ),
  );
}

function areaDoChefe(repo) {
  const conteudo = el('div', {});
  const abas = ABAS_CHEFE.map((a) => el('a', { href: `#${a.id}`, class: 'aba', 'data-aba': a.id }, a.nome));
  function mostrar() {
    const atual = ABAS_CHEFE.find((a) => a.id === location.hash.slice(1)) ?? ABAS_CHEFE[0];
    for (const a of abas) {
      if (a.dataset.aba === atual.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    trocar(conteudo, atual.tela(repo));
  }
  window.onhashchange = mostrar; // atribuição: não acumula depois de um novo login
  mostrar();
  return el('div', {}, el('nav', { class: 'subabas', 'aria-label': 'Áreas do chefe' }, abas), conteudo);
}

export function telaApp(destino, repo) {
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
  const conteudo =
    destino.tela === 'setor' ? telaSetor(repo, destino.setor) : destino.tela === 'chefe' ? areaDoChefe(repo) : semAcesso();
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
    el('main', { id: 'conteudo', tabindex: '-1' }, conteudo),
  );
}
