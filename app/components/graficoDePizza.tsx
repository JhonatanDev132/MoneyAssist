import { useState } from 'react';

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

const data = [
  { categoria: "Alimentos", gasto: 2400 },
  { categoria: "Transporte", gasto: 1398 },
  { categoria: "Lazer", gasto: 3200 },
  { categoria: "Compras", gasto: 2800 },
];

// Cores harmônicas com o tema Dark do seu app (destaque em Amarelo #FFB800)
const COLORS = ['#FFB800', '#3B82F6', '#10B981', '#8B5CF6'];

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
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      {/* Texto no centro da rosquinha */}
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#FFFFFF" className="font-semibold text-sm">
        {payload.categoria}
      </text>

      {/* Fatia Principal */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      {/* Borda de Destaque Ativa */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />

      {/* Linha Guia */}
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />

      {/* Valor e Porcentagem em cores claras */}
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#FFFFFF">
        {`R$ ${value}`}
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

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
            data={data}
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
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        <Tooltip content={() => null} defaultIndex={defaultIndex} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    
  );
}