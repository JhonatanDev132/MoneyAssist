import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth, database } from "~/service/firebase";
import { ref, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { formatarMoeda } from "~/service/analise/motor";

type DadosMes = { chave: string; mes: string; gastos: number; ganhos: number };

/** Soma valores por "AAAA-MM" a partir de um nó do Realtime Database. */
function somarPorMes(dados: Record<string, any>): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const g of Object.values(dados)) {
    const m = /^(\d{4})-(\d{2})/.exec(String(g?.data ?? ""));
    if (!m) continue;
    const chave = `${m[1]}-${m[2]}`;
    mapa.set(chave, (mapa.get(chave) ?? 0) + Number(g?.valor ?? 0));
  }
  return mapa;
}

export function GraficoBarra() {
  const [gastos, setGastos] = useState<Map<string, number>>(new Map());
  const [ganhos, setGanhos] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const off1 = onValue(ref(database, `usuarios/${user.uid}/gastos`), (s) => setGastos(somarPorMes(s.val() ?? {})));
    const off2 = onValue(ref(database, `usuarios/${user.uid}/ganhos`), (s) => setGanhos(somarPorMes(s.val() ?? {})), () => {});
    return () => { off1(); off2(); };
  }, []);

  const meses = Array.from(new Set([...gastos.keys(), ...ganhos.keys()])).sort().slice(-6);
  const data: DadosMes[] = meses.map((chave) => ({
    chave,
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${chave}-01T00:00:00`)).replace(".", ""),
    gastos: Number((gastos.get(chave) ?? 0).toFixed(2)),
    ganhos: Number((ganhos.get(chave) ?? 0).toFixed(2)),
  }));
  const temGanhos = data.some((d) => d.ganhos > 0);

  return (
    <section aria-labelledby="titulo-barra" className="w-full rounded-xl border border-surface-border bg-surface-dark p-4">
      <h2 id="titulo-barra" className="mb-1 text-lg font-semibold text-white">{temGanhos ? "Ganhos x gastos por mês" : "Gastos por mês"}</h2>
      {!temGanhos && data.length > 0 && <p className="mb-3 text-xs text-zinc-400">Registre seus ganhos para comparar com os gastos.</p>}

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">Os valores de cada mês aparecem aqui assim que você fizer o primeiro lançamento.</p>
      ) : (
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4} className="outline-none focus:outline-none [&_*]:outline-none">
              <CartesianGrid vertical={false} stroke="#8884" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} width={56}
                tickFormatter={(v) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1).replace(".0", "")}k` : String(v))} />
              <Tooltip cursor={{ fill: "rgba(136,136,136,0.12)" }} formatter={(v, nome) => [formatarMoeda(Number(v)), String(nome)]}
                contentStyle={{ backgroundColor: "var(--color-surface-dark)", borderColor: "var(--color-surface-border)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--color-white)" }} labelStyle={{ color: "#A1A1AA" }} />
              {temGanhos && <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
              {temGanhos && <Bar name="Ganhos" dataKey="ganhos" fill="#10B981" radius={[4, 4, 0, 0]} />}
              <Bar name="Gastos" dataKey="gastos" fill="#FFB800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
