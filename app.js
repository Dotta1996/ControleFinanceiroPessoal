// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyBkLoi7cu_qLWiPTlHiNdh1-WpHIHrHCnA",
  authDomain: "controle-financeiro-pess-64800.firebaseapp.com",
  projectId: "controle-financeiro-pess-64800",
  storageBucket: "controle-financeiro-pess-64800.firebasestorage.app",
  messagingSenderId: "704824842865",
  appId: "1:704824842865:web:2871181735530a720659d0"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Seletores
const loginBtn = document.getElementById('google-login');
const logoutBtn = document.getElementById('logout');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const userPhoto = document.getElementById('user-photo');

// Login com Google
loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log('Usuário logado:', result.user);
    })
    .catch((error) => {
      console.error(error);
    });
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => console.log('Usuário deslogado'))
    .catch((error) => console.error(error));
});

// Detectar mudança de estado de login
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'block';
    userName.textContent = `Olá, ${user.displayName}`;
    userPhoto.src = user.photoURL;
  } else {
    loginBtn.style.display = 'block';
    userInfo.style.display = 'none';
  }
});
