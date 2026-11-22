/**
 * Camada 2: o Gemini como redator.
 *
 * Recebe os fatos que o motor local já calculou e devolve só texto estruturado.
 * Roda apenas no servidor (sufixo .server.ts), então a chave nunca vai ao navegador.
 *
 * Princípios:
 *  - a IA não faz conta: qualquer número no texto precisa existir nos fatos enviados;
 *  - toda saída é validada; se algo estiver fora do contrato, é descartada;
 *  - falhas nunca chegam ao usuário (quem chama cai no texto automático do motor).
 */

import { fatosParaIA, type ConteudoAnalise, type Destaque, type ResumoFinanceiro, type TipoDestaque } from "./motor";
import { TIPOS_DESTAQUE } from "./contrato";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/**
 * Ordem de tentativa. Os modelos Flash-Lite têm a camada grátis mais folgada e
 * sobram para reescrever texto. A cota grátis é por modelo, então cair para o
 * próximo da lista ajuda quando um deles estoura. Sobrescreva com GEMINI_MODELS
 * (ids separados por vírgula) sem precisar mexer no código quando os modelos mudarem.
 */
const MODELOS_PADRAO = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-3.5-flash"];

function listaDeModelos(): string[] {
  const env = process.env.GEMINI_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return env && env.length > 0 ? env : MODELOS_PADRAO;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;
const MAX_TENTATIVAS = 3;

// ---------------------------------------------------------------------------
// Erros e disjuntor
// ---------------------------------------------------------------------------

export type CausaFalhaIA = "sem_chave" | "cota" | "indisponivel" | "saida_invalida";

export class ErroIA extends Error {
  constructor(
    public causa: CausaFalhaIA,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

/**
 * Se a cota estourou (429), parar de chamar por um tempo em vez de martelar a API
 * a cada visita de cada usuário.
 */
let bloqueadoAte = 0;
const PAUSA_COTA_MS = 10 * 60 * 1000;
const PAUSA_INSTAVEL_MS = 60 * 1000;

export function iaEmPausa(agora = Date.now()): boolean {
  return agora < bloqueadoAte;
}

/** Só para testes. */
export function reiniciarDisjuntor(): void {
  bloqueadoAte = 0;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SISTEMA = `Você é o assistente financeiro do MoneyAssist, um app de controle de gastos e ganhos pessoais. Fala com a pessoa em português do Brasil, em tom próximo e direto, tratando por "você". Não faz sermão e não julga.

Você recebe FATOS em JSON, já calculados pelo app. Sua tarefa é apenas redigir e priorizar. Quem faz as contas é o app, não você.

REGRAS
1. Use SOMENTE números que aparecem nos fatos, copiados exatamente como estão (ex.: "R$ 1.423,67", "+38%"). Nunca some, subtraia, arredonde, converta nem estime valores. Se um número não está nos fatos, não o cite.
2. Não invente categorias, datas, motivos ou eventos. Não afirme por que a pessoa gastou; no máximo levante uma hipótese com "pode ser".
3. Não dê conselho de investimento, crédito ou imposto.
4. Se mesesDeHistorico for 0, não compare com meses anteriores.
5. Com poucos lançamentos, seja cauteloso e não generalize.

ESTILO
- resumo: no máximo 2 frases. Comece pelo que mais importa agora (ritmo/projeção ou a maior mudança). Não abra com cumprimento e não repita o total só por repetir.
- destaques: de 2 a 4, do mais importante para o menos importante. Cada um parte de um item de fatosDetectados e mantém o mesmo tipo. Diga o que aconteceu e por que importa, usando os números dos fatos. titulo com até 40 caracteres; texto com até 2 frases.
- dica: UMA ação concreta e pequena, ligada ao maior destaque negativo (ou ao maior gasto, se não houver). Quando existir "fluxo" (ganhos do mês), priorize o PLANEJAMENTO: saldo do mês, taxa de poupança e quanto dá para gastar por dia, sempre com os números prontos dos fatos. Se "fluxo" for null, não fale de ganhos, saldo nem poupança. Diga o que fazer e, se der, cite um número dos fatos como referência. Evite conselhos genéricos como "gaste menos" ou "faça um orçamento".
- Sem markdown, sem emojis, sem listas dentro dos textos.

EXEMPLO DE TOM E FORMATO (valores fictícios; NÃO reutilize estes números):
{"resumo":"Seus gastos de março estão num ritmo mais alto que o de fevereiro: a estimativa é fechar em R$ 2.310,00, contra R$ 1.850,00. O principal responsável é Alimentação.","destaques":[{"tipo":"alerta","titulo":"Alimentação disparou","texto":"Você já gastou R$ 640,00 com Alimentação, bem acima da média de R$ 410,00 no mesmo período. Pode ser reflexo de mais pedidos de delivery."},{"tipo":"positivo","titulo":"Transporte em queda","texto":"R$ 120,00 com Transporte, abaixo da média de R$ 190,00 dos últimos meses."}],"dica":"Escolha dois dias da semana para cozinhar em casa: com 16 lançamentos em Alimentação, trocar poucos pedidos já reduz esse total."}`;

const ESQUISSA_SAIDA = {
  type: "object",
  properties: {
    resumo: { type: "string", description: "No máximo 2 frases, começando pelo ponto mais importante." },
    destaques: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: [...TIPOS_DESTAQUE], description: "Mesmo tipo do fato de origem." },
          titulo: { type: "string", description: "Até 40 caracteres." },
          texto: { type: "string", description: "Até 2 frases, só com números presentes nos fatos." },
        },
        required: ["tipo", "titulo", "texto"],
      },
    },
    dica: { type: "string", description: "Uma ação concreta e pequena." },
  },
  required: ["resumo", "destaques", "dica"],
} as const;

