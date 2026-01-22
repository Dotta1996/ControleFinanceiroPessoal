// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkLoi7cu_qLWiPTlHiNdh1-WpHIHrHCnA",
  authDomain: "controle-financeiro-pess-64800.firebaseapp.com",
  projectId: "controle-financeiro-pess-64800",
  storageBucket: "controle-financeiro-pess-64800.firebasestorage.app",
  messagingSenderId: "704824842865",
  appId: "1:704824842865:web:2871181735530a720659d0"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Seletores
const loginBtn = document.getElementById('google-login');
const logoutBtn = document.getElementById('logout');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const userPhoto = document.getElementById('user-photo');

// Login
loginBtn.addEventListener('click', () => {
  auth.signInWithPopup(provider)
    .then((result) => console.log('Usuário logado:', result.user))
    .catch((error) => console.error(error));
});

// Logout
logoutBtn.addEventListener('click', () => {
  auth.signOut()
    .then(() => console.log('Usuário deslogado'))
    .catch((error) => console.error(error));
});

// Detecta login/logout
auth.onAuthStateChanged((user) => {
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
