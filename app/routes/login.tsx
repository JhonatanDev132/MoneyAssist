import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router";


import { auth } from "~/service/firebase";

export default function LoginRoute() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) navigate("/");
        });
            return unsubscribe;
    }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos");
    }
  }

  async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      setErro("Não foi possível entrar com o Google");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-dark">
      <form onSubmit={handleLogin} className="bg-surface-dark border border-surface-border p-8 rounded-lg w-80 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-brand-yellow text-center">Money Assist</h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded bg-bg-dark border border-surface-border text-white"
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="p-2 rounded bg-bg-dark border border-surface-border text-white"
        />

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button type="submit" className="bg-brand-yellow font-bold p-2 rounded text-black">
          Entrar
        </button>

        <div className="flex items-center my-1">
          <div className="flex-grow border-t border-surface-border"></div>
          <span className="mx-2 text-xs text-gray-400">ou</span>
          <div className="flex-grow border-t border-surface-border"></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          className="border border-surface-border p-2 rounded font-bold text-white hover:bg-neutral-800 transition-colors"
        >
          Entrar com Google
        </button>
        <p className="text-sm text-center text-white">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="text-brand-yellow font-bold hover:underline">
                Cadastre-se
            </Link>
        </p>
      </form>
    </div>
  );
}
