// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Config do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyBkLoi7cu_qLWiPTlHiNdh1-WpHIHrHCnA",
  authDomain: "controle-financeiro-pess-64800.firebaseapp.com",
  projectId: "controle-financeiro-pess-64800",
  storageBucket: "controle-financeiro-pess-64800.firebasestorage.app",
  messagingSenderId: "704824842865",
  appId: "1:704824842865:web:2871181735530a720659d0"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Botão
document.getElementById('btnGoogle').onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Logado:", user.email);

    // redireciona após login
    window.location.href = "index.html";

  } catch (err) {
    alert("Erro ao logar");
    console.error(err);
  }
};
