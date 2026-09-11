import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyDBX_wQQLh-_g_2k31Fzmr4AqcXyEuzCRU",
  authDomain: "moneyassist-36bdc.firebaseapp.com",
  projectId: "moneyassist-36bdc",
  storageBucket: "moneyassist-36bdc.firebasestorage.app",
  messagingSenderId: "1037786084305",
  appId: "1:1037786084305:web:182bcd16090397b4d066f0"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporte o app e os serviços para usar em outros componentes
export default app;
export const auth = getAuth(app);