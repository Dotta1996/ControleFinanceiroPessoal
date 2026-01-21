// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
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
