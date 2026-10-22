// Acesso ao Firestore. Valida no app antes de gravar (mensagens claras) e as regras do
// Firestore validam de novo no servidor. Consultas sempre filtram por setor e data.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { SETORES } from './itens.js';
import { diaSP, idResposta, validarResposta } from './regras.js';

export const normalizar = (nome) => String(nome ?? '').trim().toLocaleLowerCase('pt-BR');
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const comId = (d) => ({ id: d.id, ...d.data() });

function lerNome(nome) {
  const limpo = String(nome ?? '').trim().replace(/\s+/g, ' ');
  if (limpo === '') throw new Error('Nome: informe o nome.');
  if (limpo.length > 60) throw new Error('Nome: use no máximo 60 caracteres.');
  return limpo;
}

/** O dia mudou desde que a tela abriu? (as regras só aceitam a data de hoje) */
function exigirHoje(data) {
  if (data !== diaSP()) {
    throw new Error('Dia: o dia mudou desde que a tela foi aberta. Recarregue a página para preencher o checklist de hoje.');
  }
}

export function criarRepositorio(db) {
  // ---- Funcionários -----------------------------------------------------------------
  async function funcionariosDoSetor(setor, { incluirInativos = false } = {}) {
    const snap = await getDocs(query(collection(db, 'funcionarios'), where('setor', '==', setor)));
    return snap.docs.map(comId).filter((f) => incluirInativos || f.ativo).sort(porNome);
  }

  /** Só o chefe: todos os setores. */
  async function todosFuncionarios() {
    const snap = await getDocs(collection(db, 'funcionarios'));
    return snap.docs.map(comId).sort(porNome);
  }

  /** Só o chefe. Nome único (sem diferenciar maiúsculas) dentro do setor. */
  async function salvarFuncionario({ id, setor, nome, ativo = true }) {
    if (!SETORES[setor]) throw new Error('Setor: escolha um setor da lista.');
    const limpo = lerNome(nome);
    const doSetor = await funcionariosDoSetor(setor, { incluirInativos: true });
    const repetido = doSetor.find((f) => f.id !== id && normalizar(f.nome) === normalizar(limpo));
    if (repetido) throw new Error(`Nome: já existe "${repetido.nome}" em ${SETORES[setor].nome}.`);
    const dados = { setor, nome: limpo, ativo: Boolean(ativo) };
    if (id) await updateDoc(doc(db, 'funcionarios', id), dados);
    else id = (await addDoc(collection(db, 'funcionarios'), dados)).id;
    return { id, ...dados };
  }

  // ---- Respostas --------------------------------------------------------------------
  /** Map itemId -> resposta, de um setor, dia e turno. */
  async function respostasDoTurno(setor, data, turno) {
    const snap = await getDocs(
      query(collection(db, 'respostas'), where('setor', '==', setor), where('data', '==', data), where('turno', '==', turno)),
    );
    return new Map(snap.docs.map((d) => [d.data().item, comId(d)]));
  }

  /**
   * Grava (ou troca) a resposta de um item. Se vier `imagem` (JPEG em data URL), a foto
   * é gravada no mesmo lote, como as regras exigem para "Sim" em item com (FOTO).
   * existente: a resposta atual desse item (de respostasDoTurno), se houver.
   */
  async function salvarResposta({ setor, data, turno, item, resposta, observacao = '', funcionario, existente = null, imagem = null }) {
    exigirHoje(data);
    if (!funcionario?.id) throw new Error('Quem está preenchendo: escolha o seu nome.');
    const temFoto = Boolean(imagem) || Boolean(existente?.tem_foto);
    validarResposta(setor, item, resposta, temFoto);
    const obs = String(observacao ?? '').trim();
    if (obs.length > 500) throw new Error('Observação: use no máximo 500 caracteres.');

    const id = idResposta(data, setor, turno, item);
    const lote = writeBatch(db);
    if (imagem) {
      lote.set(doc(db, 'fotos', id), { data, setor, turno, item, imagem, criado_em: serverTimestamp() });
    }
    const campos = {
      resposta,
      observacao: obs,
      funcionario_id: funcionario.id,
      funcionario: funcionario.nome,
      tem_foto: temFoto,
      atualizado_em: serverTimestamp(),
    };
    const ref = doc(db, 'respostas', id);
    if (existente) lote.update(ref, campos);
    else lote.set(ref, { data, setor, turno, item, ...campos, criado_em: serverTimestamp() });
    await lote.commit();

    const salvo = await getDoc(ref);
    return comId(salvo);
  }

  // ---- Painel do chefe (o chefe lê todos os setores) ---------------------------------
  async function respostasDoDia(data) {
    const snap = await getDocs(query(collection(db, 'respostas'), where('data', '==', data)));
    return snap.docs.map(comId);
  }

  async function observacoesDoDia(data) {
    const snap = await getDocs(query(collection(db, 'observacoes_turno'), where('data', '==', data)));
    return snap.docs.map(comId);
  }

  // ---- Limpeza: semana e avisos --------------------------------------------------
  // Só filtros de igualdade (setor, data/item em lista): não precisam de índice composto.

  /** Respostas da Limpeza nas datas pedidas (até 7, uma semana). */
  async function respostasLimpezaNasDatas(datas) {
    const snap = await getDocs(
      query(collection(db, 'respostas'), where('setor', '==', 'limpeza'), where('data', 'in', datas)),
    );
    return snap.docs.map(comId);
  }

  /** "Sim" do açougue e das câmaras frias guardados (até 30 dias), para os avisos. */
  async function registrosParaAvisos() {
    const snap = await getDocs(
      query(
        collection(db, 'respostas'),
        where('setor', '==', 'limpeza'),
        where('item', 'in', ['limp-acougue', 'limp-camaras']),
        where('resposta', '==', 'sim'),
      ),
    );
    return snap.docs.map(comId);
  }

  /** Imagem (data URL) da foto de uma resposta, ou null. Só baixa quando pedida. */
  async function fotoDe(idDaResposta) {
    const snap = await getDoc(doc(db, 'fotos', idDaResposta));
    return snap.exists() ? snap.data().imagem : null;
  }

  // ---- Retenção: apagar o que venceu ------------------------------------------------
  // As fotos são achadas pelas respostas (mesmo ID), sem baixar as imagens.

  const filtroSetor = (setor) => (setor ? [where('setor', '==', setor)] : []);

  /** Apaga um a um; um documento que já sumiu (outro aparelho apagou) não atrapalha. */
  async function apagarTodos(refs) {
    const resultados = await Promise.allSettled(refs.map((r) => deleteDoc(r)));
    return resultados.filter((r) => r.status === 'fulfilled').length;
  }

  async function apagarVencidos({ setor = null, datasFotos = [], datasRespostas = [] }) {
    let fotos = 0;
    let respostas = 0;
    let observacoes = 0;
    if (datasFotos.length) {
      const comFoto = await getDocs(
        query(collection(db, 'respostas'), ...filtroSetor(setor), where('data', 'in', datasFotos), where('tem_foto', '==', true)),
      );
      fotos += await apagarTodos(comFoto.docs.map((d) => doc(db, 'fotos', d.id)));
    }
    if (datasRespostas.length) {
      const velhas = await getDocs(query(collection(db, 'respostas'), ...filtroSetor(setor), where('data', 'in', datasRespostas)));
      // Foto de resposta velha que tenha escapado (ex.: app não aberto por semanas).
      fotos += await apagarTodos(velhas.docs.filter((d) => d.data().tem_foto).map((d) => doc(db, 'fotos', d.id)));
      respostas = await apagarTodos(velhas.docs.map((d) => d.ref));
      const obs = await getDocs(query(collection(db, 'observacoes_turno'), ...filtroSetor(setor), where('data', 'in', datasRespostas)));
      observacoes = await apagarTodos(obs.docs.map((d) => d.ref));
    }
    return { fotos, respostas, observacoes };
  }

  // ---- Observações gerais do turno --------------------------------------------------
  const idObservacao = (data, setor, turno) => `${data}_${setor}_${turno}`;

  async function observacaoDoTurno(setor, data, turno) {
    const snap = await getDoc(doc(db, 'observacoes_turno', idObservacao(data, setor, turno)));
    return snap.exists() ? snap.data() : null;
  }

  async function salvarObservacaoDoTurno({ setor, data, turno, texto, funcionario }) {
    exigirHoje(data);
    if (!funcionario?.nome) throw new Error('Quem está preenchendo: escolha o seu nome.');
    const limpo = String(texto ?? '').trim();
    if (limpo.length > 2000) throw new Error('Observações: use no máximo 2000 caracteres.');
    await setDoc(doc(db, 'observacoes_turno', idObservacao(data, setor, turno)), {
      data,
      setor,
      turno,
      texto: limpo,
      funcionario: funcionario.nome,
      atualizado_em: serverTimestamp(),
    });
  }

  return {
    funcionariosDoSetor,
    todosFuncionarios,
    salvarFuncionario,
    respostasDoTurno,
    salvarResposta,
    fotoDe,
    apagarVencidos,
    respostasLimpezaNasDatas,
    respostasDoDia,
    observacoesDoDia,
    registrosParaAvisos,
    observacaoDoTurno,
    salvarObservacaoDoTurno,
  };
}
