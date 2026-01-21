import { getAuth, GoogleAuthProvider, signInWithPopup }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { app } from "./firebase.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.getElementById("loginGoogle").onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    alert(`Bem-vindo ${result.user.displayName}`);
  } catch (e) {
    console.error(e);
    alert("Erro no login");
  }
};
