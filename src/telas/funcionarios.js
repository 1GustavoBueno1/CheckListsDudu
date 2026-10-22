// Cadastro de funcionários (só o chefe): os nomes que aparecem em "Quem está preenchendo".
import { el, trocar } from '../dom.js';
import { SETORES } from '../itens.js';
import { campoTexto, campoSelecao, preencherOpcoes, criarAviso, executar, traduzirErro, tabela, janelaFormulario } from '../ui.js';

export function telaFuncionarios(repo) {
  const aviso = criarAviso();
  const area = el('div', { class: 'pilha' }, el('p', { class: 'aviso' }, 'Carregando…'));

  const nome = campoTexto('Nome', { maxlength: 60, autocomplete: 'off' });
  const setor = campoSelecao('Setor');
  preencherOpcoes(setor.input, Object.entries(SETORES).map(([id, s]) => ({ valor: id, texto: s.nome })), { vazio: 'Escolha…' });
  const adicionar = el('button', { type: 'submit', class: 'primario' }, 'Adicionar');
  const form = el('form', { class: 'cartao linha-form', novalidate: true }, nome.bloco, setor.bloco, el('div', { class: 'botoes' }, adicionar));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, adicionar, async () => {
      const f = await repo.salvarFuncionario({ setor: setor.input.value, nome: nome.input.value });
      nome.input.value = '';
      await desenhar();
      aviso.ok(`"${f.nome}" adicionado em ${SETORES[f.setor].nome}.`);
      nome.input.focus();
    });
  });

  async function desenhar() {
    const todos = await repo.todosFuncionarios();
    trocar(
      area,
      Object.entries(SETORES).map(([id, s]) => {
        const doSetor = todos.filter((f) => f.setor === id);
        const linhas = doSetor.map((f) => linha(f));
        return el(
          'section',
          { class: 'cartao' },
          el('h3', {}, s.nome),
          doSetor.length ? tabela(['Nome', 'Situação', 'Ações'], linhas) : el('p', { class: 'aviso' }, 'Nenhum nome cadastrado.'),
        );
      }),
    );
  }

  function linha(f) {
    const renomear = el('button', { type: 'button' }, 'Renomear');
    const alternar = el('button', { type: 'button', class: f.ativo ? 'perigo-leve' : '' }, f.ativo ? 'Desativar' : 'Reativar');
    renomear.addEventListener('click', () =>
      janelaFormulario(`Renomear "${f.nome}"`, (formulario, fechar) => {
        const erro = criarAviso();
        const campo = campoTexto('Novo nome', { maxlength: 60, value: f.nome });
        const salvar = el('button', { type: 'submit', class: 'primario' }, 'Salvar');
        formulario.append(campo.bloco, erro.elemento, el('div', { class: 'botoes' }, el('button', { type: 'button', onclick: fechar }, 'Cancelar'), salvar));
        formulario.addEventListener('submit', (e) => {
          e.preventDefault();
          executar(erro, salvar, async () => {
            const salvo = await repo.salvarFuncionario({ ...f, nome: campo.input.value });
            fechar();
            await desenhar();
            aviso.ok(`Nome alterado para "${salvo.nome}".`);
          });
        });
        queueMicrotask(() => campo.input.select());
      }),
    );
    alternar.addEventListener('click', () =>
      executar(aviso, alternar, async () => {
        await repo.salvarFuncionario({ ...f, ativo: !f.ativo });
        await desenhar();
        aviso.ok(`"${f.nome}" ${f.ativo ? 'desativado' : 'reativado'}.`);
      }),
    );
    return el(
      'tr',
      {},
      el('td', {}, f.nome),
      el('td', {}, f.ativo ? 'Ativo' : 'Desativado'),
      el('td', { class: 'acoes' }, renomear, alternar),
    );
  }

  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  return el(
    'div',
    {},
    el('h2', {}, 'Funcionários'),
    el('p', { class: 'aviso' }, 'Os nomes ativos aparecem para o setor em "Quem está preenchendo". Desativar não apaga o que a pessoa já respondeu.'),
    aviso.elemento,
    form,
    area,
  );
}