function montarConteudoUsuario(r: ResumoFinanceiro): { texto: string; fatos: string } {
  const fatos = JSON.stringify(fatosParaIA(r));
  return { fatos, texto: `FATOS:\n${fatos}\n\nEscreva a análise agora.` };
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const RE_MOEDA = /R\$\s?(\d[\d.]*(?:,\d+)?)/g;
const RE_PERCENTUAL = /(\d+(?:,\d+)?)\s?%/g;

function paraNumero(bruto: string): number {
  return Number(bruto.replace(/\./g, "").replace(",", "."));
}

function extrairValores(texto: string): { moedas: number[]; percentuais: number[] } {
  const moedas = [...texto.matchAll(RE_MOEDA)].map((m) => paraNumero(m[1]));
  const percentuais = [...texto.matchAll(RE_PERCENTUAL)].map((m) => paraNumero(m[1]));
  return { moedas, percentuais };
}

/**
 * Devolve os números citados no texto que NÃO existem nos fatos.
 * Lista vazia = a IA só usou o que recebeu.
 */
export function numerosInventados(textos: string[], fatosJson: string): string[] {
  const permitido = extrairValores(fatosJson);
  const usado = extrairValores(textos.join("\n"));
  const existe = (lista: number[], v: number) => lista.some((p) => Math.abs(p - v) < 0.005);
  return [
    ...usado.moedas.filter((v) => !existe(permitido.moedas, v)).map((v) => `R$ ${v}`),
    ...usado.percentuais.filter((v) => !existe(permitido.percentuais, v)).map((v) => `${v}%`),
  ];
}

function limpar(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.replace(/\s+/g, " ").trim();
  return t.length > max ? "" : t;
}

export function validarConteudo(bruto: unknown, r: ResumoFinanceiro, fatosJson: string): ConteudoAnalise {
  if (!bruto || typeof bruto !== "object") throw new ErroIA("saida_invalida", "A resposta não é um objeto.");
  const o = bruto as Record<string, unknown>;

  const resumo = limpar(o.resumo, 420);
  if (resumo.length < 20) throw new ErroIA("saida_invalida", "Resumo ausente, curto ou longo demais.");

  // Só aceita um tipo de destaque que realmente exista nos fatos (impede "positivo" inventado).
  const tiposPresentes = new Set<TipoDestaque>(r.insights.map((i) => i.tipo));
  const brutos = Array.isArray(o.destaques) ? o.destaques : [];
  const destaques: Destaque[] = [];
  for (const item of brutos) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    const tipo = d.tipo as TipoDestaque;
    const titulo = limpar(d.titulo, 70);
    const texto = limpar(d.texto, 340);
    if (!TIPOS_DESTAQUE.includes(tipo) || !tiposPresentes.has(tipo) || !titulo || !texto) continue;
    destaques.push({ tipo, titulo, texto });
    if (destaques.length === 4) break;
  }
  if (destaques.length === 0) throw new ErroIA("saida_invalida", "Nenhum destaque válido.");

  const dica = limpar(o.dica, 340) || null;

  const inventados = numerosInventados(
    [resumo, dica ?? "", ...destaques.flatMap((d) => [d.titulo, d.texto])],
    fatosJson,
  );
  if (inventados.length > 0) {
    throw new ErroIA("saida_invalida", `Números que não estão nos fatos: ${inventados.join(", ")}`);
  }

  return { resumo, destaques, dica };
}

// ---------------------------------------------------------------------------
// Chamada HTTP (REST, sem SDK: o pacote @google/generative-ai foi descontinuado)
// ---------------------------------------------------------------------------

