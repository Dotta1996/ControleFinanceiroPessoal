
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

/**
 * CONFIGURAÇÃO DO FIREBASE
 * Para que o login com Google funcione no GitHub Pages:
 * 1. Vá ao Console do Firebase > Authentication > Settings > Authorized domains.
 * 2. Adicione o seu domínio do GitHub Pages (ex: seunome.github.io).
 */
const firebaseConfig = {
  apiKey: "AIzaSyBkLoi7cu_qLWiPTlHiNdh1-WpHIHrHCnA",
  authDomain: "controle-financeiro-pess-64800.firebaseapp.com",
  projectId: "controle-financeiro-pess-64800",
  storageBucket: "controle-financeiro-pess-64800.firebasestorage.app",
  messagingSenderId: "704824842865",
  appId: "1:704824842865:web:2871181735530a720659d0"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default firebase;
