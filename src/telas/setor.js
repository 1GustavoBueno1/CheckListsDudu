// Checklist do setor: turno, quem está preenchendo e os itens do PDF com Sim/Não e
// observação. Cada resposta é salva na hora em que o botão é tocado.
import { el, trocar } from '../dom.js';
import { SETORES, TURNOS, itensDoSetor } from '../itens.js';
import { diaSP, formatarData, nomeDoDia, horaSP, progresso, turnoPadrao } from '../regras.js';
import { campoSelecao, preencherOpcoes, criarAviso, executar, traduzirErro, criarVisor } from '../ui.js';

// Lembra no aparelho quem preencheu por último (só conveniência; pode falhar sem problema).
const chaveNome = (setor) => `checklist:funcionario:${setor}`;
function lembrar(setor, id) {
  try {
    localStorage.setItem(chaveNome(setor), id);
  } catch {
    /* navegador sem armazenamento local */
  }
}
function lembrado(setor) {
  try {
    return localStorage.getItem(chaveNome(setor));
  } catch {
    return null;
  }
}

export function telaSetor(repo, setor) {
  const config = SETORES[setor];
  const hoje = diaSP();
  const aviso = criarAviso();
  let turno = config.turnos.length > 1 ? turnoPadrao() : config.turnos[0];
  let funcionarios = [];
  let respostas = new Map();

  // ---- Cabeçalho: dia, turno e quem preenche
  const quem = campoSelecao('Quem está preenchendo');
  quem.input.addEventListener('change', () => lembrar(setor, quem.input.value));
  const funcionarioAtual = () => funcionarios.find((f) => f.id === quem.input.value) ?? null;

  const botoesTurno = config.turnos.map((t) =>
    el('button', { type: 'button', class: 'segmento', 'data-turno': t, onclick: () => trocarTurno(t) }, TURNOS[t]),
  );
  function marcarTurno() {
    for (const b of botoesTurno) b.setAttribute('aria-pressed', String(b.dataset.turno === turno));
  }

  const visor = criarVisor([
    { chave: 'feitos', rotulo: 'Respondidos' },
    { chave: 'sim', rotulo: 'Sim' },
    { chave: 'nao', rotulo: 'Não' },
  ]);
  function atualizarVisor() {
    const p = progresso(setor, respostas);
    visor.definir({ feitos: `${p.respondidos} de ${p.total}`, sim: String(p.sim), nao: String(p.nao) });
  }

  // ---- Itens
  const lista = el('div', { class: 'pilha' });

  function cartaoItem(item) {
    const erro = el('p', { class: 'erro-item', role: 'alert' });
    const meta = el('p', { class: 'meta' });
    const sim = el('button', { type: 'button', class: 'resposta-sim' }, 'Sim');
    const nao = el('button', { type: 'button', class: 'resposta-nao' }, 'Não');
    const obsId = `obs-${item.id}`;
    const obs = el('textarea', { id: obsId, rows: 2, maxlength: 500, placeholder: 'Opcional' });
    const cartao = el(
      'article',
      { class: 'item', 'data-item': item.id },
      el('p', { class: 'item-texto' }, item.texto),
      item.foto ? el('span', { class: 'selo-foto' }, 'Foto obrigatória para Sim') : null,
      el('div', { class: 'respostas' }, sim, nao),
      el('details', { class: 'item-obs' }, el('summary', {}, 'Observação'), el('label', { for: obsId, class: 'visualmente-oculto' }, 'Observação'), obs),
      erro,
      meta,
    );

    function mostrar() {
      const r = respostas.get(item.id);
      cartao.dataset.estado = r ? r.resposta : 'pendente';
      sim.setAttribute('aria-pressed', String(r?.resposta === 'sim'));
      nao.setAttribute('aria-pressed', String(r?.resposta === 'nao'));
      if (document.activeElement !== obs) obs.value = r?.observacao ?? '';
      meta.textContent = r
        ? `${r.resposta === 'sim' ? 'Sim' : 'Não'} · ${r.funcionario}${r.atualizado_em ? ` · ${horaSP(r.atualizado_em)}` : ''}`
        : 'Ainda não respondido';
    }

    async function responder(valor) {
      erro.textContent = '';
      sim.disabled = nao.disabled = true;
      try {
        const salvo = await repo.salvarResposta({
          setor,
          data: hoje,
          turno,
          item: item.id,
          resposta: valor,
          observacao: obs.value,
          funcionario: funcionarioAtual(),
          existente: respostas.get(item.id) ?? null,
        });
        respostas.set(item.id, salvo);
        mostrar();
        atualizarVisor();
      } catch (e) {
        erro.textContent = traduzirErro(e);
        if (!funcionarioAtual()) quem.input.focus();
      } finally {
        sim.disabled = nao.disabled = false;
      }
    }

    sim.addEventListener('click', () => responder('sim'));
    nao.addEventListener('click', () => responder('nao'));
    // Observação de um item já respondido é salva ao sair do campo.
    obs.addEventListener('change', () => {
      const r = respostas.get(item.id);
      if (r) responder(r.resposta);
    });
    mostrar();
    return cartao;
  }

  function desenharItens() {
    trocar(
      lista,
      config.secoes.map((secao) =>
        el(
          'section',
          { class: 'secao-itens' },
          secao.titulo ? el('h3', {}, secao.titulo) : null,
          secao.itens.map(cartaoItem),
        ),
      ),
    );
  }

  // ---- Observações gerais do turno
  const obsGeral = el('textarea', { id: 'obs-turno', rows: 3, maxlength: 2000 });
  const salvarObs = el('button', { type: 'submit' }, 'Salvar observações');
  const formObs = el(
    'form',
    { class: 'cartao', novalidate: true },
    el('label', { for: 'obs-turno' }, 'Observações gerais'),
    obsGeral,
    el('div', { class: 'botoes' }, salvarObs),
  );
  formObs.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, salvarObs, async () => {
      await repo.salvarObservacaoDoTurno({ setor, data: hoje, turno, texto: obsGeral.value, funcionario: funcionarioAtual() });
      aviso.ok('Observações salvas.');
    });
  });

  // ---- Carregar
  async function carregarTurno() {
    const [mapa, obsTurno] = await Promise.all([repo.respostasDoTurno(setor, hoje, turno), repo.observacaoDoTurno(setor, hoje, turno)]);
    respostas = mapa;
    obsGeral.value = obsTurno?.texto ?? '';
    desenharItens();
    atualizarVisor();
  }

  function trocarTurno(t) {
    if (t === turno) return;
    turno = t;
    marcarTurno();
    aviso.limpar();
    carregarTurno().catch((e) => aviso.erro(traduzirErro(e)));
  }

  async function iniciar() {
    funcionarios = await repo.funcionariosDoSetor(setor);
    preencherOpcoes(
      quem.input,
      funcionarios.map((f) => ({ valor: f.id, texto: f.nome })),
      { vazio: funcionarios.length ? 'Escolha o seu nome…' : 'Nenhum nome cadastrado', selecionado: lembrado(setor) },
    );
    if (!funcionarioAtual()) quem.input.value = '';
    if (!funcionarios.length) aviso.erro('Peça ao chefe para cadastrar os nomes do setor antes de preencher.');
    marcarTurno();
    await carregarTurno();
  }

  iniciar().catch((e) => aviso.erro(traduzirErro(e)));

  return el(
    'div',
    {},
    el('h2', {}, config.nome),
    aviso.elemento,
    el(
      'section',
      { class: 'cartao cabecalho-checklist' },
      el('p', { class: 'dia' }, `${nomeDoDia(hoje)}, ${formatarData(hoje)}`),
      config.turnos.length > 1 ? el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Turno' }, botoesTurno) : null,
      quem.bloco,
      visor.elemento,
    ),
    lista,
    formObs,
  );
}
