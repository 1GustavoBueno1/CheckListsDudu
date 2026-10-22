// Quem é quem: UID da conta (Firebase Authentication) -> papel. Os mesmos UIDs estão nas
// regras do Firestore (firestore.rules); um teste confere que os dois batem.
// Ao trocar uma conta, troque aqui e nas regras.
export const CONTAS = {
  ScjaryIu84Y5IzTqSC9trkmGhsI2: { papel: 'setor', setor: 'cozinha' },
  NVErpPpmVHdlzlXwfTZfZFEmSMy1: { papel: 'setor', setor: 'garcons' },
  jLYSnaK3MHdTeKSgGZhs6W9D9b92: { papel: 'setor', setor: 'conveniencia' },
  '8r2CdyO1AOTmvEVRpEE4PABPf882': { papel: 'setor', setor: 'limpeza' },
  zzl18k81Ere6FYF0C2L3bgr7g4P2: { papel: 'setor', setor: 'churrasco' },
  ydNKFosdWkMMaVIxs1WuxwJdIwy2: { papel: 'chefe' },
};

/** Papel da conta logada, ou null se a conta não é do sistema. */
export const contaDe = (uid) => (uid && Object.hasOwn(CONTAS, uid) ? { ...CONTAS[uid] } : null);
