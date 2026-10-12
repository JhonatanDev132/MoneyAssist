import { useState } from "react";
import { useNavigate } from "react-router";
import { ref, push, set } from "firebase/database";
import { auth, database } from "~/service/firebase"; 

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Registrar() {
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [outraCategoria, setOutraCategoria] = useState("");
  const [data, setData] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Usuário não autenticado. Por favor, faça login.");
      return;
    }

    const categoriaFinal = categoria === "outros" ? outraCategoria : categoria;

    const gasto = {
      valor: Number(valor.replace(/\D/g, "")) / 100,
      categoria: categoriaFinal,
      data,
      criadoEm: Date.now(),
    };

    const gastoRef = ref(database, `usuarios/${user.uid}/gastos`);
    const novoGastoRef = push(gastoRef);

    await set(novoGastoRef, gasto);

    navigate("/");
  }
  
  return (
    <div className="w-full h-64 min-h-screen bg-bg-dark p-5">
      <h1 className="text-white text-lg font-medium mb-4">
        Registrar Gastos
      </h1>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label htmlFor="valor" className="text-white mb-1">
            Valor
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="valor"
            name="Valor"
            className="bg-surface-dark border border-surface-border rounded p-1 text-white"
            value={valor}
            onChange={(e) => {
              const digitos = e.target.value.replace(/\D/g, "");
              setValor(
                digitos
                  ? formatadorMoeda.format(Number(digitos) / 100)
                  : "",
              );
            }}
          />
          
          <label htmlFor="categoria" className="text-white mb-1 mt-2">
            Qual categoria esse gasto se encaixa?
          </label>

          <select
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="bg-surface-dark border border-surface-border rounded p-1 text-white"
          >
            <option value="">Selecione uma categoria</option>
            <option value="alimentacao">Alimentação</option>
            <option value="transporte">Transporte</option>
            <option value="lazer">Lazer</option>
            <option value="saude">Saúde</option>
            <option value="educacao">Educação</option>
            <option value="outros">Outros</option>
          </select>

          {categoria === "outros" && (
            <input
              type="text"
              id="outraCategoria"
              name="outraCategoria"
              placeholder="Especifique a categoria"
              value={outraCategoria}
              onChange={(e) => setOutraCategoria(e.target.value)}
              className="bg-surface-dark border border-surface-border rounded p-2 text-white mt-2"
            />
          )}

          <label htmlFor="data" className="text-white mb-1 mt-2">
            Data
          </label>

          <input
            type="date"
            id="data"
            name="data"
            lang="pt-BR"
            className="bg-surface-dark border border-surface-border rounded p-1 text-white"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <button
            type="submit"
            className="mt-4 bg-brand-yellow text-surface-dark rounded p-2 hover:opacity-90 transition-opacity"
          >
            Registrar Gasto
          </button>
        </div>
      </form>
    </div>
  )
}