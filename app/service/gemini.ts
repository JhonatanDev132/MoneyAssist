import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERRO: VITE_GEMINI_API_KEY não está definida no .env");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Cache da última análise
let cacheAnalise: { hash: string; texto: string; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export interface Gasto {
  categoria: string;
  valor: number;
  data: string;
}

function gerarHashGastos(gastos: Gasto[]): string {
  const resumo = gastos
    .map((g) => `${g.categoria}:${g.valor}`)
    .sort()
    .join("|");
  return resumo;
}

export async function analisarGastos(gastos: Gasto[]): Promise<string> {
  if (!apiKey) {
    throw new Error("Chave do Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env");
  }

  if (gastos.length === 0) {
    return "Você ainda não registrou nenhum gasto. Cadastre alguns gastos para receber dicas da IA!";
  }

  // Verifica cache
  const hash = gerarHashGastos(gastos);
  const agora = Date.now();

  if (cacheAnalise && cacheAnalise.hash === hash && agora - cacheAnalise.timestamp < CACHE_DURATION) {
    console.log("✅ Usando análise em cache");
    return cacheAnalise.texto;
  }

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

  try {
    // Tenta primeiro o modelo mais recente
    let model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    const prompt = `Analise brevemente os gastos em R$:
${JSON.stringify(resumo, null, 2)}

Escreva apenas 2-3 frases curtas em português:
1. Categoria com mais gasto
2. Uma dica rápida de economia

Sem markdown, direto ao ponto.`;

    try {
      const result = await model.generateContent(prompt);
      const texto = result.response.text();

      // Salva no cache
      cacheAnalise = { hash, texto, timestamp: agora };

      return texto;
    } catch (err: any) {
      // Se 503 (high demand), tenta modelo alternativo
      if (err?.message?.includes('503') || err?.message?.includes('high demand')) {
        console.log("⚠️ Modelo principal sobrecarregado, tentando alternativo...");

        model = genAI.getGenerativeModel({
          model: "gemini-3.6-flash",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
          }
        });

        const result = await model.generateContent(prompt);
        const texto = result.response.text();

        cacheAnalise = { hash, texto, timestamp: agora };
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
