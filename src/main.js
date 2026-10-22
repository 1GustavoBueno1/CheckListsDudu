// Ponto de entrada: toda tela exige login. Cada conta vai para a sua tela.
// Fontes servidas pelo próprio app (sem Google Fonts).
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './estilo.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import { trocar } from './dom.js';
import { destinoDe } from './destino.js';
import { telaLogin } from './telas/login.js';
import { telaApp } from './telas/app.js';

const raiz = document.getElementById('app');

onAuthStateChanged(auth, (usuario) => {
  trocar(raiz, usuario ? telaApp(destinoDe(usuario.uid)) : telaLogin());
});
