import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { auth, database } from "~/service/firebase";
import { ref, onValue } from "firebase/database";
import { useEffect, useState } from "react";

type DadosMes = {
  mes: string;
  gasto: number;
};

export function GraficoBarra() {
  const [data, setData] = useState<DadosMes[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const gastosRef = ref(database, `usuarios/${user.uid}/gastos`);

    const unsubscribe = onValue(gastosRef, (snapshot) => {
      const dados = snapshot.val() ?? {};
      const gastos = Object.entries(dados).map(([id, gasto]: any) => ({
        id,
        ...gasto,
      }));
      
      const totalPorMes = new Map<string, number>();

      gastos.forEach((gasto) => {
        const dataStr = gasto.dataIso || gasto.data;

        if (!dataStr) return;

        const dataObj = new Date(
          dataStr.includes("-")
            ? `${dataStr}T00:00:00`
            : `${dataStr}T00:00:00`
        );

        if (Number.isNaN(dataObj.getTime())) return;

        const chave = `${dataObj.getFullYear()}-${String(
          dataObj.getMonth() + 1
        ).padStart(2, "0")}`;
        const valor = Number(gasto.valor ?? 0);

        totalPorMes.set(chave, (totalPorMes.get(chave) ?? 0) + valor);
      });

      const resultado = Array.from(totalPorMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chave, total]) => {
          const dataObj = new Date(`${chave}-01T00:00:00`);
          return {
            mes: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(dataObj),
            gasto: Number(total.toFixed(2)),
          };
        });

      setData(resultado);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-64 bg-surface-dark border border-surface-border rounded-xl p-4">
      <h3 className="text-white text-lg font-medium mb-4">Gastos por Mês</h3>
      
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} className="outline-none focus:outline-none [&_*]:outline-none bg">
          <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={12} tickLine={false} />
          <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#121214", 
              borderColor: "#2E2E3A", 
              borderRadius: "8px", 
              color: "#FFF" 
            }} 
          />
          
          <Bar dataKey="gasto" fill="#FFB800" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}