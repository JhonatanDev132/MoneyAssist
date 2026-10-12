import { useEffect, useState } from "react";
import { ref, onValue, remove } from "firebase/database";
import { auth, database } from "~/service/firebase";

export async function loader() {
  return null;
}

export default function ListarGastos() {
  const [gastos, setGastos] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const gastosRef = ref(database, `usuarios/${user.uid}/gastos`);

    const unsubscribe = onValue(gastosRef, (snapshot) => {
      const dados = snapshot.val() ?? {};
      const lista = Object.entries(dados).map(([id, gasto]: any) => ({
        id,
        ...gasto,
      }));
      setGastos(lista);
    });

    return () => unsubscribe();
  }, []);

  async function excluir(id: string) {
    const user = auth.currentUser;
    if (!user) return;

    await remove(ref(database, `usuarios/${user.uid}/gastos/${id}`));
  }

  const dados = gastos.map((gasto) => ({
    ...gasto,
    dataIso: gasto.data ? new Date(gasto.data).toISOString() : null,
  }));

  const listaOrdenada = Object.entries(dados)
  .map(([id, gasto]: any) => ({ id, ...gasto }))
  .sort((a, b) => {
    const dataA = new Date(a.dataIso || a.data).getTime();
    const dataB = new Date(b.dataIso || b.data).getTime();
    return dataB - dataA;
  });

  return (
    <div className="w-full h-64 min-h-screen bg-bg-dark p-5">
      {listaOrdenada.map((gasto) => (
        <div className="bg-surface-dark border border-surface-border rounded p-2 text-white grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-4 w-full mb-4" key={gasto.id}>
          <span>{gasto.categoria}:</span>
          <span>R$ {gasto.valor.toFixed(2)}</span>
          <span>{gasto.data || "Sem data"}</span>
          <button onClick={() => excluir(gasto.id)} className="bg-red-500 text-white px-4 py-2 rounded ml-2">
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}