import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ref, onValue, remove } from "firebase/database";
import { auth, database } from "~/service/firebase";
import { formatarMoeda, rotuloCategoria } from "~/service/analise/motor";
import { caminhoLancamentos, type TipoLancamento } from "~/service/lancamentos";
import { EstadoVazio, classeBotaoPrimario, classeInput, formatarData } from "~/components/ui";

export async function loader() {
  return null;
}

interface Item {
  id: string;
  tipo: TipoLancamento;
  valor: number;
  categoria: string;
  data: string;
  criadoEm: number;
}

type Visao = "todos" | "gasto" | "ganho";

function ler(dados: Record<string, any>, tipo: TipoLancamento): Item[] {
  return Object.entries(dados).map(([id, g]) => ({
    id,
    tipo,
    valor: Number(g?.valor ?? 0),
    categoria: String(g?.categoria ?? "outros"),
    data: String(g?.data ?? ""),
    criadoEm: Number(g?.criadoEm ?? 0),
  }));
}

export default function ListarGastos() {
  const [gastos, setGastos] = useState<Item[]>([]);
  const [ganhos, setGanhos] = useState<Item[]>([]);
  const [pendentes, setPendentes] = useState(2);
  const [visao, setVisao] = useState<Visao>("todos");
  const [filtro, setFiltro] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return setPendentes(0);
    const fim = () => setPendentes((n) => Math.max(0, n - 1));
    let g1 = false, g2 = false;
    const off1 = onValue(ref(database, caminhoLancamentos(user.uid, "gasto")), (s) => {
      setGastos(ler((s.val() ?? {}) as Record<string, any>, "gasto"));
      if (!g1) { g1 = true; fim(); }
    }, () => { if (!g1) { g1 = true; fim(); } });
    // Se a regra de "ganhos" ainda não existe, a lista segue só com gastos.
    const off2 = onValue(ref(database, caminhoLancamentos(user.uid, "ganho")), (s) => {
      setGanhos(ler((s.val() ?? {}) as Record<string, any>, "ganho"));
      if (!g2) { g2 = true; fim(); }
    }, () => { if (!g2) { g2 = true; fim(); } });
    return () => { off1(); off2(); };
  }, []);

  async function excluir(item: Item) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setErro("");
      await remove(ref(database, `${caminhoLancamentos(user.uid, item.tipo)}/${item.id}`));
      setConfirmando(null);
    } catch {
      setErro("Não foi possível excluir. Tente de novo.");
    }
  }

  const carregando = pendentes > 0;
  const todos = useMemo(() => [...gastos, ...ganhos], [gastos, ganhos]);
  const daVisao = useMemo(() => todos.filter((i) => visao === "todos" || i.tipo === visao), [todos, visao]);
  const categorias = useMemo(
    () => Array.from(new Set(daVisao.map((i) => rotuloCategoria(i.categoria)))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [daVisao],
  );
  const lista = useMemo(
    () =>
      daVisao
        .filter((i) => !filtro || rotuloCategoria(i.categoria) === filtro)
        .sort((a, b) => (b.data || "").localeCompare(a.data || "") || b.criadoEm - a.criadoEm),
    [daVisao, filtro],
  );

  const totalGanhos = lista.filter((i) => i.tipo === "ganho").reduce((s, i) => s + i.valor, 0);
  const totalGastos = lista.filter((i) => i.tipo === "gasto").reduce((s, i) => s + i.valor, 0);
  const saldo = totalGanhos - totalGastos;

  const abas: { v: Visao; r: string }[] = [{ v: "todos", r: "Todos" }, { v: "gasto", r: "Gastos" }, { v: "ganho", r: "Ganhos" }];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Lançamentos</h1>
        <Link to="/registrar" className={`${classeBotaoPrimario} hidden sm:inline-flex`}>+ Novo lançamento</Link>
      </div>

      {!carregando && todos.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { r: "Ganhos", v: totalGanhos, c: "text-emerald-300" },
              { r: "Gastos", v: totalGastos, c: "text-white" },
              { r: "Saldo", v: saldo, c: saldo < 0 ? "text-red-400" : "text-white" },
            ].map((k) => (
              <div key={k.r} className="rounded-xl border border-surface-border bg-surface-dark p-3">
                <p className="text-xs text-zinc-400">{k.r}</p>
                <p className={`mt-0.5 truncate text-base font-bold sm:text-lg ${k.c}`}>{formatarMoeda(k.v)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Tipo" className="inline-flex rounded-xl border border-surface-border bg-surface-dark p-1">
              {abas.map((a) => (
                <button key={a.v} role="tab" aria-selected={visao === a.v} onClick={() => { setVisao(a.v); setFiltro(""); }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${visao === a.v ? "bg-brand-yellow text-on-brand" : "text-zinc-300 hover:bg-surface-hover"}`}>
                  {a.r}
                </button>
              ))}
            </div>
            {categorias.length > 1 && (
              <div className="w-full sm:w-52">
                <label htmlFor="filtro" className="sr-only">Filtrar por categoria</label>
                <select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)} className={classeInput}>
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      {erro && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}

      <div className="mt-5">
        {carregando ? (
          <ul aria-busy="true" aria-label="Carregando lançamentos" className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => <li key={i} className="h-16 animate-pulse rounded-xl border border-surface-border bg-surface-dark" />)}
          </ul>
        ) : todos.length === 0 ? (
          <EstadoVazio titulo="Nenhum lançamento ainda" texto="Registre ganhos e gastos para ver gráficos, saldo e a análise de planejamento do mês."
            acao={<Link to="/registrar" className={classeBotaoPrimario}>Registrar primeiro lançamento</Link>} />
        ) : lista.length === 0 ? (
          <EstadoVazio titulo="Nada por aqui" texto="Tente outro tipo ou categoria." />
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.map((i) => {
              const ganho = i.tipo === "ganho";
              const chave = `${i.tipo}-${i.id}`;
              const nome = `${rotuloCategoria(i.categoria)} em ${formatarData(i.data)}`;
              return (
                <li key={chave} className={`flex items-center gap-3 rounded-xl border border-surface-border border-l-4 bg-surface-dark p-4 transition-colors hover:bg-surface-hover/60 ${ganho ? "border-l-emerald-400" : "border-l-brand-yellow"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{rotuloCategoria(i.categoria)}</p>
                    <p className="text-sm text-zinc-400">{ganho ? "Ganho" : "Gasto"} · {formatarData(i.data)}</p>
                  </div>
                  <p className={`shrink-0 font-semibold ${ganho ? "text-emerald-300" : "text-white"}`}>{ganho ? "+" : "−"} {formatarMoeda(i.valor)}</p>

                  {confirmando === chave ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => excluir(i)} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-[#fff] hover:bg-red-400">Excluir</button>
                      <button onClick={() => setConfirmando(null)} className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-surface-hover">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center">
                      <Link to={`/editar/${i.tipo}/${i.id}`} aria-label={`Editar ${nome}`} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-surface-hover hover:text-white">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" /></svg>
                      </Link>
                      <button onClick={() => setConfirmando(chave)} aria-label={`Excluir ${nome}`} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
