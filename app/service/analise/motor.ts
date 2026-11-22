/**
 * Motor de análise financeira local.
 *
 * Calcula fatos concretos sobre os gastos (comparações, projeções, anomalias)
 * de forma determinística, sem depender de IA. É usado:
 *  - no navegador, para exibir a análise instantaneamente (e como fallback);
 *  - no servidor, para montar os fatos que o Gemini transforma em texto.
 *
 * Mantenha este arquivo sem dependências de browser/Node e com imports relativos.
 */

export interface Gasto {
  categoria: string;
  valor: number;
  data: string; // YYYY-MM-DD
}

export type TipoDestaque = "alerta" | "positivo" | "dica" | "info";

export interface Destaque {
  tipo: TipoDestaque;
  titulo: string;
  texto: string;
}

export interface Insight extends Destaque {
  id: string;
  prioridade: number;
}

export interface CategoriaMes {
  categoria: string;
  rotulo: string;
  total: number;
  quantidade: number;
  percentual: number; // 0..1 do total do mês
  /** Média dos meses anteriores no mesmo período (null sem histórico). */
  mediaAnterior: number | null;
}

/** Planejamento do mês: ganhos x gastos (só existe quando há ganhos no mês de referência). */
export interface FluxoMes {
  ganhosMes: number;
  saldoMes: number; // ganhos - gastos até agora
  taxaPoupanca: number; // saldo / ganhos (fração; negativa se gastou mais que recebeu)
  saldoProjetado: number | null; // ganhos - projeção de fechamento dos gastos
  limiteDiario: number | null; // quanto dá para gastar por dia até o fim do mês e fechar no azul
  diasRestantes: number;
}

export interface ResumoFinanceiro {
  hoje: string;
  mesReferencia: string; // YYYY-MM
  nomeMes: string;
  mesEmAndamento: boolean;
  diaAtual: number;
  diasNoMes: number;
  totalMes: number;
  quantidadeMes: number;
  mesAnterior: {
    nome: string;
    total: number;
    totalMesmoPeriodo: number;
  } | null;
  /** Variação vs. mês anterior no mesmo período (fração, ex.: 0.12 = +12%). */
  variacaoMesmoPeriodo: number | null;
  /** Estimativa de fechamento do mês (só para mês em andamento). */
  projecaoMes: number | null;
  categorias: CategoriaMes[];
  insights: Insight[];
  mesesComHistorico: number; // meses anteriores com dados dentro da janela
  fluxo: FluxoMes | null;
  temGanhos: boolean; // o usuário já registrou algum ganho recente?
}

export interface ConteudoAnalise {
  resumo: string;
  destaques: Destaque[];
  dica: string | null;
}

/** Quantos meses anteriores ao mês de referência entram na análise. */
export const MESES_HISTORICO = 3;
const MAX_INSIGHTS = 6;
/** Abaixo disso a projeção é ruído (ex.: 1 gasto no mês não diz nada sobre o ritmo). */
const MIN_LANCAMENTOS_PROJECAO = 3;

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  // Intl usa espaço não separável (U+00A0); normaliza para espaço comum
  return formatadorMoeda.format(valor).replace(/ /g, " ");
}

export function formatarPercentual(fracao: number): string {
  const p = Math.round(Math.abs(fracao) * 100);
  return `${p}%`;
}

const ROTULOS_CATEGORIA: Record<string, string> = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  lazer: "Lazer",
  saude: "Saúde",
  educacao: "Educação",
  outros: "Outros",
  salario: "Salário",
  freelance: "Freelance",
  investimentos: "Investimentos",
  presente: "Presente",
};

/**
 * Categorias personalizadas são texto livre digitado pelo usuário e acabam no
 * prompt da IA. Mantemos só letras, números, espaço e hífen, com tamanho limitado.
 */
