export type TipoLancamento = "gasto" | "ganho";

export const CATEGORIAS_GASTO = [
  { valor: "alimentacao", rotulo: "Alimentação", emoji: "🍽️" },
  { valor: "transporte", rotulo: "Transporte", emoji: "🚌" },
  { valor: "lazer", rotulo: "Lazer", emoji: "🎮" },
  { valor: "saude", rotulo: "Saúde", emoji: "💊" },
  { valor: "educacao", rotulo: "Educação", emoji: "📚" },
  { valor: "outros", rotulo: "Outros", emoji: "✨" },
];

export const CATEGORIAS_GANHO = [
  { valor: "salario", rotulo: "Salário", emoji: "💼" },
  { valor: "freelance", rotulo: "Freelance", emoji: "🧑‍💻" },
  { valor: "investimentos", rotulo: "Investimentos", emoji: "📈" },
  { valor: "presente", rotulo: "Presente", emoji: "🎁" },
  { valor: "outros", rotulo: "Outros", emoji: "✨" },
];

export const categoriasDo = (tipo: TipoLancamento) => (tipo === "gasto" ? CATEGORIAS_GASTO : CATEGORIAS_GANHO);

/** Nó do Realtime Database de cada tipo. */
export const caminhoLancamentos = (uid: string, tipo: TipoLancamento) =>
  `usuarios/${uid}/${tipo === "gasto" ? "gastos" : "ganhos"}`;
