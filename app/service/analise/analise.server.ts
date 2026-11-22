/**
 * Orquestra uma solicitação de análise no servidor:
 *
 *   gastos (lidos do Firebase, nunca confiados ao cliente)
 *     → motor local calcula os fatos
 *     → cache por hash (se nada mudou, devolve o que já existe: custo zero)
 *     → limite diário (reserva atômica)
 *     → Gemini redige → valida → salva
 *
 * Qualquer falha vira `status: "indisponivel"`. Quem chama continua mostrando o
 * texto automático do motor, então o usuário nunca vê uma mensagem de erro.
 */

import { gerarResumo, hashGastos, type ResumoFinanceiro } from "./motor";
import {
  diaBrasil,
  LIMITE_DIARIO_PADRAO,
  MIN_LANCAMENTOS_IA,
  usosRestantes,
  type AnaliseSalva,
  type RespostaAnalise,
} from "./contrato";
import { ErroIA, iaEmPausa, redigirComGemini, type ResultadoIA } from "./gemini.server";
import type { Armazenamento } from "./armazenamento.server";

export interface Dependencias {
  armazenamento: Armazenamento;
  redigir: (resumo: ResumoFinanceiro) => Promise<ResultadoIA>;
  iaEmPausa: () => boolean;
  agora: () => number;
}

export function dependenciasPadrao(armazenamento: Armazenamento): Dependencias {
  return { armazenamento, redigir: (r) => redigirComGemini(r), iaEmPausa: () => iaEmPausa(), agora: () => Date.now() };
}

export function limiteDiario(): number {
  const n = Number.parseInt(process.env.ANALISE_LIMITE_DIARIO ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : LIMITE_DIARIO_PADRAO;
}

/**
 * O navegador informa a data local dele (para o "hoje" bater com o que o usuário vê).
 * Só aceitamos até 1 dia de diferença da data de São Paulo; fora disso, vale a do servidor.
 */
export function resolverHoje(hojeCliente: unknown, agora: Date): string {
  const servidor = diaBrasil(agora);
  if (typeof hojeCliente === "string" && /^\d{4}-\d{2}-\d{2}$/.test(hojeCliente)) {
    const diferenca = Math.abs(Date.parse(`${hojeCliente}T00:00:00Z`) - Date.parse(`${servidor}T00:00:00Z`));
    if (diferenca <= 24 * 60 * 60 * 1000) return hojeCliente;
  }
  return servidor;
}

/** Evita duas gerações simultâneas para o mesmo usuário (duplo clique, duas abas). */
const emAndamento = new Map<string, Promise<RespostaAnalise>>();

export function obterAnalise(dep: Dependencias, uid: string, hojeCliente: unknown): Promise<RespostaAnalise> {
  const atual = emAndamento.get(uid);
  if (atual) return atual;
  const promessa = executar(dep, uid, hojeCliente).finally(() => emAndamento.delete(uid));
  emAndamento.set(uid, promessa);
  return promessa;
}

async function executar(dep: Dependencias, uid: string, hojeCliente: unknown): Promise<RespostaAnalise> {
  const { armazenamento: db } = dep;
  const agora = new Date(dep.agora());
  const hoje = resolverHoje(hojeCliente, agora);
  const dia = diaBrasil(agora);
  const limite = limiteDiario();

  const gastos = await db.lerGastos(uid);
  const ganhos = await db.lerGanhos(uid).catch(() => []); // sem ganhos (ou regra ausente) a análise segue só com gastos
  const resumo = gastos.length >= MIN_LANCAMENTOS_IA ? gerarResumo(gastos, hoje, ganhos) : null;
  if (!resumo) return { status: "indisponivel", motivo: "sem_dados" };

  const hash = hashGastos(gastos, hoje, ganhos);

  // 1) Nada mudou desde a última geração → devolve o que já existe, sem gastar cota.
  const salva = await db.lerSalva(uid);
  if (salva && salva.hash === hash) {
    return { status: "cache", analise: salva, usosRestantes: usosRestantes(await db.lerUso(uid), dia, limite) };
  }

  // 2) IA em pausa por falhas recentes → não reserva nada.
  if (dep.iaEmPausa()) {
    return { status: "indisponivel", motivo: "ia_indisponivel", usosRestantes: usosRestantes(await db.lerUso(uid), dia, limite) };
  }

  // 3) Limite diário.
  const reserva = await db.reservarUso(uid, dia, limite);
  if (!reserva.ok) return { status: "indisponivel", motivo: "limite_diario", usosRestantes: 0 };

  // 4) Gemini redige. Se falhar, devolve o uso e deixa o texto automático valer.
  try {
    const { conteudo, modelo } = await dep.redigir(resumo);
    const analise: AnaliseSalva = {
      hash,
      geradoEm: dep.agora(),
      mes: resumo.mesReferencia,
      modelo,
      conteudo: { resumo: conteudo.resumo, destaques: conteudo.destaques, dica: conteudo.dica },
    };
    await db.salvar(uid, analise);
    return { status: "ok", analise, usosRestantes: Math.max(0, limite - reserva.usos) };
  } catch (erro) {
    await db.liberarUso(uid, dia).catch(() => {});
    if (!(erro instanceof ErroIA)) console.error("[analise] erro inesperado:", erro);
    const motivo = erro instanceof ErroIA && erro.causa === "sem_chave" ? "nao_configurado" : "ia_indisponivel";
    return { status: "indisponivel", motivo, usosRestantes: Math.max(0, limite - reserva.usos + 1) };
  }
}
