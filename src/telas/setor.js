// Checklist do setor: turno, quem está preenchendo e os itens do PDF com Sim/Não e
// observação. Cada resposta é salva na hora em que o botão é tocado.
import { el, trocar } from '../dom.js';
import { SETORES, TURNOS, LIMPEZA_DIARIA, ATIVIDADES_LIMPEZA, LEMBRETES_LIMPEZA } from '../itens.js';
import {
  diaSP,
  formatarData,
  nomeDoDia,
  horaSP,
  progresso,
  turnoPadrao,
  idResposta,
  atividadeDoDia,
  diasDaSemana,
  resumoSemana,
  ultimasDatas,
  alertasLimpeza,
  diaDaSemana,
} from '../regras.js';
import { reduzirFoto } from '../foto.js';
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
  const ehLimpeza = setor === 'limpeza';
  const atividadeHoje = ehLimpeza ? atividadeDoDia(hoje) : null;
  let resumo = null; // Limpeza: resumo da semana

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

  const visor = ehLimpeza
    ? criarVisor([
        { chave: 'geral', rotulo: 'Diárias hoje' },
        { chave: 'atividade', rotulo: 'Atividade do dia' },
        { chave: 'semana', rotulo: 'Semana' },
      ])
    : criarVisor([
        { chave: 'feitos', rotulo: 'Respondidos' },
        { chave: 'sim', rotulo: 'Sim' },
        { chave: 'nao', rotulo: 'Não' },
      ]);
  function atualizarVisor() {
    if (ehLimpeza) {
      const situacao = (id) => ({ sim: 'Feita', nao: 'Não feita' })[respostas.get(id)?.resposta] ?? 'Pendente';
      visor.definir({
        geral: `${LIMPEZA_DIARIA.filter((i) => respostas.get(i.id)?.resposta === 'sim').length} de ${LIMPEZA_DIARIA.length}`,
        atividade: situacao(atividadeHoje.id),
        semana: resumo ? `${resumo.feitas} de 7` : null,
      });
      return;
    }
    const p = progresso(setor, respostas);
    visor.definir({ feitos: `${p.respondidos} de ${p.total}`, sim: String(p.sim), nao: String(p.nao) });
  }

  // ---- Limpeza: avisos, semana e lembretes
  const areaAvisos = el('div', {});
  const areaSemana = el('div', {});
  const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const curto = (data) => `${DIA_CURTO[diaDaSemana(data)]} ${formatarData(data).slice(0, 5)}`;

  async function atualizarLimpeza() {
    const [daSemana, registros] = await Promise.all([repo.respostasLimpezaNasDatas(diasDaSemana(hoje)), repo.registrosParaAvisos()]);
    resumo = resumoSemana(hoje, daSemana);
    const avisos = alertasLimpeza(hoje, ultimasDatas(registros));
    trocar(
      areaAvisos,
      avisos.length
        ? el('section', { class: 'cartao avisos', role: 'alert' }, el('h3', {}, 'Atenção'), el('ul', {}, avisos.map((a) => el('li', {}, a.mensagem))))
        : null,
    );
    trocar(
      areaSemana,
      el(
        'section',
        { class: 'cartao semana' },
        el('h3', {}, 'Esta semana'),
        el('p', { class: 'aviso' }, `Limpeza geral feita em ${resumo.geral.feitos} de 7 dias.`),
        el(
          'ul',
          { class: 'lista-semana' },
          resumo.atividades.map((a) =>
            el(
              'li',
              { 'data-feita': String(a.feitaEm.length > 0) },
              el('span', { class: 'semana-dia' }, DIA_CURTO[diaDaSemana(a.prevista)]),
              el('span', { class: 'semana-texto' }, a.texto),
              el('span', { class: 'semana-situacao' }, a.feitaEm.length ? `Feita ${a.feitaEm.map(curto).join(', ')}` : 'Pendente'),
            ),
          ),
        ),
      ),
    );
    atualizarVisor();
  }

  const lembretes = ehLimpeza
    ? el('details', { class: 'cartao lembretes' }, el('summary', {}, 'Lembretes do cronograma'), el('ul', {}, LEMBRETES_LIMPEZA.map((l) => el('li', {}, l))))
    : null;

  // ---- Itens
  const lista = el('div', { class: 'pilha' });

  function cartaoItem(item) {
    const erro = el('p', { class: 'erro-item', role: 'alert' });
    const meta = el('p', { class: 'meta' });
    const sim = el('button', { type: 'button', class: 'resposta-sim' }, 'Sim');
    const nao = el('button', { type: 'button', class: 'resposta-nao' }, 'Não');
    // Itens com (FOTO): "Sim" abre a câmera; a foto vai junto com o "Sim".
    const camera = item.foto
      ? el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'visualmente-oculto', tabindex: '-1', 'aria-hidden': 'true' })
      : null;
    const verFoto = el('button', { type: 'button', class: 'botao-foto' }, 'Ver foto');
    const trocarFoto = el('button', { type: 'button', class: 'botao-foto' }, 'Trocar foto');
    const imagemFoto = el('img', { class: 'foto-item', alt: `Foto: ${item.texto}`, hidden: true });
    const areaFoto = item.foto ? el('div', { class: 'area-foto' }, verFoto, trocarFoto, imagemFoto, camera) : null;
    const obsId = `obs-${item.id}`;
    const obs = el('textarea', { id: obsId, rows: 2, maxlength: 500, placeholder: 'Opcional' });
    const cartao = el(
      'article',
      { class: 'item', 'data-item': item.id },
      el('p', { class: 'item-texto' }, item.texto),
      item.foto ? el('span', { class: 'selo-foto' }, 'Exige foto') : null,
      el('div', { class: 'respostas' }, sim, nao),
      areaFoto,
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
        ? `${r.resposta === 'sim' ? 'Sim' : 'Não'}${r.tem_foto ? ' com foto' : ''} · ${r.funcionario}${r.atualizado_em ? ` · ${horaSP(r.atualizado_em)}` : ''}`
        : 'Ainda não respondido';
      if (areaFoto) {
        areaFoto.hidden = !r?.tem_foto;
        imagemFoto.hidden = true;
        imagemFoto.removeAttribute('src');
        verFoto.textContent = 'Ver foto';
      }
    }

    function abrirCamera() {
      erro.textContent = '';
      if (!funcionarioAtual()) {
        erro.textContent = 'Quem está preenchendo: escolha o seu nome antes de tirar a foto.';
        quem.input.focus();
        return;
      }
      camera.value = '';
      camera.click();
    }

    camera?.addEventListener('change', async () => {
      const arquivo = camera.files?.[0];
      if (!arquivo) return;
      sim.disabled = nao.disabled = trocarFoto.disabled = true;
      meta.textContent = 'Preparando a foto…';
      try {
        const imagem = await reduzirFoto(arquivo);
        meta.textContent = 'Enviando a foto…';
        await responder('sim', imagem);
      } catch (e) {
        erro.textContent = traduzirErro(e);
        mostrar();
      } finally {
        sim.disabled = nao.disabled = trocarFoto.disabled = false;
      }
    });

    verFoto.addEventListener('click', async () => {
      if (!imagemFoto.hidden) {
        imagemFoto.hidden = true;
        verFoto.textContent = 'Ver foto';
        return;
      }
      verFoto.disabled = true;
      try {
        const imagem = await repo.fotoDe(idResposta(hoje, setor, turno, item.id));
        if (!imagem) throw new Error('Foto: não encontrada. Tire a foto de novo.');
        imagemFoto.src = imagem;
        imagemFoto.hidden = false;
        verFoto.textContent = 'Esconder foto';
      } catch (e) {
        erro.textContent = traduzirErro(e);
      } finally {
        verFoto.disabled = false;
      }
    });
    trocarFoto.addEventListener('click', abrirCamera);

    async function responder(valor, imagem = null) {
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
          imagem,
        });
        respostas.set(item.id, salvo);
        mostrar();
        atualizarVisor();
        if (ehLimpeza) atualizarLimpeza().catch((e) => aviso.erro(traduzirErro(e)));
      } catch (e) {
        erro.textContent = traduzirErro(e);
        if (!funcionarioAtual()) quem.input.focus();
      } finally {
        sim.disabled = nao.disabled = false;
      }
    }

    sim.addEventListener('click', () => {
      // Item com foto ainda sem foto: o "Sim" começa pela câmera.
      if (item.foto && !respostas.get(item.id)?.tem_foto) abrirCamera();
      else responder('sim');
    });
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
    if (ehLimpeza) {
      const outras = ATIVIDADES_LIMPEZA.filter((a) => a.id !== atividadeHoje.id);
      trocar(
        lista,
        el(
          'section',
          { class: 'secao-itens' },
          el('h3', {}, 'Hoje'),
          LIMPEZA_DIARIA.map(cartaoItem),
          el('p', { class: 'aviso' }, `Atividade do dia (${nomeDoDia(hoje)}):`),
          cartaoItem(atividadeHoje),
        ),
        el(
          'details',
          { class: 'secao-itens outras-atividades', open: outras.some((a) => respostas.has(a.id)) },
          el('summary', {}, 'Fiz outra atividade da semana hoje'),
          outras.map(cartaoItem),
        ),
      );
      return;
    }
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
    if (ehLimpeza) await atualizarLimpeza();
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
    areaAvisos,
    el(
      'section',
      { class: 'cartao cabecalho-checklist' },
      el('p', { class: 'dia' }, `${nomeDoDia(hoje)}, ${formatarData(hoje)}`),
      config.turnos.length > 1 ? el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Turno' }, botoesTurno) : null,
      quem.bloco,
      visor.elemento,
    ),
    lista,
    areaSemana,
    lembretes,
    formObs,
  );
}
