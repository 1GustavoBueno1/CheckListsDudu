// Ponto de entrada: toda tela exige login. Cada conta vai para a sua tela.
// Fontes servidas pelo próprio app (sem Google Fonts).
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './estilo.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase.js';
import { trocar } from './dom.js';
import { destinoDe } from './destino.js';
import { criarRepositorio } from './repositorio.js';
import { limparVencidos } from './retencao.js';
import { diaSP } from './regras.js';
import { telaLogin } from './telas/login.js';
import { telaApp } from './telas/app.js';

const raiz = document.getElementById('app');

let limpezaAgendada = null;

onAuthStateChanged(auth, (usuario) => {
  clearTimeout(limpezaAgendada);
  if (!usuario) {
    trocar(raiz, telaLogin());
    return;
  }
  // Repositório novo a cada login: nada da sessão anterior é reaproveitado.
  const repo = criarRepositorio(db);
  const destino = destinoDe(usuario.uid);
  trocar(raiz, telaApp(destino, repo));

  // Apaga fotos (7 dias) e respostas (30 dias) vencidas, em segundo plano, depois que a
  // tela já abriu. Falhas não atrapalham o uso: só aparecem no console.
  if (destino.tela === 'setor' || destino.tela === 'chefe') {
    limpezaAgendada = setTimeout(() => {
      limparVencidos(repo, { setor: destino.tela === 'setor' ? destino.setor : null, hoje: diaSP() })
        .then((r) => {
          if (r.fotos || r.respostas || r.observacoes) console.info('Dados vencidos apagados:', r);
        })
        .catch((e) => console.warn('Não foi possível apagar dados vencidos agora:', e));
    }, 3000);
  }
});