type FormatoSaida = "novo" | "legado";
/** Lembra qual formato de JSON estruturado a API aceitou, para não gastar chamada à toa. */
let formatoPreferido: FormatoSaida = "novo";

function montarCorpo(usuario: string, formato: FormatoSaida) {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: 2048 };
  if (formato === "novo") {
    generationConfig.responseFormat = { text: { mimeType: "application/json", schema: ESQUISSA_SAIDA } };
  } else {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseJsonSchema = ESQUISSA_SAIDA;
  }
  return {
    systemInstruction: { parts: [{ text: SISTEMA }] },
    contents: [{ role: "user", parts: [{ text: usuario }] }],
    generationConfig,
  };
}

interface RespostaHttp {
  status: number;
  corpo: any;
  bruto: string;
}

async function postar(
  fetchImpl: typeof fetch,
  modelo: string,
  chave: string,
  usuario: string,
  formato: FormatoSaida,
): Promise<RespostaHttp> {
  const resp = await fetchImpl(`${API_BASE}/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify(montarCorpo(usuario, formato)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const bruto = await resp.text();
  let corpo: any = null;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    // corpo não-JSON (ex.: página de erro de proxy)
  }
  return { status: resp.status, corpo, bruto };
}

function extrairTexto(corpo: any): string {
  const candidato = corpo?.candidates?.[0];
  if (!candidato) throw new ErroIA("saida_invalida", corpo?.promptFeedback?.blockReason ?? "Sem candidatos.");
  if (candidato.finishReason && candidato.finishReason !== "STOP") {
    throw new ErroIA("saida_invalida", `finishReason=${candidato.finishReason}`);
  }
  const partes: any[] = candidato.content?.parts ?? [];
  // Ignora partes de "raciocínio" (thought) quando o modelo as devolve.
  return partes
    .filter((p) => typeof p?.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .replace(/^```(?:json)?\s*|\s*```$/g, "")
    .trim();
}

export interface ResultadoIA {
  conteudo: ConteudoAnalise;
  modelo: string;
}

export async function redigirComGemini(
  r: ResumoFinanceiro,
  opcoes: { fetchImpl?: typeof fetch; agora?: number } = {},
): Promise<ResultadoIA> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroIA("sem_chave", "GEMINI_API_KEY não está definida no servidor.");
  if (iaEmPausa(opcoes.agora)) throw new ErroIA("cota", "IA em pausa após falhas recentes.");

  const fetchImpl = opcoes.fetchImpl ?? fetch;
  const { texto: usuario, fatos } = montarConteudoUsuario(r);
  const falhas: ErroIA[] = [];

  for (const modelo of listaDeModelos().slice(0, MAX_TENTATIVAS)) {
    try {
      let formato = formatoPreferido;
      let resp = await postar(fetchImpl, modelo, chave, usuario, formato);

      // 400 geralmente significa que o formato de JSON estruturado não é aceito: tenta o outro.
      if (resp.status === 400) {
        const outro: FormatoSaida = formato === "novo" ? "legado" : "novo";
        const retentativa = await postar(fetchImpl, modelo, chave, usuario, outro);
        if (retentativa.status === 200) {
          formatoPreferido = outro;
          formato = outro;
          resp = retentativa;
        }
      }

      if (resp.status === 429) throw new ErroIA("cota", `${modelo}: cota esgotada (429)`);
      if (resp.status >= 500) throw new ErroIA("indisponivel", `${modelo}: HTTP ${resp.status}`);
      if (resp.status !== 200) {
        throw new ErroIA("indisponivel", `${modelo}: HTTP ${resp.status} ${resp.bruto.slice(0, 200)}`);
      }

      const json = JSON.parse(extrairTexto(resp.corpo));
      const conteudo = validarConteudo(json, r, fatos);
      return { conteudo, modelo };
    } catch (erro) {
      const e =
        erro instanceof ErroIA
          ? erro
          : new ErroIA("indisponivel", `${modelo}: ${erro instanceof Error ? erro.message : String(erro)}`);
      console.warn(`[analise] ${e.causa} - ${e.message}`);
      falhas.push(e);
    }
  }

  // Todos falharam: pausa curta (ou longa, se foi só cota) para não martelar a API.
  const soCota = falhas.every((f) => f.causa === "cota");
  bloqueadoAte = (opcoes.agora ?? Date.now()) + (soCota ? PAUSA_COTA_MS : PAUSA_INSTAVEL_MS);
  throw falhas[falhas.length - 1] ?? new ErroIA("indisponivel", "Nenhum modelo configurado.");
}
