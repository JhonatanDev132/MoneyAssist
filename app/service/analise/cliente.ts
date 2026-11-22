/**
 * Lado do navegador: pede ao servidor uma análise gerada por IA.
 * Nunca lança: qualquer falha vira { status: "indisponivel" } para a tela
 * continuar mostrando a análise automática.
 */

import type { User } from "firebase/auth";
import type { RespostaAnalise } from "./contrato";

export async function solicitarAnalise(user: User, hoje: string): Promise<RespostaAnalise> {
  try {
    const token = await user.getIdToken();
    const resp = await fetch("/api/analise", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hoje }),
      signal: AbortSignal.timeout(45_000),
    });
    const corpo = (await resp.json()) as RespostaAnalise;
    if (corpo && typeof corpo === "object" && "status" in corpo) return corpo;
    return { status: "indisponivel", motivo: "ia_indisponivel" };
  } catch (erro) {
    console.warn("[analise] falha ao falar com o servidor:", erro);
    return { status: "indisponivel", motivo: "rede" };
  }
}
