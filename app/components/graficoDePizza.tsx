import { useState, useEffect } from 'react';
import { auth, database } from '~/service/firebase';
import { ref, onValue } from 'firebase/database';
import { formatarMoeda, rotuloCategoria } from '~/service/analise/motor';

import { 
  Pie, 
  PieChart, 
  Sector, 
  Cell,
  type PieSectorDataItem, 
  Tooltip, 
  type TooltipIndex,
  type PieProps,
  ResponsiveContainer
} from 'recharts';


const COLORS = ['#FFB800', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#F97316', '#14B8A6', '#EAB308', '#6366F1', '#EC4899'];

const renderActiveShape = (props: PieSectorDataItem) => {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle, endAngle, fill, payload, percent = 0, value = 0 } = props;
  return (
    <g>
      <text x={cx} y={cy} dy={-8} textAnchor="middle" fill="#A1A1AA" fontSize={13}>{rotuloCategoria(String(payload.categoria))}</text>
      <text x={cx} y={cy} dy={14} textAnchor="middle" style={{ fill: "var(--color-white)" }} fontSize={18} fontWeight={700}>{formatarMoeda(Number(value))}</text>
      <text x={cx} y={cy} dy={34} textAnchor="middle" fill="#A1A1AA" fontSize={12}>{(percent * 100).toFixed(1)}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
    </g>
  );
};

export function GraficoPizza({
  isAnimationActive = true,
  defaultIndex = undefined,
}: {
  isAnimationActive?: boolean;
  defaultIndex?: TooltipIndex;
}) {
  const [dadosPizza, setDadosPizza] = useState<{ categoria: string; gasto: number }[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const gastosRef = ref(database, `usuarios/${user.uid}/gastos`);

    const unsubscribe = onValue(gastosRef, (snapshot) => {
      const dados = snapshot.val() ?? {};

      const agrupado: Record<string, number> = {};
      const agora = new Date();
      const anoAtual = agora.getFullYear();
      const mesAtual = agora.getMonth() + 1;

      Object.values(dados).forEach((gasto: any) => {
        if (typeof gasto.data !== "string") return;

        const data = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gasto.data);
        if (!data) return;

        const ano = Number(data[1]);
        const mes = Number(data[2]);
        if (ano !== anoAtual || mes !== mesAtual) return;

        const valor = Number(gasto.valor ?? 0);
        const categoria = gasto.categoria ?? "Outros";
        agrupado[categoria] = (agrupado[categoria] || 0) + valor;
      });

      const resultado = Object.entries(agrupado).map(([categoria, gasto]) => ({
        categoria,
        gasto: Number(gasto.toFixed(2)),
      }));
      setDadosPizza(resultado);
    });
    
    return () => unsubscribe();

  }, [])

  const total = dadosPizza.reduce((t, d) => t + d.gasto, 0);
  const ativo = activeIndex ?? undefined;

  return (
    <section aria-labelledby="titulo-pizza" className="w-full rounded-xl border border-surface-border bg-surface-dark p-4">
      <h2 id="titulo-pizza" className="mb-3 text-lg font-semibold text-white">Gastos por categoria</h2>

      {dadosPizza.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">Registre um gasto para ver a divisão por categoria.</p>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart className="outline-none focus:outline-none [&_*]:outline-none">
                <Pie
                  data={dadosPizza} cx="50%" cy="50%" innerRadius="62%" outerRadius="82%" dataKey="gasto" nameKey="categoria"
                  isAnimationActive={isAnimationActive}
                  {...(ativo !== undefined && { activeIndex: ativo })}
                  activeShape={renderActiveShape as PieProps['activeShape']}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onClick={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {dadosPizza.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={() => null} defaultIndex={defaultIndex} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {dadosPizza.map((d, i) => (
              <li key={d.categoria}>
                <button type="button" onClick={() => setActiveIndex(i)} onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover">
                  <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate text-zinc-200">{rotuloCategoria(d.categoria)}</span>
                  <span className="text-zinc-400">{total > 0 ? Math.round((d.gasto / total) * 100) : 0}%</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
