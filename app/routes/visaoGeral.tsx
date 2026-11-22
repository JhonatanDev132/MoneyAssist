import { Link } from "react-router";
import { auth } from "~/service/firebase";
import { CardAnalise } from "~/components/cardAnalise";
import { GraficoBarra } from "~/components/graficoDeBarra";
import { GraficoPizza } from "~/components/graficoDePizza";
import { classeBotaoPrimario } from "~/components/ui";
import { formatarMoeda, formatarPercentual } from "~/service/analise/motor";
import { useAnalise } from "~/service/analise/useAnalise";

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Kpi({ rotulo, valor, detalhe, tom = "neutro" }: { rotulo: string; valor: string; detalhe?: string; tom?: "neutro" | "alta" | "baixa" }) {
  const cor = { neutro: "text-zinc-400", alta: "text-amber-300", baixa: "text-emerald-300" }[tom];
  return (
    <div className="rounded-xl border border-surface-border bg-surface-dark p-4">
      <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold text-white">{valor}</p>
      {detalhe && <p className={`mt-1 text-xs ${cor}`}>{detalhe}</p>}
    </div>
  );
}

export default function VisaoGeral() {
  const analise = useAnalise();
  const r = analise.resumo;
  const nome = (auth.currentUser?.displayName || auth.currentUser?.email || "").split(/[\s@]/)[0];
  const v = r?.variacaoMesmoPeriodo ?? null;
  const f = r?.fluxo ?? null;
  const mes = r ? r.nomeMes.charAt(0).toUpperCase() + r.nomeMes.slice(1) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{saudacao()}{nome ? `, ${nome}` : ""} 👋</h1>
          <p className="mt-1 text-sm text-zinc-400">Aqui está o resumo das suas finanças.</p>
        </div>
        <Link to="/registrar" className={`${classeBotaoPrimario} hidden sm:inline-flex`}>+ Novo lançamento</Link>
      </div>

      {r && (
        <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo={`Ganhos em ${mes}`} valor={f ? formatarMoeda(f.ganhosMes) : "—"}
            detalhe={f ? undefined : "Registre seus ganhos"} tom={f ? "baixa" : "neutro"} />
          <Kpi rotulo={`Gastos em ${mes}`} valor={formatarMoeda(r.totalMes)}
            detalhe={v !== null && r.mesAnterior ? (Math.abs(v) < 0.005 ? `Igual a ${r.mesAnterior.nome}` : `${v > 0 ? "+" : "-"}${formatarPercentual(v)} vs ${r.mesAnterior.nome}`) : `${r.quantidadeMes} lançamentos`}
            tom={v !== null ? (v > 0.005 ? "alta" : v < -0.005 ? "baixa" : "neutro") : "neutro"} />
          <Kpi rotulo="Saldo do mês" valor={f ? formatarMoeda(f.saldoMes) : "—"}
            detalhe={f ? (f.taxaPoupanca >= 0 ? `${formatarPercentual(f.taxaPoupanca)} dos ganhos guardados` : "gastos acima dos ganhos") : "Precisa dos ganhos"}
            tom={f ? (f.saldoMes < 0 ? "alta" : "baixa") : "neutro"} />
          <Kpi rotulo="Projeção de gastos" valor={r.projecaoMes !== null ? formatarMoeda(r.projecaoMes) : "—"}
            detalhe={f && f.saldoProjetado !== null ? `saldo projetado ${formatarMoeda(f.saldoProjetado)}` : "estimativa de fechamento"}
            tom={f && f.saldoProjetado !== null && f.saldoProjetado < 0 ? "alta" : "neutro"} />
        </section>
      )}

      {r && f && (
        <section aria-label="Planejamento do mês" className="rounded-xl border border-surface-border bg-surface-dark p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Planejamento do mês</h2>
            <p className="text-sm text-zinc-400">
              {f.limiteDiario !== null ? `Dá para gastar cerca de ${formatarMoeda(f.limiteDiario)} por dia até o fim do mês` : f.saldoMes < 0 ? "Os gastos já passaram dos ganhos" : "Mês encerrado"}
            </p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-bg-dark" role="progressbar" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round((r.totalMes / f.ganhosMes) * 100))} aria-label="Parte dos ganhos já gasta">
            <div className={`h-full rounded-full transition-all ${r.totalMes > f.ganhosMes ? "bg-red-500" : r.totalMes / f.ganhosMes > 0.8 ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, (r.totalMes / f.ganhosMes) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-zinc-400">Você já usou {Math.round((r.totalMes / f.ganhosMes) * 100)}% dos ganhos de {mes}.</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GraficoPizza />

        <section aria-labelledby="titulo-analise">
          <h2 id="titulo-analise" className="mb-3 text-lg font-semibold text-white">Análise dos gastos ✨</h2>
          <CardAnalise estado={analise} />
        </section>

        <div className="lg:col-span-2">
          <GraficoBarra />
        </div>
      </div>

      {/* Atalho flutuante no celular */}
      <Link to="/registrar" aria-label="Novo lançamento"
        className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow text-3xl font-light text-on-brand shadow-lg shadow-black/40 transition hover:brightness-110 active:scale-95 sm:hidden">
        +
      </Link>
    </div>
  );
}
