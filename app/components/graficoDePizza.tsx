import { useState, useEffect } from 'react';
import { auth, database } from '~/service/firebase';
import { ref, onValue } from 'firebase/database';

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
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
    payload,
    percent = 0,
    value = 0,
  } = props;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 50;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>

      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#FFFFFF" className="font-semibold text-sm">
        {payload.categoria}
      </text>

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />

      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />

      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#FFFFFF">
        {`R$ ${Number(value).toFixed(2)}`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#A1A1AA" fontSize={12}>
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
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

      Object.values(dados).forEach((gasto: any) => {
        const valor = Number(gasto.valor ?? 0);
        agrupado[gasto.categoria] = (agrupado[gasto.categoria] || 0) + valor;
      });

      const resultado = Object.entries(agrupado).map(([categoria, gasto]) => ({
        categoria,
        gasto: Number(gasto.toFixed(2)),
      }));
      setDadosPizza(resultado);
    });
    
    return () => unsubscribe();

  }, [])

  return (
    <div className="w-full h-85 min-h-[300px] bg-surface-dark rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart
          className="outline-none focus:outline-none [&_*]:outline-none bg"
          margin={{
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          <Pie
            data={dadosPizza}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            dataKey="gasto"
            nameKey="categoria"
            isAnimationActive={isAnimationActive}
            {...(activeIndex !== null && { activeIndex })}
            activeShape={renderActiveShape as PieProps['activeShape']}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {dadosPizza.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        <Tooltip content={() => null} defaultIndex={defaultIndex} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    
  );
}