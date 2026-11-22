import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "~/service/firebase";
import { AuthShell, Campo, Spinner, classeBotaoPrimario, classeBotaoSecundario, classeInput, mensagemErroAuth } from "~/components/ui";

export default function LoginRoute() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState<"" | "email" | "google">("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/");
    });
    return unsubscribe;
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) return setErro("Preencha o e-mail e a senha.");
    setErro("");
    setEnviando("email");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      navigate("/");
    } catch (e) {
      setErro(mensagemErroAuth(e, "Não foi possível entrar. Tente novamente."));
      setEnviando("");
    }
  }

  async function handleGoogleLogin() {
    setErro("");
    setEnviando("google");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate("/");
    } catch (e) {
      setErro(mensagemErroAuth(e, "Não foi possível entrar com o Google."));
      setEnviando("");
    }
  }

  const ocupado = enviando !== "";

  return (
    <AuthShell titulo="Bem-vindo de volta" subtitulo="Entre para acompanhar seus gastos">
      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
        <Campo id="email" rotulo="E-mail">
          <input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={classeInput} disabled={ocupado} />
        </Campo>

        <Campo id="senha" rotulo="Senha">
          <div className="relative">
            <input id="senha" type={mostrarSenha ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha"
              value={senha} onChange={(e) => setSenha(e.target.value)} className={`${classeInput} pr-16`} disabled={ocupado} />
            <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-pressed={mostrarSenha}
              className="absolute inset-y-0 right-2 my-auto h-8 rounded px-2 text-xs font-medium text-zinc-400 hover:text-white">
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </Campo>

        {erro && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}

        <button type="submit" disabled={ocupado} className={classeBotaoPrimario}>
          {enviando === "email" && <Spinner />} {enviando === "email" ? "Entrando..." : "Entrar"}
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-surface-border" /> ou <span className="h-px flex-1 bg-surface-border" />
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={ocupado} className={classeBotaoSecundario}>
          {enviando === "google" && <Spinner />} Continuar com Google
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-300">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-semibold text-brand-yellow hover:underline">Cadastre-se</Link>
      </p>
    </AuthShell>
  );
}
