import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/service/firebase";
import { AuthShell, Campo, Spinner, classeBotaoPrimario, classeInput, mensagemErroAuth } from "~/components/ui";

export default function CadastroRoute() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setErro("Digite seu e-mail.");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    setErro("");
    setEnviando(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), senha);
      navigate("/");
    } catch (e) {
      setErro(mensagemErroAuth(e, "Não foi possível criar a conta. Tente novamente."));
      setEnviando(false);
    }
  }

  return (
    <AuthShell titulo="Criar conta" subtitulo="Comece a controlar seus gastos em segundos">
      <form onSubmit={handleCadastro} noValidate className="flex flex-col gap-4">
        <Campo id="email" rotulo="E-mail">
          <input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={classeInput} disabled={enviando} />
        </Campo>

        <Campo id="senha" rotulo="Senha" dica="Mínimo de 6 caracteres.">
          <div className="relative">
            <input id="senha" type={mostrarSenha ? "text" : "password"} autoComplete="new-password" placeholder="Crie uma senha"
              value={senha} onChange={(e) => setSenha(e.target.value)} className={`${classeInput} pr-16`} disabled={enviando} />
            <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-pressed={mostrarSenha}
              className="absolute inset-y-0 right-2 my-auto h-8 rounded px-2 text-xs font-medium text-zinc-400 hover:text-white">
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </Campo>

        {erro && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}

        <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
          {enviando && <Spinner />} {enviando ? "Criando conta..." : "Cadastrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-300">
        Já tem conta?{" "}
        <Link to="/login" className="font-semibold text-brand-yellow hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
