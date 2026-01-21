import { initializeApp, getApps } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

export const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];
