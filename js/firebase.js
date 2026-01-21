import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBkLoi7cu_qLWiPTlHiNdh1-WpHIHrHCnA",
  authDomain: "controle-financeiro-pess-64800.firebaseapp.com",
  projectId: "controle-financeiro-pess-64800",
  storageBucket: "controle-financeiro-pess-64800.firebasestorage.app",
  messagingSenderId: "704824842865",
  appId: "1:704824842865:web:2871181735530a720659d0"
};

// 🔒 Só inicializa se ainda não existir
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export { app };

