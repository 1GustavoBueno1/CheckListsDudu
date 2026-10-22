// Itens de cada setor, copiados dos PDFs da Dudu Bebidas. Os IDs nunca mudam: eles fazem
// parte do ID das respostas no Firestore. Para mudar um texto, mude só o texto.
// foto: true = item marcado com (FOTO) no PDF ("Sim" exige foto).

export const TURNOS = { almoco: 'Almoço', noite: 'Noite', dia: 'Dia' };

const item = (id, texto, foto) => ({ id, texto, foto });

export const LIMPEZA_GERAL = item('limp-geral', 'Limpeza geral', true);
export const LIMPEZA_MAQUINA = item('limp-maquina', 'A máquina de lavar está limpa e brilhando?', true);
/** Itens que a Limpeza faz todos os dias, além da atividade do dia. */
export const LIMPEZA_DIARIA = [LIMPEZA_GERAL, LIMPEZA_MAQUINA];

// diaSemana: 0 = domingo ... 6 = sábado (cronograma semanal do PDF da Limpeza).
export const ATIVIDADES_LIMPEZA = [
  { ...item('limp-banheiros', 'Faxina nos banheiros', true), diaSemana: 1 },
  { ...item('limp-camaras', 'Câmaras frias do açougue', true), diaSemana: 2 },
  { ...item('limp-vidros', 'Vidros', true), diaSemana: 3 },
  { ...item('limp-depositos', 'Depósitos', true), diaSemana: 4 },
  { ...item('limp-externa', 'Limpeza externa', true), diaSemana: 5 },
  { ...item('limp-acougue', 'Açougue e churrasqueira', true), diaSemana: 6 },
  { ...item('limp-revisao', 'Revisão da limpeza e organização', true), diaSemana: 0 },
];

export const LEMBRETES_LIMPEZA = [
  'A limpeza geral e a máquina de lavar devem ser feitas todos os dias, além da atividade do dia.',
  'O açougue e a churrasqueira devem ser lavados (chão, paredes e teto) no mínimo 1 vez por semana.',
  'As câmaras frias do açougue devem ser higienizadas internamente a cada 15 dias.',
  'As atividades podem mudar de dia, desde que todas sejam feitas na semana.',
  'O chão e o vidro do buffet são responsabilidade do setor de limpeza.',
  'Tirar 1 foto de cada atividade feita.',
];

