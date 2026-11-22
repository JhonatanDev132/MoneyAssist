const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERRO: VITE_GEMINI_API_KEY não está definida no .env");
}

// Configurações de Cache no localStorage
const CACHE_KEY = "moneyassist_cache_analise";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Trava para evitar requisições duplicadas simultâneas (ex: React StrictMode)
let requisicaoEmAndamento: { hash: string; promise: Promise<string> } | null = null;

export interface Gasto {
  categoria: string;
  valor: number;
  data: string;
}

function gerarHashGastos(gastos: Gasto[]): string {
  return gastos
    .map((g) => `${g.data}:${g.categoria}:${g.valor}`)
    .sort()
    .join("|");
}

function lerCache(hash: string): string | null {
  try {
    if (typeof window === "undefined") return null;

    const salvo = localStorage.getItem(CACHE_KEY);
    if (!salvo) return null;

    const dados = JSON.parse(salvo);
    const cacheValido =
      dados.hash === hash && Date.now() - dados.timestamp < CACHE_DURATION;

    return cacheValido ? dados.texto : null;
  } catch {
    return null;
  }
}

function salvarCache(hash: string, texto: string): void {
  try {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        hash,
        texto,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("⚠️ Não foi possível salvar o cache no localStorage:", error);
  }
}

export async function analisarGastos(gastos: Gasto[]): Promise<string> {
  if (!apiKey) {
    throw new Error("Chave do Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env");
  }

  if (gastos.length === 0) {
    return "Você ainda não registrou nenhum gasto. Cadastre alguns gastos para receber dicas da IA!";
  }

  const hash = gerarHashGastos(gastos);

  // 1. Verifica se já existe no localStorage
  const textoEmCache = lerCache(hash);
  if (textoEmCache) {
    console.log("✅ Usando análise salva no localStorage");
    return textoEmCache;
  }

  // 2. Se já existe uma requisição rodando para esses mesmos gastos, reaproveita ela
  if (requisicaoEmAndamento && requisicaoEmAndamento.hash === hash) {
    console.log("⏳ Aguardando requisição já em andamento...");
    return requisicaoEmAndamento.promise;
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

  const prompt = `Você é um assistente financeiro direto ao ponto. Analise estes gastos em R$:
  ${JSON.stringify(resumo)}

  Regras obrigatórias:
  - Responda em exatamente 2 frases curtas em português do Brasil, em um único parágrafo, sem listas, sem tópicos e sem markdown.
  - Não use saudações nem introduções (como "Com base nos seus gastos...").
  - Frase 1: Aponte a categoria que mais pesa no orçamento (cite o valor em R$ e o percentual aproximado do total) ou um padrão relevante.
  - Frase 2: Dê uma dica prática e específica de economia voltada diretamente para essa categoria.`;

  const executarRequisicao = async (): Promise<string> => {
    try {
      console.time("⏱️ Tempo Gemini");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        }
      );

      const data = await response.json();
      console.timeEnd("⏱️ Tempo Gemini");

      if (!response.ok) {
        throw new Error(data.error?.message || `Erro HTTP ${response.status}`);
      }

      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (texto) {
        salvarCache(hash, texto);
      }

      return texto;
    } catch (error) {
      console.error("❌ Erro ao chamar Gemini:", error);
      if (error instanceof Error) {
        throw new Error(`Erro ao analisar gastos: ${error.message}`);
      }
      throw error;
    } finally {
      requisicaoEmAndamento = null;
    }
  };

  const promise = executarRequisicao();
  requisicaoEmAndamento = { hash, promise };

  return promise;
}