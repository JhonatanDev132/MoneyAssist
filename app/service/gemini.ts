import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERRO: VITE_GEMINI_API_KEY não está definida no .env");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CACHE_KEY = "moneyassist_analise";

export interface Gasto {
  categoria: string;
  valor: number;
  data: string;
}

function gerarHashGastos(gastos: Gasto[]): string {
  return gastos
    .map((g) => `${g.categoria}:${g.valor}:${g.data}`)
    .sort()
    .join("|");
}

function lerCache(hash: string): string | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { h, t, texto } = JSON.parse(raw);
    if (h === hash && Date.now() - t < CACHE_DURATION) {
      console.log("✅ Usando análise em cache");
      return texto;
    }
  } catch {
    // sessionStorage indisponível (SSR) ou dado corrompido
  }
  return null;
}

function salvarCache(hash: string, texto: string): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ h: hash, t: Date.now(), texto }));
  } catch {
    // ignorar falha de escrita
  }
}

export async function analisarGastos(gastos: Gasto[]): Promise<string> {
  if (!apiKey) {
    throw new Error("Chave do Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env");
  }

  if (gastos.length === 0) {
    return "Você ainda não registrou nenhum gasto. Cadastre alguns gastos para receber dicas da IA!";
  }

  // Verifica cache no sessionStorage (sobrevive ao HMR do Vite)
  const hash = gerarHashGastos(gastos);
  const cached = lerCache(hash);
  if (cached) return cached;

  const total = gastos.reduce((soma, gasto) => soma + gasto.valor, 0);
  const porCategoria: Record<string, number> = {};

  gastos.forEach((gasto) => {
    porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] || 0) + gasto.valor;
  });

  const resumo = {
    totalGasto: Number(total.toFixed(2)),
    quantidadeDeGastos: gastos.length,
    gastosPorCategoria: Object.fromEntries(
      Object.entries(porCategoria).map(([categoria, valor]) => [
        categoria,
        Number(valor.toFixed(2)),
      ])
    ),
  };

  // Prompt enxuto — sem JSON formatado, menos tokens no contexto
  const linhasCategoria = Object.entries(resumo.gastosPorCategoria)
    .map(([cat, val]) => `${cat}: R$${val}`)
    .join(", ");

  const prompt = `Gastos totais: R$${resumo.totalGasto}. Por categoria: ${linhasCategoria}. Escreva 2-3 frases curtas em português: qual categoria gastou mais e uma dica de economia. Sem markdown.`;

  try {
    // Sem generationConfig — usa padrões nativos do modelo (evita latência por parâmetros descontinuados)
    let model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    try {
      const result = await model.generateContent(prompt);
      const texto = result.response.text();
      salvarCache(hash, texto);
      return texto;
    } catch (err: any) {
      // Fallback para modelo anterior em caso de sobrecarga (503)
      if (err?.message?.includes("503") || err?.message?.includes("high demand")) {
        console.log("⚠️ Modelo principal sobrecarregado, tentando alternativo...");
        model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent(prompt);
        const texto = result.response.text();
        salvarCache(hash, texto);
        return texto;
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ Erro ao chamar Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Erro ao analisar gastos: ${error.message}`);
    }
    throw error;
  }
}
