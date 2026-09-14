import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { mes: "Jan", gasto: 2400 },
  { mes: "Fev", gasto: 1398 },
  { mes: "Mar", gasto: 3200 },
  { mes: "Abr", gasto: 2800 },
];

export function GraficoBarra() {
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
          
          {/* Usa o seu amarelo da marca para as barras */}
          <Bar dataKey="gasto" fill="#FFB800" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}