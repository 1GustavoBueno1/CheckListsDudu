// Regras do checklist que não dependem do Firebase (testadas sem emulador).
import { SETORES, itensDoSetor, ATIVIDADES_LIMPEZA } from './itens.js';

export const PRAZO_FOTOS_DIAS = 7;
export const PRAZO_RESPOSTAS_DIAS = 30;
const LIMITE_ACOUGUE_DIAS = 7;
const LIMITE_CAMARAS_DIAS = 15;

// ---- Datas: texto AAAA-MM-DD no fuso de São Paulo (nunca toISOString para o dia) ----

const FORMATO_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const diaSP = (instante = new Date()) => FORMATO_SP.format(instante);

function partes(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return { a, m, d };
}

export function dataValida(dia) {
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const { a, m, d } = partes(dia);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return m >= 1 && m <= 12 && d >= 1 && d <= ultimo;
}

/** Soma (ou subtrai) dias de calendário. Usa UTC só como calendário, sem fuso. */
export function somarDias(dia, n) {
  const { a, m, d } = partes(dia);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(dia) {
  const { a, m, d } = partes(dia);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

function diasEntre(antes, depois) {
  const ms = (dia) => {
    const { a, m, d } = partes(dia);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(depois) - ms(antes)) / 86_400_000);
}

// ---- Respostas ----------------------------------------------------------------------

export function itemDoSetor(setor, itemId) {
  return itensDoSetor(setor).find((i) => i.id === itemId) ?? null;
}

/** ID do documento de uma resposta: uma por item, turno e dia. */
export function idResposta(data, setor, turno, itemId) {
  if (!dataValida(data)) throw new Error('Data: informe uma data válida.');
  if (!SETORES[setor]) throw new Error('Setor: setor desconhecido.');
  if (!SETORES[setor].turnos.includes(turno)) throw new Error('Turno: turno inválido para este setor.');
  if (!itemDoSetor(setor, itemId)) throw new Error('Item: item desconhecido neste setor.');
  return `${data}_${setor}_${turno}_${itemId}`;
}

/** "Sim" num item com (FOTO) exige foto. Devolve a resposta validada. */
export function validarResposta(setor, itemId, resposta, temFoto) {
  const item = itemDoSetor(setor, itemId);
  if (!item) throw new Error('Item: item desconhecido neste setor.');
  if (resposta !== 'sim' && resposta !== 'nao') throw new Error('Resposta: escolha Sim ou Não.');
  if (resposta === 'sim' && item.foto && !temFoto) {
    throw new Error('Foto: tire a foto para marcar "Sim" neste item.');
  }
  return resposta;
}

/** respostas: Map itemId -> { resposta }. */
export function progresso(setor, respostas) {
  const itens = itensDoSetor(setor);
  const validas = itens.map((i) => respostas.get(i.id)).filter(Boolean);
  return {
    total: itens.length,
    respondidos: validas.length,
    sim: validas.filter((r) => r.resposta === 'sim').length,
    nao: validas.filter((r) => r.resposta === 'nao').length,
  };
}

// ---- Limpeza ------------------------------------------------------------------------

export const atividadeDoDia = (dia) => ATIVIDADES_LIMPEZA.find((a) => a.diaSemana === diaDaSemana(dia));

/** Semana de segunda a domingo, como no cronograma do PDF. */
export function semanaDe(dia) {
  const desdeSegunda = (diaDaSemana(dia) + 6) % 7;
  const inicio = somarDias(dia, -desdeSegunda);
  return { inicio, fim: somarDias(inicio, 6) };
}

/**
 * ultimas: { acougue, camaras } = data (AAAA-MM-DD) da última vez em que cada atividade
 * foi marcada "Sim", ou null se não há registro nos últimos 30 dias.
 */
export function alertasLimpeza(hoje, ultimas) {
  const regras = [
    { atividade: 'limp-acougue', chave: 'acougue', limite: LIMITE_ACOUGUE_DIAS, nome: 'Açougue e churrasqueira', acao: 'lavagem', regra: 'o mínimo é 1 vez por semana' },
    { atividade: 'limp-camaras', chave: 'camaras', limite: LIMITE_CAMARAS_DIAS, nome: 'Câmaras frias do açougue', acao: 'higienização', regra: 'o prazo é a cada 15 dias' },
  ];
  const avisos = [];
  for (const r of regras) {
    const ultima = ultimas[r.chave];
    if (!ultima) {
      avisos.push({ atividade: r.atividade, dias: null, mensagem: `${r.nome}: nenhuma ${r.acao} registrada nos últimos ${PRAZO_RESPOSTAS_DIAS} dias.` });
      continue;
    }
    const dias = diasEntre(ultima, hoje);
    if (dias > r.limite) {
      avisos.push({ atividade: r.atividade, dias, mensagem: `${r.nome}: última ${r.acao} há ${dias} dias (${r.regra}).` });
    }
  }
  return avisos;
}

// ---- Prazos de guarda ---------------------------------------------------------------

/** Guardar "n dias contando hoje": com n = 7, hoje e os 6 dias anteriores ficam. */
export const expirado = (data, hoje, dias) => data < somarDias(hoje, -(dias - 1));

// ---- Para a tela --------------------------------------------------------------------

const HORA_SP = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });

/** "14:05" no fuso de São Paulo. Aceita Date ou Timestamp do Firestore. */
export const horaSP = (instante) => HORA_SP.format(instante?.toDate ? instante.toDate() : instante);

export function formatarData(dia) {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const nomeDoDia = (dia) => DIAS[diaDaSemana(dia)];

/** Sugestão de turno pela hora em São Paulo: até 15:59 Almoço, depois Noite. */
export function turnoPadrao(instante = new Date()) {
  const hora = Number(horaSP(instante).slice(0, 2));
  return hora < 16 ? 'almoco' : 'noite';
}

// ---- Limpeza: semana e avisos a partir das respostas ---------------------------------

/** As 7 datas da semana (segunda a domingo) que contém o dia. */
export function diasDaSemana(dia) {
  const { inicio } = semanaDe(dia);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/**
 * respostas: respostas da Limpeza na semana ({ data, item, resposta }).
 * Só "Sim" conta como feita. Cada atividade traz o dia previsto no cronograma.
 */
export function resumoSemana(dia, respostas) {
  const dias = diasDaSemana(dia);
  const feitasPor = (item) =>
    [...new Set(respostas.filter((r) => r.item === item && r.resposta === 'sim').map((r) => r.data))].sort();
  const atividades = ATIVIDADES_LIMPEZA.map((a) => ({
    id: a.id,
    texto: a.texto,
    prevista: dias[(a.diaSemana + 6) % 7],
    feitaEm: feitasPor(a.id),
  }));
  const diasGeral = feitasPor('limp-geral');
  return {
    atividades,
    feitas: atividades.filter((a) => a.feitaEm.length > 0).length,
    geral: { feitos: diasGeral.length, dias: diasGeral },
  };
}

/** Última data com "Sim" do açougue e das câmaras frias (para alertasLimpeza). */
export function ultimasDatas(respostas) {
  const ultima = (item) =>
    respostas.filter((r) => r.item === item && r.resposta === 'sim').map((r) => r.data).sort().at(-1) ?? null;
  return { acougue: ultima('limp-acougue'), camaras: ultima('limp-camaras') };
}