export const SETORES = {
  cozinha: {
    nome: 'Cozinha',
    titulo: 'Checklist da cozinha — geral',
    turnos: ['almoco', 'noite'],
    secoes: [
      {
        titulo: null,
        itens: [
          item('coz-01', 'Os pratos e garfos foram higienizados?', true),
          item('coz-02', 'O chão do acesso e da cozinha está limpo?', true),
          item('coz-03', 'As bancadas de mármore estão limpas?', true),
          item('coz-04', 'O pote dos garfos e facas está cheio?', true),
          item('coz-05', 'As 2 pilhas de pratos estão cheias?', true),
          item('coz-06', 'Há guardanapo, palito, sal, vinagre e azeite de oliva?', true),
          item('coz-07', 'Os pegadores e colheres estão em perfeitas condições?', true),
          item('coz-08', 'A revisão no buffet está sendo feita a cada 15 min?', false),
          item('coz-09', 'A câmara fria 6 portas está limpa e organizada?', true),
          item('coz-10', 'As bancadas de inox estão limpas e brilhando?', true),
          item('coz-11', 'O fogão a gás e a chapa estão limpos e brilhando?', true),
          item('coz-12', 'As mesas da cozinha estão limpas (em cima e embaixo)?', true),
          item('coz-13', 'A fritadeira está limpa e com óleo trocado (se necessário)?', true),
          item('coz-14', 'A coifa e o exaustor estão limpos e brilhando?', true),
          item('coz-15', 'O freezer está limpo (interno e externo)?', true),
          item('coz-16', 'Os vidros e janelas estão limpos?', true),
          item('coz-17', 'Os alimentos estão organizados?', true),
          item('coz-18', 'Os utensílios e produtos de limpeza estão completos? (Se faltar algum, anotar qual em Observação.)', false),
          item('coz-19', 'O controle de estoque está em dia, sem faltar produtos e usando antes da data de vencimento?', false),
          // Itens acrescentados depois dos PDFs (pedido do chefe).
          item('coz-20', 'A bacia de espátulas, pegadores e colheres está organizada e limpa?', true),
          item('coz-21', 'O processador está limpo e brilhando?', true),
          item('coz-22', 'A batedeira está limpa e brilhando?', true),
          item('coz-23', 'A bancada de lanches está limpa e brilhando?', true),
          item('coz-24', 'Os alimentos estão guardados com identificação?', true),
        ],
      },
    ],
  },
  garcons: {
    nome: 'Garçons',
    titulo: 'Checklist de organização dos garçons',
    turnos: ['almoco', 'noite'],
    secoes: [
      {
        titulo: '1. Antes de abrir o restaurante',
        itens: [
          item('gar-01', 'O salão está limpo e organizado?', true),
          item('gar-02', 'As mesas, cadeiras e bancos foram limpos?', true),
          item('gar-03', 'Todas as mesas estão alinhadas?', true),
          item('gar-04', 'O chão está limpo e seco?', true),
          item('gar-05', 'Os cardápios e materiais de atendimento estão organizados?', true),
          item('gar-06', 'Há copos, talheres e pratos limpos disponíveis?', true),
          item('gar-07', 'A área externa e a entrada estão organizadas?', true),
          // Itens acrescentados depois dos PDFs (pedido do chefe).
          item('gar-23', 'O painel de LED está ligado, com som ambiente?', true),
          item('gar-24', 'A porta lateral está aberta?', true),
          item('gar-25', 'As mesas externas e as cadeiras estão limpas?', true),
        ],
      },
      {
        titulo: '2. Durante o atendimento',
        itens: [
          item('gar-08', 'A cozinha foi informada sobre as observações e restrições dos pedidos?', false),
          item('gar-09', 'Os pedidos foram acompanhados e os possíveis atrasos comunicados?', false),
          item('gar-10', 'Os pratos e bebidas foram servidos com cuidado?', false),
          item('gar-11', 'Cada pedido entregue correspondia à mesa correta?', false),
          item('gar-12', 'Foi verificado se os clientes precisavam de algo durante a refeição?', false),
          item('gar-13', 'Os pratos, copos e utensílios usados foram retirados quando apropriado?', false),
          item('gar-14', 'As mesas foram limpas e reorganizadas após a saída dos clientes?', true),
          item('gar-15', 'O salão foi mantido organizado, inclusive nos horários de movimento?', true),
          item('gar-16', 'Reclamações e problemas foram comunicados ao responsável?', false),
        ],
      },
      {
        titulo: '3. Organização de bebidas e materiais',
        itens: [
          item('gar-17', 'As bebidas de serviço estão organizadas?', true),
          item('gar-18', 'As geladeiras e expositores estão organizados conforme a orientação da casa?', true),
          item('gar-19', 'O responsável foi avisado sobre os produtos que estão acabando?', false),
          item('gar-20', 'Os copos e taças estão limpos e guardados corretamente?', true),
          item('gar-21', 'O salão está sem caixas, garrafas ou materiais espalhados?', true),
          item('gar-22', 'A estação de serviço está limpa e abastecida?', true),
        ],
      },
      {
        titulo: '4. Fechamento',
        itens: [item('gar-26', 'Os lixos do exterior e do interior foram recolhidos?', true)],
      },
    ],
  },
  conveniencia: {
    nome: 'Conveniência',
    titulo: 'Checklist da conveniência / caixa',
    turnos: ['almoco', 'noite'],
    secoes: [
      {
        titulo: null,
        itens: [
          item('conv-01', 'As prateleiras estão repostas?', true),
          item('conv-02', 'O balcão do caixa está organizado?', true),
          item('conv-03', 'As geladeiras estão limpas e repostas para a demanda alta?', true),
          item('conv-04', 'As máquinas de cartão estão carregadas?', false),
          item('conv-05', 'Os computadores e as impressoras estão funcionando corretamente?', false),
          item('conv-06', 'As prateleiras estão limpas? Produtos sem poeira?', true),
          item('conv-07', 'A adega de vinho está limpa e devidamente reposta?', true),
          item('conv-08', 'A bancada do café está limpa e organizada?', true),
          item('conv-09', 'Você pegou seu turno organizado?', false),
          item('conv-10', 'A parte externa da frente está limpa? (calçada, mesas, calçamento)', true),
          item('conv-11', 'O estacionamento está sem lixo?', true),
          item('conv-12', 'O depósito da conveniência está organizado?', true),
        ],
      },
    ],
  },
  churrasco: {
    nome: 'Churrasco',
    titulo: 'Checklist do churrasco',
    turnos: ['almoco', 'noite'],
    secoes: [
      {
        titulo: null,
        itens: [
          item('chur-01', 'A churrasqueira está limpa?', true),
          item('chur-02', 'A câmara fria está limpa e organizada?', true),
          item('chur-03', 'Os balcões de inox e mármore estão limpos?', true),
        ],
      },
    ],
  },
  limpeza: {
    nome: 'Limpeza',
    titulo: 'Setor limpeza — cronograma semanal',
    turnos: ['dia'],
    secoes: [
      { titulo: 'Todos os dias', itens: LIMPEZA_DIARIA },
      { titulo: 'Atividades da semana', itens: ATIVIDADES_LIMPEZA },
    ],
  },
};

/** Todos os itens de um setor, na ordem do PDF. */
export function itensDoSetor(setor) {
  return SETORES[setor].secoes.flatMap((s) => s.itens);
}
