import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { auth, database } from "~/service/firebase";
import { analisarGastos, type Gasto } from "~/service/gemini";
import { GraficoBarra } from "~/components/graficoDeBarra";
import { GraficoPizza } from "~/components/graficoDePizza";

export default function VisaoGeral() {
  const [analise, setAnalise] = useState<string>("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>("");
  // Debounce: evita chamar a API a cada micro-atualização do Firebase
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const gastosRef = ref(database, `usuarios/${user.uid}/gastos`);

    const unsubscribe = onValue(gastosRef, (snapshot) => {
      const dados = snapshot.val() ?? {};
      const gastos: Gasto[] = Object.values(dados).map((gasto: any) => ({
        categoria: gasto.categoria ?? "Outros",
        valor: Number(gasto.valor ?? 0),
        data: gasto.data ?? "",
      }));

      // Cancela chamada pendente e aguarda 800ms de "silêncio" antes de chamar a API
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setCarregando(true);
        setErro("");

        try {
          const resultado = await analisarGastos(gastos);
          setAnalise(resultado);
        } catch (err) {
          const mensagemErro = err instanceof Error ? err.message : String(err);
          setErro(`Erro: ${mensagemErro}`);
          console.error("❌ Erro detalhado ao analisar gastos:", err);
        } finally {
          setCarregando(false);
        }
      }, 800);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="w-full flex flex-col min-h-screen bg-bg-dark p-5">
      <h1 className="pb-5">Seja bem-vindo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 place-content-around sm:items-center">
        <GraficoPizza />

        <div>
          <h1 className="pb-5">Análise da IA ✨</h1>

          <div className="w-full h-full lg:h-69 bg-surface-dark border border-surface-border rounded-xl p-4">
            {carregando ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full" />
                <span>Analisando seus gastos...</span>
              </div>
            ) : erro ? (
              <p className="text-red-400">{erro}</p>
            ) : analise ? (
              <p className="text-white leading-relaxed">{analise}</p>
            ) : (
              <p className="text-zinc-400">Faça login para ver a análise dos seus gastos.</p>
            )}
          </div>
        </div>

        <GraficoBarra />
      </div>
    </div>
  );
}
