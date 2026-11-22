/**
 * Contrato compartilhado entre navegador e servidor.
 * Sem dependências de browser/Node e só imports relativos.
 */

import type { ConteudoAnalise, Destaque, TipoDestaque } from "./motor";

/** Quantas análises de IA cada usuário pode gerar por dia (protege a cota grátis). */
export const LIMITE_DIARIO_PADRAO = 5;

/**
 * Depois de ter uma análise salva, a geração automática (ao abrir a tela) só
 * roda de novo passado esse tempo. O botão manual não respeita esse intervalo.
 */
export const INTERVALO_AUTO_MS = 6 * 60 * 60 * 1000;

/** Mínimo de lançamentos para valer a pena chamar a IA. Abaixo disso, só o motor local. */
export const MIN_LANCAMENTOS_IA = 3;

export const TIPOS_DESTAQUE: readonly TipoDestaque[] = ["alerta", "positivo", "dica", "info"];

/** Análise gerada pela IA e guardada em `usuarios/{uid}/analise` (só o servidor escreve). */
export interface AnaliseSalva {
  hash: string; // hashGastos() dos gastos que originaram o texto
  geradoEm: number; // epoch ms
  mes: string; // YYYY-MM analisado
  modelo: string;
  conteudo: ConteudoAnalise;
}

/** Contador diário em `usuarios/{uid}/analiseUso` (só o servidor escreve). */
export interface UsoDiario {
  dia: string; // YYYY-MM-DD (America/Sao_Paulo)
  usos: number;
  limite: number;
}

export type MotivoIndisponivel =
  | "sem_dados"
  | "limite_diario"
  | "ia_indisponivel"
  | "nao_configurado"
  | "rede"
  | "nao_autenticado";

export type RespostaAnalise =
  | { status: "ok" | "cache"; analise: AnaliseSalva; usosRestantes: number }
  | { status: "indisponivel"; motivo: MotivoIndisponivel; usosRestantes?: number };

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo, independente do fuso do servidor. */
export function diaBrasil(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function usosRestantes(uso: UsoDiario | null, hoje: string, limitePadrao = LIMITE_DIARIO_PADRAO): number {
  if (!uso || uso.dia !== hoje) return limitePadrao;
  return Math.max(0, (uso.limite || limitePadrao) - uso.usos);
}

// ---------------------------------------------------------------------------
// Normalização do que volta do Realtime Database
// O RTDB descarta arrays vazios e campos nulos, então nada pode ser assumido.
// ---------------------------------------------------------------------------

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function normalizarDestaques(bruto: unknown): Destaque[] {
  const lista = Array.isArray(bruto) ? bruto : bruto && typeof bruto === "object" ? Object.values(bruto) : [];
  const saida: Destaque[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const { tipo, titulo, texto: corpo } = item as Record<string, unknown>;
    if (!TIPOS_DESTAQUE.includes(tipo as TipoDestaque)) continue;
    if (!texto(titulo) || !texto(corpo)) continue;
    saida.push({ tipo: tipo as TipoDestaque, titulo: texto(titulo), texto: texto(corpo) });
  }
  return saida;
}

export function normalizarSalva(bruto: unknown): AnaliseSalva | null {
  if (!bruto || typeof bruto !== "object") return null;
  const b = bruto as Record<string, any>;
  if (!texto(b.hash) || typeof b.geradoEm !== "number" || !b.conteudo || !texto(b.conteudo.resumo)) return null;
  return {
    hash: b.hash,
    geradoEm: b.geradoEm,
    mes: texto(b.mes),
    modelo: texto(b.modelo),
    conteudo: {
      resumo: b.conteudo.resumo,
      destaques: normalizarDestaques(b.conteudo.destaques),
      dica: texto(b.conteudo.dica) || null,
    },
  };
}

export function normalizarUso(bruto: unknown): UsoDiario | null {
  if (!bruto || typeof bruto !== "object") return null;
  const b = bruto as Record<string, unknown>;
  if (!texto(b.dia) || typeof b.usos !== "number") return null;
  return { dia: b.dia as string, usos: b.usos, limite: typeof b.limite === "number" ? b.limite : LIMITE_DIARIO_PADRAO };
}
