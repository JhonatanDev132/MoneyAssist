import type { ReactNode } from "react";
import type { Destaque, ResumoFinanceiro, TipoDestaque } from "~/service/analise/motor";
import { formatarMoeda, formatarPercentual } from "~/service/analise/motor";
import type { EstadoAnalise } from "~/service/analise/useAnalise";

const ESTILO_TIPO: Record<TipoDestaque, { icone: string; borda: string; fundo: string; texto: string }> = {
  alerta: { icone: "!", borda: "border-amber-400", fundo: "bg-amber-400/10", texto: "text-amber-300" },
  positivo: { icone: "✓", borda: "border-emerald-400", fundo: "bg-emerald-400/10", texto: "text-emerald-300" },
  dica: { icone: "→", borda: "border-sky-400", fundo: "bg-sky-400/10", texto: "text-sky-300" },
  info: { icone: "i", borda: "border-zinc-500", fundo: "bg-zinc-500/10", texto: "text-zinc-300" },
};

export function formatarTempoRelativo(ms: number, agora: number = Date.now()): string {
  const minutos = Math.floor((agora - ms) / 60_000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Chip({ children, tom = "neutro", titulo }: { children: ReactNode; tom?: "neutro" | "alta" | "baixa"; titulo?: string }) {
  const cores = {
    neutro: "border-surface-border text-zinc-200",
    alta: "border-amber-400/60 text-amber-300",
    baixa: "border-emerald-400/60 text-emerald-300",
  }[tom];
  return (
    <span title={titulo} className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${cores}`}>
      {children}
    </span>
  );
}

function Chips({ r }: { r: ResumoFinanceiro }) {
  const v = r.variacaoMesmoPeriodo;
  return (
    <div className="flex flex-wrap gap-2">
      <Chip>
        {capitalizar(r.nomeMes)}: {formatarMoeda(r.totalMes)}
        {!r.mesEmAndamento && " (último mês com registros)"}
      </Chip>
      {v !== null && r.mesAnterior && (
        <Chip
          tom={v > 0.005 ? "alta" : v < -0.005 ? "baixa" : "neutro"}
          titulo={`Comparado ao mesmo período de ${r.mesAnterior.nome}`}
        >
          {Math.abs(v) < 0.005
            ? `Igual a ${r.mesAnterior.nome}`
            : `${v > 0 ? "+" : "-"}${formatarPercentual(v)} vs ${r.mesAnterior.nome}`}
        </Chip>
      )}
      {r.projecaoMes !== null && <Chip titulo="Estimativa para o fechamento do mês">Projeção: {formatarMoeda(r.projecaoMes)}</Chip>}
    </div>
  );
}

function ItemDestaque({ d }: { d: Destaque }) {
  const e = ESTILO_TIPO[d.tipo];
  return (
    <li className={`flex gap-3 rounded-lg border-l-4 p-3 ${e.borda} ${e.fundo}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${e.borda} ${e.texto}`}
      >
        {e.icone}
      </span>
      <div>
        <p className={`font-medium ${e.texto}`}>{d.titulo}</p>
        <p className="text-sm leading-relaxed text-zinc-200">{d.texto}</p>
      </div>
    </li>
  );
}

export function CardAnalise({ estado }: { estado: EstadoAnalise }) {
  const { carregando, resumo, conteudo, origem, geradoEm, gerando, aviso, podeGerar, rotuloBotao, usosRestantes, gerar } = estado;

  const moldura = "w-full bg-surface-dark border border-surface-border rounded-xl p-4 flex flex-col gap-4 lg:max-h-[34rem] lg:overflow-y-auto";

  if (carregando) {
    return (
      <div className={moldura}>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span>Carregando seus gastos...</span>
        </div>
      </div>
    );
  }

  if (!resumo || !conteudo) {
    return (
      <div className={moldura}>
        <p className="text-zinc-400">Registre alguns gastos para ver aqui a análise do seu mês, com comparações e projeção.</p>
      </div>
    );
  }

  return (
    <div className={moldura} aria-busy={gerando}>
      <p className="leading-relaxed text-white">{conteudo.resumo}</p>

      <Chips r={resumo} />

      {conteudo.destaques.length > 0 && (
        <ul className="flex flex-col gap-2">
          {conteudo.destaques.map((d) => (
            <ItemDestaque key={`${d.tipo}-${d.titulo}`} d={d} />
          ))}
        </ul>
      )}

      {conteudo.dica && (
        <div className="rounded-lg border border-brand-yellow/30 bg-brand-yellow/10 p-3">
          <p className="text-xs font-semibold tracking-wide text-brand-yellow uppercase">Dica principal</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-100">{conteudo.dica}</p>
        </div>
      )}

      {aviso && (
        <p role="status" className="text-sm text-amber-300/90">
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-3">
        <p className="text-xs text-zinc-400">
          {origem === "ia" && geradoEm
            ? `✨ Escrita pela IA · atualizada ${formatarTempoRelativo(geradoEm)}`
            : "⚡ Análise automática · calculada agora"}
        </p>
        <button
          type="button"
          onClick={gerar}
          disabled={!podeGerar}
          className="rounded-lg border border-brand-yellow px-3 py-1.5 text-sm text-brand-yellow transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:border-surface-border disabled:text-zinc-500"
          title={podeGerar ? `${usosRestantes} de hoje restantes` : undefined}
        >
          {gerando && (
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]" />
          )}
          {rotuloBotao}
        </button>
      </div>
    </div>
  );
}
