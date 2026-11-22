/**
 * Acesso ao Firebase pelo servidor (Admin SDK).
 *
 * Por que Admin SDK: ele ignora as regras do Realtime Database, então só o servidor
 * consegue escrever `analise` e `analiseUso`. O navegador pode ler, mas nunca
 * adulterar o contador diário nem fabricar uma "análise".
 */

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import type { Gasto } from "./motor";
import { normalizarSalva, type AnaliseSalva } from "./contrato";

export class ErroConfiguracao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroConfiguracao";
  }
}

let app: App | null = null;

function iniciar(): App {
  if (app) return app;
  const existente = getApps()[0];
  if (existente) return (app = existente);

  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  let credential;
  let projectId = process.env.FIREBASE_PROJECT_ID;

  if (bruto) {
    // Aceita o JSON puro ou ele codificado em base64 (mais fácil de colocar em variável de ambiente).
    const json = bruto.startsWith("{") ? bruto : Buffer.from(bruto, "base64").toString("utf8");
    let conta: Record<string, string>;
    try {
      conta = JSON.parse(json);
    } catch {
      throw new ErroConfiguracao("FIREBASE_SERVICE_ACCOUNT não é um JSON válido (nem base64 de um JSON).");
    }
    credential = cert(conta);
    projectId = conta.project_id ?? projectId;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  } else {
    throw new ErroConfiguracao("Defina FIREBASE_SERVICE_ACCOUNT (ou GOOGLE_APPLICATION_CREDENTIALS) no servidor.");
  }

  if (!projectId) throw new ErroConfiguracao("Não foi possível descobrir o projectId do Firebase.");

  app = initializeApp({
    credential,
    projectId,
    databaseURL: process.env.FIREBASE_DATABASE_URL ?? `https://${projectId}-default-rtdb.firebaseio.com`,
  });
  return app;
}

/** Valida o token de login enviado pelo navegador e devolve o uid. Lança se inválido. */
export async function verificarToken(token: string): Promise<string> {
  const decodificado = await getAuth(iniciar()).verifyIdToken(token);
  return decodificado.uid;
}

export interface Armazenamento {
  lerGastos(uid: string): Promise<Gasto[]>;
  lerGanhos(uid: string): Promise<Gasto[]>;
  lerSalva(uid: string): Promise<AnaliseSalva | null>;
  lerUso(uid: string): Promise<{ dia: string; usos: number; limite: number } | null>;
  salvar(uid: string, analise: AnaliseSalva): Promise<void>;
  /** Reserva 1 uso do dia de forma atômica. `ok=false` se o limite já foi atingido. */
  reservarUso(uid: string, dia: string, limite: number): Promise<{ ok: boolean; usos: number }>;
  /** Devolve um uso reservado (quando a IA falhou, o usuário não perde a cota). */
  liberarUso(uid: string, dia: string): Promise<void>;
}

export function armazenamentoFirebase(): Armazenamento {
  const db = getDatabase(iniciar());

  return {
    async lerGastos(uid) {
      const snap = await db.ref(`usuarios/${uid}/gastos`).get();
      const dados = (snap.val() ?? {}) as Record<string, any>;
      return Object.values(dados).map((g) => ({
        categoria: String(g?.categoria ?? "Outros"),
        valor: Number(g?.valor ?? 0),
        data: String(g?.data ?? ""),
      }));
    },

    async lerGanhos(uid) {
      const snap = await db.ref(`usuarios/${uid}/ganhos`).get();
      const dados = (snap.val() ?? {}) as Record<string, any>;
      return Object.values(dados).map((g) => ({
        categoria: String(g?.categoria ?? "Outros"),
        valor: Number(g?.valor ?? 0),
        data: String(g?.data ?? ""),
      }));
    },

    async lerSalva(uid) {
      const snap = await db.ref(`usuarios/${uid}/analise`).get();
      return normalizarSalva(snap.val());
    },

    async lerUso(uid) {
      const snap = await db.ref(`usuarios/${uid}/analiseUso`).get();
      const v = snap.val();
      return v && typeof v.dia === "string" && typeof v.usos === "number"
        ? { dia: v.dia, usos: v.usos, limite: typeof v.limite === "number" ? v.limite : 0 }
        : null;
    },

    async salvar(uid, analise) {
      await db.ref(`usuarios/${uid}/analise`).set(analise);
    },

    async reservarUso(uid, dia, limite) {
      let usos = 0;
      const resultado = await db.ref(`usuarios/${uid}/analiseUso`).transaction((atual) => {
        const n = atual && atual.dia === dia ? Number(atual.usos) || 0 : 0;
        if (n >= limite) return; // undefined aborta a transação
        usos = n + 1;
        return { dia, usos, limite };
      });
      return { ok: resultado.committed, usos: resultado.committed ? usos : limite };
    },

    async liberarUso(uid, dia) {
      await db.ref(`usuarios/${uid}/analiseUso`).transaction((atual) => {
        if (!atual || atual.dia !== dia || !(atual.usos > 0)) return;
        return { ...atual, usos: atual.usos - 1 };
      });
    },
  };
}
