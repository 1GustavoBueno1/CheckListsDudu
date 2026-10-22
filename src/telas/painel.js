// Painel do chefe: escolhe a data e vê, por setor e turno, o progresso, os "Não", quem
// respondeu e as fotos (baixadas só quando pedidas). Mostra também os avisos e a semana
// da Limpeza.
import { el, trocar } from '../dom.js';
import { SETORES, TURNOS } from '../itens.js';
import {
  diaSP,
  somarDias,
  formatarData,
  nomeDoDia,
  diaDaSemana,
  diasDaSemana,
  resumoTurno,
  horaSP,
  resumoSemana,
  ultimasDatas,
  alertasLimpeza,
  expirado,
  PRAZO_FOTOS_DIAS,
  PRAZO_RESPOSTAS_DIAS,
} from '../regras.js';
import { campoData, criarAviso, traduzirErro, janelaFormulario } from '../ui.js';

const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function telaPainel(repo) {
  const hoje = diaSP();
  const aviso = criarAviso();
  const data = campoData('Data', hoje);
  data.input.min = somarDias(hoje, -(PRAZO_RESPOSTAS_DIAS - 1));
  data.input.max = hoje;
  const area = el('div', { class: 'pilha' }, el('p', { class: 'aviso' }, 'Carregando…'));

  async function desenhar() {
    const dia = data.input.value;
    if (!dia || dia > hoje || expirado(dia, hoje, PRAZO_RESPOSTAS_DIAS)) {
      trocar(area, el('p', { class: 'aviso-acao erro' }, `Data: escolha um dia entre ${formatarData(data.input.min)} e hoje (as respostas ficam guardadas por ${PRAZO_RESPOSTAS_DIAS} dias).`));
      return;
    }
    trocar(area, el('p', { class: 'aviso' }, 'Carregando…'));
    const [respostas, observacoes, daSemana, registros] = await Promise.all([
      repo.respostasDoDia(dia),
      repo.observacoesDoDia(dia),
      repo.respostasLimpezaNasDatas(diasDaSemana(dia)),
      repo.registrosParaAvisos(),
    ]);
    const fotosApagadas = expirado(dia, hoje, PRAZO_FOTOS_DIAS);
    const avisos = alertasLimpeza(hoje, ultimasDatas(registros));

    trocar(
      area,
      el('p', { class: 'dia' }, `${nomeDoDia(dia)}, ${formatarData(dia)}`),
      fotosApagadas
        ? el('p', { class: 'aviso-acao erro' }, `As fotos deste dia já foram apagadas (ficam guardadas por ${PRAZO_FOTOS_DIAS} dias). As respostas continuam.`)
        : null,
      avisos.length
        ? el('section', { class: 'cartao avisos', role: 'alert' }, el('h3', {}, 'Atenção na Limpeza'), el('ul', {}, avisos.map((a) => el('li', {}, a.mensagem))))
        : null,
      Object.entries(SETORES).map(([setor, config]) =>
        el(
          'section',
          { class: 'cartao setor-painel' },
          el('h3', {}, config.nome),
          config.turnos.map((turno) => {
            const doTurno = new Map(respostas.filter((r) => r.setor === setor && r.turno === turno).map((r) => [r.item, r]));
            const obs = observacoes.find((o) => o.setor === setor && o.turno === turno);
            return blocoTurno(setor, turno, dia, doTurno, obs, fotosApagadas);
          }),
          setor === 'limpeza' ? semanaLimpeza(dia, daSemana) : null,
        ),
      ),
    );
  }

  function blocoTurno(setor, turno, dia, respostas, obs, fotosApagadas) {
    const r = resumoTurno(setor, respostas, dia);
    const p = r.progresso;
    const titulo = setor === 'limpeza' ? 'Dia' : TURNOS[turno];
    const fotos = el('div', { class: 'grade-fotos' });
    const verFotos = el('button', { type: 'button', class: 'botao-foto' }, `Ver fotos (${r.fotos.length})`);
    verFotos.addEventListener('click', async () => {
      verFotos.disabled = true;
      verFotos.textContent = 'Baixando fotos…';
      try {
        const imagens = await Promise.all(r.fotos.map((f) => repo.fotoDe(f.id)));
        trocar(
          fotos,
          r.fotos.map((f, i) =>
            imagens[i]
              ? el(
                  'button',
                  { type: 'button', class: 'miniatura', onclick: () => ampliar(f, imagens[i]) },
                  el('img', { src: imagens[i], alt: `Foto: ${f.texto}`, loading: 'lazy' }),
                  el('span', {}, f.texto),
                )
              : el('p', { class: 'aviso' }, `Foto não encontrada: ${f.texto}`),
          ),
        );
        verFotos.remove();
      } catch (e) {
        verFotos.disabled = false;
        verFotos.textContent = `Ver fotos (${r.fotos.length})`;
        aviso.erro(traduzirErro(e));
      }
    });

    return el(
      'article',
      { class: 'turno-painel', 'data-setor': setor, 'data-turno': turno },
      el(
        'div',
        { class: 'turno-topo' },
        el('h4', {}, titulo),
        el('span', { class: 'turno-numeros' }, `${p.respondidos} de ${p.total}${p.nao ? ` · ${p.nao} Não` : ''}`),
      ),
      el('progress', { max: p.total, value: p.respondidos, 'aria-label': `${titulo}: ${p.respondidos} de ${p.total} respondidos` }),
      el('p', { class: 'meta' }, r.nomes.length ? `Por: ${r.nomes.join(', ')}` : 'Ninguém respondeu ainda.'),
      r.naos.length
        ? el(
            'ul',
            { class: 'lista-naos' },
            r.naos.map((n) =>
              el('li', {}, el('strong', {}, 'Não: '), n.texto, n.observacao ? el('span', { class: 'obs-nao' }, ` "${n.observacao}"`) : null, el('span', { class: 'meta' }, ` · ${n.funcionario}`)),
            ),
          )
        : null,
      r.pendentes.length && p.respondidos > 0
        ? el('details', { class: 'pendentes' }, el('summary', {}, `Sem resposta (${r.pendentes.length})`), el('ul', {}, r.pendentes.map((x) => el('li', {}, x.texto))))
        : null,
      obs?.texto ? el('p', { class: 'obs-turno' }, el('strong', {}, 'Observações: '), obs.texto, el('span', { class: 'meta' }, ` · ${obs.funcionario}`)) : null,
      r.fotos.length && !fotosApagadas ? verFotos : null,
      fotos,
    );
  }

  function semanaLimpeza(dia, daSemana) {
    const resumo = resumoSemana(dia, daSemana);
    return el(
      'details',
      { class: 'pendentes' },
      el('summary', {}, `Semana da Limpeza: ${resumo.feitas} de 7 atividades · geral em ${resumo.geral.feitos} de 7 dias`),
      el(
        'ul',
        {},
        resumo.atividades.map((a) =>
          el('li', {}, `${DIA_CURTO[diaDaSemana(a.prevista)]} · ${a.texto}: ${a.feitaEm.length ? `feita ${a.feitaEm.map((d) => formatarData(d).slice(0, 5)).join(', ')}` : 'pendente'}`),
        ),
      ),
    );
  }

  function ampliar(foto, imagem) {
    janelaFormulario(foto.texto, (form, fechar) => {
      form.append(
        el('img', { src: imagem, alt: `Foto: ${foto.texto}`, class: 'foto-ampliada' }),
        el('p', { class: 'meta' }, `Enviada por ${foto.funcionario}${foto.atualizado_em ? ` às ${horaSP(foto.atualizado_em)}` : ''}`),
        el('div', { class: 'botoes' }, el('button', { type: 'button', class: 'primario', onclick: fechar }, 'Fechar')),
      );
    });
  }

  data.input.addEventListener('change', () => desenhar().catch((e) => aviso.erro(traduzirErro(e))));
  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  return el('div', {}, el('h2', {}, 'Painel'), aviso.elemento, el('div', { class: 'linha-form' }, data.bloco), area);
}
