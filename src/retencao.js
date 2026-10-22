// Retenção: fotos ficam 7 dias e respostas 30 dias (contando hoje). Sem servidor, quem
// apaga o que venceu é o próprio app, ao abrir. Cada aparelho lembra até que data já
// limpou, então no dia a dia só a data que acabou de vencer é consultada.
import { somarDias, dataValida, PRAZO_FOTOS_DIAS, PRAZO_RESPOSTAS_DIAS } from './regras.js';

/** Última data vencida de cada tipo: tudo até ela (inclusive) pode ser apagado. */
export function cortes(hoje) {
  return { fotos: somarDias(hoje, -PRAZO_FOTOS_DIAS), respostas: somarDias(hoje, -PRAZO_RESPOSTAS_DIAS) };
}

/** Datas ainda não limpas até o corte, no máximo 30 (limite do "in" do Firestore). */
export function datasParaLimpar(ultimaLimpa, corte, maximo = 30) {
  const inicio = dataValida(ultimaLimpa) ? somarDias(ultimaLimpa, 1) : somarDias(corte, -(maximo - 1));
  const primeira = inicio < somarDias(corte, -(maximo - 1)) ? somarDias(corte, -(maximo - 1)) : inicio;
  const datas = [];
  for (let d = primeira; d <= corte; d = somarDias(d, 1)) datas.push(d);
  return datas;
}

const CHAVE = (quem) => `checklist:retencao:${quem}`;

function lerEstado(quem) {
  try {
    return JSON.parse(localStorage.getItem(CHAVE(quem))) ?? {};
  } catch {
    return {};
  }
}

function gravarEstado(quem, estado) {
  try {
    localStorage.setItem(CHAVE(quem), JSON.stringify(estado));
  } catch {
    /* sem armazenamento: na próxima vez reprocessa as últimas 30 datas */
  }
}

/**
 * Roda a limpeza para a conta logada (setor = só o próprio setor; chefe = setor null,
 * todos). Erros não atrapalham o uso do app: só ficam no console.
 */
export async function limparVencidos(repo, { setor = null, hoje }) {
  const quem = setor ?? 'chefe';
  const estado = lerEstado(quem);
  const corte = cortes(hoje);
  const datasFotos = datasParaLimpar(estado.fotos, corte.fotos);
  const datasRespostas = datasParaLimpar(estado.respostas, corte.respostas);
  if (!datasFotos.length && !datasRespostas.length) return { fotos: 0, respostas: 0, observacoes: 0 };
  const resultado = await repo.apagarVencidos({ setor, datasFotos, datasRespostas });
  gravarEstado(quem, { fotos: corte.fotos, respostas: corte.respostas });
  return resultado;
}
