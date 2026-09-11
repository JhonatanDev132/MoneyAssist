import { useState } from "react";
import { useNavigate } from "react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/service/firebase";

export default function CadastroRoute() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      navigate("/");
    } catch {
      setErro("Não foi possível criar a conta");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-dark">
      <form
        onSubmit={handleCadastro}
        className="bg-surface-dark border border-surface-border p-8 rounded-lg w-80 flex flex-col gap-4"
      >
        <h1 className="text-xl font-bold text-brand-yellow text-center">Criar conta</h1>

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

        <button type="submit" className="bg-brand-yellow font-bold p-2 rounded">
          Cadastrar
        </button>
      </form>
    </div>
  );
}