function limparRotulo(texto: string): string {
  return texto
    .replace(/[^\p{L}\p{N} \-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

export function rotuloCategoria(categoria: string): string {
  const chave = categoria.trim().toLowerCase();
  if (ROTULOS_CATEGORIA[chave]) return ROTULOS_CATEGORIA[chave];
  const limpo = limparRotulo(categoria);
  if (!limpo) return "Outros";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// ---------------------------------------------------------------------------
// Datas (sem fuso horário: tudo em YYYY-MM-DD local)
// ---------------------------------------------------------------------------

interface DataSimples {
  ano: number;
  mes: number; // 1..12
  dia: number;
}

function parseData(data: string): DataSimples | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data ?? "");
  if (m) {
    const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) return { ano, mes, dia };
    return null;
  }
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

function chaveMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function deslocarMes(chave: string, delta: number): string {
  const [ano, mes] = chave.split("-").map(Number);
  const indice = ano * 12 + (mes - 1) + delta;
  return chaveMes(Math.floor(indice / 12), (indice % 12) + 1);
}

function diasNoMes(chave: string): number {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(ano, mes, 0).getDate();
}

function nomeDoMes(chave: string): string {
  return NOMES_MES[Number(chave.split("-")[1]) - 1];
}

export function hojeLocal(agora = new Date()): string {
  return `${chaveMes(agora.getFullYear(), agora.getMonth() + 1)}-${String(agora.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

interface GastoNormalizado {
  mes: string;
  dia: number;
  categoria: string; // chave normalizada
  valor: number;
}

function normalizar(gastos: Gasto[], hoje: string): GastoNormalizado[] {
  const lista: GastoNormalizado[] = [];
  for (const g of gastos) {
    const d = parseData(g.data);
    const valor = Number(g.valor);
    if (!d || !Number.isFinite(valor) || valor <= 0) continue;
    const data = `${chaveMes(d.ano, d.mes)}-${String(d.dia).padStart(2, "0")}`;
    if (data > hoje) continue; // ignora lançamentos futuros
    lista.push({
      mes: chaveMes(d.ano, d.mes),
      dia: d.dia,
      categoria: (g.categoria ?? "").trim().toLowerCase() || "outros",
      valor,
    });
  }
  return lista;
}

/**
 * Mantém só os gastos que o motor realmente usa (mês de referência + histórico).
 * Útil para reduzir o payload enviado ao servidor sem alterar o resultado.
 */
export function filtrarJanela(gastos: Gasto[], hoje: string): Gasto[] {
  const normalizados = normalizar(gastos, hoje);
  if (normalizados.length === 0) return [];
  const ref = escolherMesReferencia(normalizados, hoje);
  const inicio = deslocarMes(ref, -MESES_HISTORICO);
  return gastos.filter((g) => {
    const d = parseData(g.data);
    if (!d) return false;
    const mes = chaveMes(d.ano, d.mes);
    return mes >= inicio && mes <= ref;
  });
}

/** Hash de 53 bits (cyrb53). Não é criptográfico: só detecta "os gastos mudaram?". */
function hashTexto(texto: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Identifica o conjunto de gastos que alimenta a análise (janela usada pelo motor
 * + mês corrente). Muda quando um gasto é criado, editado ou removido, ou quando
 * o mês vira; não muda por causa de lançamentos fora da janela.
 */
export function hashGastos(gastos: Gasto[], hoje: string = hojeLocal(), ganhos: Gasto[] = []): string {
  const linhas = normalizar(filtrarJanela(gastos, hoje), hoje)
    .map((g) => `${g.mes}-${String(g.dia).padStart(2, "0")}|${g.categoria}|${g.valor.toFixed(2)}`)
    .sort();
  const inicio = deslocarMes(hoje.slice(0, 7), -MESES_HISTORICO);
  const linhasGanhos = normalizar(ganhos, hoje)
    .filter((g) => g.mes >= inicio)
    .map((g) => `G|${g.mes}-${String(g.dia).padStart(2, "0")}|${g.valor.toFixed(2)}`)
    .sort();
  // Sem ganhos o hash é idêntico ao de antes (não invalida análises já salvas).
  const extra = linhasGanhos.length ? `\n##\n${linhasGanhos.join("\n")}` : "";
  return hashTexto(`${hoje.slice(0, 7)}\n${linhas.join("\n")}${extra}`);
}

function escolherMesReferencia(gastos: GastoNormalizado[], hoje: string): string {
  const mesAtual = hoje.slice(0, 7);
  if (gastos.some((g) => g.mes === mesAtual)) return mesAtual;
  // Sem gastos no mês atual: analisa o mês mais recente com dados.
  return gastos.reduce((max, g) => (g.mes > max ? g.mes : max), gastos[0].mes);
}

function soma(lista: GastoNormalizado[]): number {
  return lista.reduce((s, g) => s + g.valor, 0);
}

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

function arred(v: number): number {
  return Math.round(v * 100) / 100;
}

export function gerarResumo(gastosBrutos: Gasto[], hoje: string = hojeLocal(), ganhosBrutos: Gasto[] = []): ResumoFinanceiro | null {
  const gastos = normalizar(gastosBrutos, hoje);
  if (gastos.length === 0) return null;

  const ref = escolherMesReferencia(gastos, hoje);
  const mesEmAndamento = ref === hoje.slice(0, 7);
  const totalDias = diasNoMes(ref);
  const diaAtual = mesEmAndamento ? Number(hoje.slice(8, 10)) : totalDias;

  const doMes = (mes: string) => gastos.filter((g) => g.mes === mes);
  /** Gastos de um mês anterior até o "mesmo dia" do mês de referência. */
  const ateMesmoDia = (mes: string) => {
    const limite = mesEmAndamento ? Math.min(diaAtual, diasNoMes(mes)) : diasNoMes(mes);
    return doMes(mes).filter((g) => g.dia <= limite);
  };

  const atuais = doMes(ref);
  const totalMes = soma(atuais);

  const mesesAnteriores = Array.from({ length: MESES_HISTORICO }, (_, i) => deslocarMes(ref, -(i + 1)));
  const mesesComDados = mesesAnteriores.filter((m) => gastos.some((g) => g.mes === m));
  const temHistorico = mesesComDados.length > 0;

  // --- Mês anterior ----------------------------------------------------------
  const chaveAnterior = mesesAnteriores[0];
  const gastosAnterior = doMes(chaveAnterior);
  const mesAnterior = gastosAnterior.length
    ? {
        nome: nomeDoMes(chaveAnterior),
        total: arred(soma(gastosAnterior)),
        totalMesmoPeriodo: arred(soma(ateMesmoDia(chaveAnterior))),
      }
    : null;

  const variacaoMesmoPeriodo =
    mesAnterior && mesAnterior.totalMesmoPeriodo > 0
      ? totalMes / mesAnterior.totalMesmoPeriodo - 1
      : null;

  // --- Projeção --------------------------------------------------------------
  // Com histórico: o que já foi gasto + o que costuma ser gasto no restante do mês.
  // Sem histórico: extrapolação linear.
  let projecaoMes: number | null = null;
  if (mesEmAndamento && diaAtual < totalDias && atuais.length >= MIN_LANCAMENTOS_PROJECAO) {
    if (temHistorico) {
      const restantes = mesesComDados.map((m) => soma(doMes(m)) - soma(ateMesmoDia(m)));
      projecaoMes = totalMes + restantes.reduce((a, b) => a + b, 0) / restantes.length;
    } else if (diaAtual >= 7) {
      projecaoMes = (totalMes / diaAtual) * totalDias;
    }
  }

  // --- Categorias ------------------------------------------------------------
  const chavesCategoria = new Set([
    ...atuais.map((g) => g.categoria),
    ...mesesComDados.flatMap((m) => ateMesmoDia(m).map((g) => g.categoria)),
  ]);

  const categorias: CategoriaMes[] = [...chavesCategoria]
    .map((categoria) => {
      const daCategoria = atuais.filter((g) => g.categoria === categoria);
      const total = soma(daCategoria);
      const mediaAnterior = temHistorico
        ? mesesComDados.reduce(
            (s, m) => s + soma(ateMesmoDia(m).filter((g) => g.categoria === categoria)),
            0,
          ) / mesesComDados.length
        : null;
      return {
        categoria,
        rotulo: rotuloCategoria(categoria),
        total: arred(total),
        quantidade: daCategoria.length,
        percentual: totalMes > 0 ? total / totalMes : 0,
        mediaAnterior: mediaAnterior === null ? null : arred(mediaAnterior),
      };
    })
    .sort((a, b) => b.total - a.total);

  const resumo: ResumoFinanceiro = {
    hoje,
    mesReferencia: ref,
    nomeMes: nomeDoMes(ref),
    mesEmAndamento,
    diaAtual,
    diasNoMes: totalDias,
    totalMes: arred(totalMes),
    quantidadeMes: atuais.length,
    mesAnterior,
    variacaoMesmoPeriodo,
    projecaoMes: projecaoMes === null ? null : arred(projecaoMes),
    categorias,
    insights: [],
    mesesComHistorico: mesesComDados.length,
    fluxo: null,
    temGanhos: false,
  };

  // --- Ganhos e planejamento -------------------------------------------------
  const ganhos = normalizar(ganhosBrutos, hoje);
  resumo.temGanhos = ganhos.length > 0;
  const ganhosMes = arred(soma(ganhos.filter((g) => g.mes === ref)));
  if (ganhosMes > 0) {
    const diasRestantes = mesEmAndamento ? totalDias - diaAtual : 0;
    const saldoMes = arred(ganhosMes - resumo.totalMes);
    resumo.fluxo = {
      ganhosMes,
      saldoMes,
      taxaPoupanca: saldoMes / ganhosMes,
      saldoProjetado: resumo.projecaoMes === null ? null : arred(ganhosMes - resumo.projecaoMes),
      limiteDiario: mesEmAndamento && diasRestantes > 0 && saldoMes > 0 ? arred(saldoMes / diasRestantes) : null,
      diasRestantes,
    };
  }

  resumo.insights = detectarInsights(resumo, gastos, ref);
  return resumo;
}

// ---------------------------------------------------------------------------
// Regras de insight
// ---------------------------------------------------------------------------

function detectarInsights(r: ResumoFinanceiro, gastos: GastoNormalizado[], ref: string): Insight[] {
  const insights: Insight[] = [];
  const mes = r.nomeMes;
  const atuais = gastos.filter((g) => g.mes === ref);
  const periodo = r.mesEmAndamento ? "no mesmo período dos últimos meses" : "nos últimos meses";

  // 1. Ritmo do mês / fechamento vs. mês anterior
  if (r.mesAnterior && r.mesAnterior.total > 0) {
    const base = r.mesAnterior.total;
    if (r.mesEmAndamento && r.projecaoMes !== null && r.diaAtual >= 5) {
      const dif = r.projecaoMes / base - 1;
      if (dif >= 0.15) {
        insights.push({
          id: "ritmo-alta",
          tipo: "alerta",
          prioridade: 90,
          titulo: "Ritmo acima do mês passado",
          texto: `Nesse ritmo, ${mes} deve fechar em torno de ${formatarMoeda(r.projecaoMes)}, ${formatarPercentual(dif)} a mais que ${r.mesAnterior.nome} (${formatarMoeda(base)}).`,
        });
      } else if (dif <= -0.1) {
        insights.push({
          id: "ritmo-baixa",
          tipo: "positivo",
          prioridade: 70,
          titulo: "Gastando menos que no mês passado",
          texto: `A estimativa é fechar ${mes} em ${formatarMoeda(r.projecaoMes)}, ${formatarPercentual(dif)} abaixo de ${r.mesAnterior.nome} (${formatarMoeda(base)}).`,
        });
      }
    } else if (!r.mesEmAndamento) {
      const dif = r.totalMes / base - 1;
      if (dif >= 0.15) {
        insights.push({
          id: "fechamento-alta",
          tipo: "alerta",
          prioridade: 85,
          titulo: `${capitalizar(mes)} fechou mais caro`,
          texto: `Você gastou ${formatarMoeda(r.totalMes)} em ${mes}, ${formatarPercentual(dif)} a mais que em ${r.mesAnterior.nome} (${formatarMoeda(base)}).`,
        });
      } else if (dif <= -0.1) {
        insights.push({
          id: "fechamento-baixa",
          tipo: "positivo",
          prioridade: 70,
          titulo: `${capitalizar(mes)} fechou mais barato`,
          texto: `Você gastou ${formatarMoeda(r.totalMes)} em ${mes}, ${formatarPercentual(dif)} a menos que em ${r.mesAnterior.nome} (${formatarMoeda(base)}).`,
        });
      }
    }
  }

  // 2. Categorias em alta / novas / em queda (comparando o mesmo período)
  if (r.mesesComHistorico > 0) {
    const emAlta: Insight[] = [];
    const novas: Insight[] = [];
    const emQueda: Insight[] = [];

    for (const c of r.categorias) {
      const base = c.mediaAnterior ?? 0;
      const dif = c.total - base;
      if (base > 0 && dif >= Math.max(50, r.totalMes * 0.05) && c.total / base >= 1.3) {
        emAlta.push({
          id: `alta-${c.categoria}`,
          tipo: "alerta",
          prioridade: 75 + Math.min(10, dif / 100),
          titulo: `${c.rotulo} em alta`,
          texto: `Você ${r.mesEmAndamento ? "já gastou" : "gastou"} ${formatarMoeda(c.total)} com ${c.rotulo}, contra uma média de ${formatarMoeda(base)} ${periodo} (+${formatarPercentual(c.total / base - 1)}).`,
        });
      } else if (base === 0 && c.total >= Math.max(50, r.totalMes * 0.1)) {
        novas.push({
          id: `nova-${c.categoria}`,
          tipo: "info",
          prioridade: 50,
          titulo: `Gasto novo: ${c.rotulo}`,
          texto: `${formatarMoeda(c.total)} em ${c.rotulo} em ${mes}, uma categoria que não aparecia ${periodo}.`,
        });
      } else if (base > 0 && -dif >= Math.max(30, base * 0.1) && c.total / base <= 0.8) {
        emQueda.push({
          id: `queda-${c.categoria}`,
          tipo: "positivo",
          prioridade: 60 + Math.min(5, -dif / 100),
          titulo: `${c.rotulo} em queda`,
          texto: `${formatarMoeda(c.total)} com ${c.rotulo} em ${mes}, abaixo da média de ${formatarMoeda(base)} ${periodo} (-${formatarPercentual(1 - c.total / base)}).`,
        });
      }
    }

    const porPrioridade = (a: Insight, b: Insight) => b.prioridade - a.prioridade;
    insights.push(...emAlta.sort(porPrioridade).slice(0, 2));
    insights.push(...novas.sort(porPrioridade).slice(0, 1));
    insights.push(...emQueda.sort(porPrioridade).slice(0, 1));
  }

  // 3. Gasto atípico (muito acima do normal da categoria)
  const atipicos: Insight[] = [];
  for (const g of atuais) {
    const historico = gastos.filter((h) => h.categoria === g.categoria && h !== g).map((h) => h.valor);
    if (historico.length < 4) continue;
    const tipico = mediana(historico);
    if (tipico > 0 && g.valor >= 100 && g.valor >= tipico * 3) {
      const rotulo = rotuloCategoria(g.categoria);
      atipicos.push({
        id: `atipico-${g.categoria}-${g.dia}`,
        tipo: "alerta",
        prioridade: 65 + Math.min(10, g.valor / tipico / 2),
        titulo: `Gasto fora do padrão em ${rotulo}`,
        texto: `${formatarMoeda(g.valor)} em ${rotulo} no dia ${String(g.dia).padStart(2, "0")}/${ref.slice(5)}, cerca de ${Math.round(g.valor / tipico)}x o seu gasto típico nessa categoria (${formatarMoeda(tipico)}).`,
      });
    }
  }
  insights.push(...atipicos.sort((a, b) => b.prioridade - a.prioridade).slice(0, 1));

  // 4. Muitos gastos pequenos
  const frequente = r.categorias.find((c) => c.quantidade >= 8 && c.total / c.quantidade <= 60);
  if (frequente) {
    insights.push({
      id: `frequencia-${frequente.categoria}`,
      tipo: "dica",
      prioridade: 55,
      titulo: `Pequenos gastos em ${frequente.rotulo}`,
      texto: `Foram ${frequente.quantidade} lançamentos em ${frequente.rotulo} (média de ${formatarMoeda(frequente.total / frequente.quantidade)}), somando ${formatarMoeda(frequente.total)}. Definir um limite semanal ajuda a controlar esse tipo de gasto.`,
    });
  }

  // 5. Concentração em uma categoria
  const maior = r.categorias[0];
  if (maior && r.categorias.filter((c) => c.total > 0).length >= 2 && maior.percentual >= 0.45) {
    insights.push({
      id: `concentracao-${maior.categoria}`,
      tipo: "dica",
      prioridade: 52,
      titulo: `${maior.rotulo} domina o orçamento`,
      texto: `${maior.rotulo} representa ${formatarPercentual(maior.percentual)} dos seus gastos de ${mes}. Reduzir 10% nessa categoria já economizaria ${formatarMoeda(maior.total * 0.1)}.`,
    });
  }

  // 6. Planejamento: ganhos x gastos
  const f = r.fluxo;
  if (f) {
    if (f.saldoMes < 0) {
      insights.push({
        id: "saldo-negativo", tipo: "alerta", prioridade: 96, titulo: "Gastos acima dos ganhos",
        texto: `Em ${mes} você gastou ${formatarMoeda(r.totalMes)} e recebeu ${formatarMoeda(f.ganhosMes)}: o saldo está em ${formatarMoeda(f.saldoMes)}.`,
      });
    } else if (f.saldoProjetado !== null && f.saldoProjetado < 0 && r.projecaoMes !== null) {
      insights.push({
        id: "projecao-acima-ganhos", tipo: "alerta", prioridade: 90, titulo: "Projeção passa dos ganhos",
        texto: `No ritmo atual os gastos devem fechar o mês em ${formatarMoeda(r.projecaoMes)}, acima dos ${formatarMoeda(f.ganhosMes)} recebidos (saldo projetado de ${formatarMoeda(f.saldoProjetado)}).`,
      });
    } else if (f.limiteDiario !== null) {
      insights.push({
        id: "limite-diario", tipo: "dica", prioridade: 66, titulo: "Quanto ainda pode gastar",
        texto: `Você tem ${formatarMoeda(f.saldoMes)} de saldo em ${mes}. Para fechar no azul, dá para gastar cerca de ${formatarMoeda(f.limiteDiario)} por dia nos próximos ${f.diasRestantes} dias.`,
      });
    }
    if (f.saldoMes >= 0 && f.taxaPoupanca >= 0.2) {
      insights.push({
        id: "boa-poupanca", tipo: "positivo", prioridade: 58, titulo: "Boa taxa de poupança",
        texto: `Você guardou ${formatarPercentual(f.taxaPoupanca)} dos ganhos de ${mes} (${formatarMoeda(f.saldoMes)}).`,
      });
    } else if (f.saldoMes >= 0 && f.taxaPoupanca < 0.1) {
      insights.push({
        id: "sobra-pequena", tipo: "dica", prioridade: 62, titulo: "Sobra pequena no mês",
        texto: `Sobraram só ${formatarPercentual(f.taxaPoupanca)} dos ganhos de ${mes}. Uma meta comum é guardar de 10% a 20% do que entra.`,
      });
    }
  } else if (!r.temGanhos) {
    insights.push({
      id: "sem-ganhos", tipo: "info", prioridade: 38, titulo: "Registre seus ganhos",
      texto: "Cadastre o que você recebe para ver quanto sobra no mês e receber ajuda de planejamento.",
    });
  }

  // 7. Pouco histórico
  if (r.mesesComHistorico === 0) {
    insights.push({
      id: "primeiro-mes",
      tipo: "info",
      prioridade: 40,
      titulo: "Começando o histórico",
      texto: "Ainda não há meses anteriores registrados. Continue lançando seus gastos para receber comparações mês a mês.",
    });
  } else if (!insights.some((i) => i.tipo === "alerta")) {
    insights.push({
      id: "estavel",
      tipo: "positivo",
      prioridade: 30,
      titulo: "Gastos sob controle",
      texto: `Nenhuma categoria está fora do seu padrão ${periodo}.`,
    });
  }

  return insights.sort((a, b) => b.prioridade - a.prioridade).slice(0, MAX_INSIGHTS);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------------------------------------------------------------------------
// Texto automático (fallback sem IA)
// ---------------------------------------------------------------------------

export function conteudoAutomatico(r: ResumoFinanceiro): ConteudoAnalise {
  const maior = r.categorias[0];
  const verbo = r.mesEmAndamento ? "você já gastou" : "você gastou";
  let resumo = `Em ${r.nomeMes} ${verbo} ${formatarMoeda(r.totalMes)} em ${r.quantidadeMes} ${r.quantidadeMes === 1 ? "lançamento" : "lançamentos"}`;
  // Com uma única categoria, "destaque para X (mesmo valor do total)" só repete a informação.
  if (maior && r.categorias.filter((c) => c.total > 0).length > 1) {
    resumo += `, com destaque para ${maior.rotulo} (${formatarMoeda(maior.total)})`;
  }
  resumo += ".";
  if (r.projecaoMes !== null) {
    resumo += ` A estimativa é fechar o mês em torno de ${formatarMoeda(r.projecaoMes)}.`;
  }

  if (r.fluxo) {
    resumo += ` Os ganhos do mês somam ${formatarMoeda(r.fluxo.ganhosMes)} e o saldo está em ${formatarMoeda(r.fluxo.saldoMes)}.`;
  }

  const destaques = r.insights.filter((i) => i.tipo !== "dica").slice(0, 4);
  const dica = r.insights.find((i) => i.tipo === "dica");

  return {
    resumo,
    destaques: destaques.map(({ tipo, titulo, texto }) => ({ tipo, titulo, texto })),
    dica: dica ? dica.texto : null,
  };
}

/** Fatos compactos e já formatados, enviados ao modelo de linguagem. */
export function fatosParaIA(r: ResumoFinanceiro) {
  return {
    mes: r.nomeMes,
    situacao: r.mesEmAndamento
      ? `mês em andamento (dia ${r.diaAtual} de ${r.diasNoMes})`
      : "mês encerrado",
    totalGasto: formatarMoeda(r.totalMes),
    ganhosRegistrados: r.temGanhos,
    fluxo: r.fluxo
      ? {
          ganhosDoMes: formatarMoeda(r.fluxo.ganhosMes),
          saldoDoMes: formatarMoeda(r.fluxo.saldoMes),
          taxaDePoupanca: r.fluxo.taxaPoupanca >= 0 ? formatarPercentual(r.fluxo.taxaPoupanca) : null,
          saldoProjetadoNoFechamento: r.fluxo.saldoProjetado === null ? null : formatarMoeda(r.fluxo.saldoProjetado),
          podeGastarPorDia: r.fluxo.limiteDiario === null ? null : formatarMoeda(r.fluxo.limiteDiario),
          diasRestantes: r.fluxo.diasRestantes,
        }
      : null,
    quantidadeDeLancamentos: r.quantidadeMes,
    projecaoDeFechamento: r.projecaoMes === null ? null : formatarMoeda(r.projecaoMes),
    mesAnterior: r.mesAnterior
      ? {
          nome: r.mesAnterior.nome,
          total: formatarMoeda(r.mesAnterior.total),
          totalNoMesmoPeriodo: formatarMoeda(r.mesAnterior.totalMesmoPeriodo),
        }
      : null,
    variacaoNoMesmoPeriodo:
      r.variacaoMesmoPeriodo === null
        ? null
        : `${r.variacaoMesmoPeriodo >= 0 ? "+" : "-"}${formatarPercentual(r.variacaoMesmoPeriodo)}`,
    categorias: r.categorias
      .filter((c) => c.total > 0)
      .map((c) => ({
        nome: c.rotulo,
        total: formatarMoeda(c.total),
        participacao: formatarPercentual(c.percentual),
        lancamentos: c.quantidade,
        mediaMesesAnteriores: c.mediaAnterior === null ? null : formatarMoeda(c.mediaAnterior),
      })),
    fatosDetectados: r.insights.map((i) => ({ tipo: i.tipo, titulo: i.titulo, fato: i.texto })),
    mesesDeHistorico: r.mesesComHistorico,
  };
}
