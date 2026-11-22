import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { get, push, ref, set, update } from "firebase/database";
import { auth, database } from "~/service/firebase";
import { hojeLocal } from "~/service/analise/motor";
import { caminhoLancamentos, categoriasDo, type TipoLancamento } from "~/service/lancamentos";
import { Campo, Spinner, classeBotaoPrimario, classeBotaoSecundario, classeInput } from "~/components/ui";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type Erros = Partial<Record<"valor" | "categoria" | "outra" | "data" | "geral", string>>;

/** Cria (sem `id`) ou edita (com `id`) um gasto ou ganho. */
export function FormularioLancamento({ tipoInicial = "gasto", id }: { tipoInicial?: TipoLancamento; id?: string }) {
  const editando = !!id;
  const [tipo, setTipo] = useState<TipoLancamento>(tipoInicial);
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [outraCategoria, setOutraCategoria] = useState("");
  const [data, setData] = useState(hojeLocal());
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const navigate = useNavigate();

  const categorias = categoriasDo(tipo);
  const centavos = Number(valor.replace(/\D/g, ""));
  const ehGanho = tipo === "ganho";

  // Edição: carrega o lançamento existente.
  useEffect(() => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return setCarregando(false);
    get(ref(database, `${caminhoLancamentos(user.uid, tipoInicial)}/${id}`))
      .then((snap) => {
        const v = snap.val();
        if (!v) return setErros({ geral: "Esse lançamento não existe mais." });
        const conhecida = categoriasDo(tipoInicial).some((c) => c.valor === v.categoria);
        setValor(formatadorMoeda.format(Number(v.valor ?? 0)));
        setCategoria(conhecida ? v.categoria : "outros");
        setOutraCategoria(conhecida ? "" : String(v.categoria ?? ""));
        setData(String(v.data ?? hojeLocal()));
      })
      .catch(() => setErros({ geral: "Não foi possível carregar o lançamento." }))
      .finally(() => setCarregando(false));
  }, [id, tipoInicial]);

  function trocarTipo(novo: TipoLancamento) {
    if (novo === tipo) return;
    setTipo(novo);
    setCategoria("");
    setOutraCategoria("");
    setErros({});
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const user = auth.currentUser;
    if (!user) return setErros({ geral: "Sua sessão expirou. Entre novamente." });

    const e: Erros = {};
    if (centavos <= 0) e.valor = "Informe um valor maior que zero.";
    if (!categoria) e.categoria = ehGanho ? "Escolha a origem do ganho." : "Escolha uma categoria.";
    if (categoria === "outros" && !outraCategoria.trim()) e.outra = "Diga qual é a categoria.";
    if (!data) e.data = "Escolha a data.";
    setErros(e);
    if (Object.keys(e).length) return;

    setSalvando(true);
    try {
      const dados = {
        valor: centavos / 100,
        categoria: categoria === "outros" ? outraCategoria.trim() : categoria,
        data,
      };
      const base = caminhoLancamentos(user.uid, tipo);
      if (id) await update(ref(database, `${base}/${id}`), dados);
      else await set(push(ref(database, base)), { ...dados, criadoEm: Date.now() });
      navigate(editando ? "/listar" : "/");
    } catch {
      setErros({
        geral: ehGanho
          ? "Não foi possível salvar o ganho. Confira a conexão e se as regras do banco liberam o nó \"ganhos\"."
          : "Não foi possível salvar o gasto. Verifique sua conexão e tente de novo.",
      });
      setSalvando(false);
    }
  }

  const titulo = `${editando ? "Editar" : "Registrar"} ${ehGanho ? "ganho" : "gasto"}`;

  if (carregando) {
    return (
      <div role="status" className="flex justify-center py-20 text-zinc-400"><Spinner className="h-6 w-6" /></div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-white">{titulo}</h1>
      <p className="mt-1 text-sm text-zinc-400">{ehGanho ? "Anote o que entrou para a IA te ajudar a planejar o mês." : "Leva menos de 10 segundos."}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5 rounded-2xl border border-surface-border bg-surface-dark p-5 md:p-6">
        {!editando && (
          <div role="radiogroup" aria-label="Tipo de lançamento" className="grid grid-cols-2 gap-1 rounded-xl border border-surface-border bg-bg-dark p-1">
            {(["gasto", "ganho"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => trocarTipo(t)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  tipo === t ? (t === "ganho" ? "bg-emerald-500 text-[#fff]" : "bg-brand-yellow text-on-brand") : "text-zinc-400 hover:text-white"}`}>
                {t === "gasto" ? "− Gasto" : "+ Ganho"}
              </button>
            ))}
          </div>
        )}

        <Campo id="valor" rotulo="Valor" erro={erros.valor}>
          <input id="valor" type="text" inputMode="numeric" autoComplete="off" autoFocus={!editando} placeholder="R$ 0,00"
            aria-invalid={!!erros.valor} aria-describedby={erros.valor ? "valor-erro" : undefined}
            className={`${classeInput} text-2xl font-semibold ${erros.valor ? "border-red-500" : ""}`} value={valor}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              setValor(d ? formatadorMoeda.format(Number(d) / 100) : "");
            }} />
        </Campo>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-zinc-200">{ehGanho ? "Origem" : "Categoria"}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categorias.map((c) => (
              <label key={c.valor} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-yellow ${
                categoria === c.valor ? "border-brand-yellow bg-brand-yellow/10 text-white" : "border-surface-border text-zinc-300 hover:bg-surface-hover"}`}>
                <input type="radio" name="categoria" value={c.valor} checked={categoria === c.valor} onChange={() => setCategoria(c.valor)} className="sr-only" />
                <span aria-hidden="true">{c.emoji}</span> {c.rotulo}
              </label>
            ))}
          </div>
          {erros.categoria && <p role="alert" className="text-sm text-red-400">{erros.categoria}</p>}
        </fieldset>

        {categoria === "outros" && (
          <Campo id="outraCategoria" rotulo={ehGanho ? "Qual a origem?" : "Qual categoria?"} erro={erros.outra}>
            <input id="outraCategoria" type="text" maxLength={30} placeholder={ehGanho ? "Ex.: Aluguel, Venda..." : "Ex.: Pets, Assinaturas..."}
              value={outraCategoria} onChange={(e) => setOutraCategoria(e.target.value)} className={classeInput} aria-invalid={!!erros.outra} />
          </Campo>
        )}

        <Campo id="data" rotulo="Data" erro={erros.data}>
          <input id="data" type="date" lang="pt-BR" value={data} onChange={(e) => setData(e.target.value)} className={classeInput} />
        </Campo>

        {erros.geral && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erros.geral}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={editando ? "/listar" : "/"} className={classeBotaoSecundario}>Cancelar</Link>
          <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
            {salvando && <Spinner />} {salvando ? "Salvando..." : editando ? "Salvar alterações" : ehGanho ? "Registrar ganho" : "Registrar gasto"}
          </button>
        </div>
      </form>
    </div>
  );
}
