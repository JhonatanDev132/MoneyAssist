import type { Route } from "./+types/api.analise";
import { dependenciasPadrao, obterAnalise } from "~/service/analise/analise.server";
import { armazenamentoFirebase, ErroConfiguracao, verificarToken } from "~/service/analise/armazenamento.server";
import type { RespostaAnalise } from "~/service/analise/contrato";

/** Esta rota só aceita POST; um GET (ex.: alguém abrindo a URL no navegador) recebe 405 em vez de erro interno. */
export function loader() {
  return Response.json({ erro: "Use POST" }, { status: 405, headers: { Allow: "POST" } });
}

/**
 * POST /api/analise
 *
 * Cabeçalho: Authorization: Bearer <ID token do Firebase>
 * Corpo:     { "hoje": "YYYY-MM-DD" }  (data local do usuário; opcional)
 *
 * Resposta: sempre JSON de RespostaAnalise. Falhas da IA viram
 * { status: "indisponivel", motivo } com HTTP 200: o app continua mostrando a
 * análise automática. Só token ausente/inválido responde 401.
 */
export async function action({ request }: Route.ActionArgs) {
  const semCache = { "Cache-Control": "no-store" };
  const responder = (corpo: RespostaAnalise, status = 200) => Response.json(corpo, { status, headers: semCache });

  if (request.method !== "POST") {
    return Response.json({ erro: "Método não permitido" }, { status: 405, headers: { Allow: "POST" } });
  }

  const token = /^Bearer (.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) return responder({ status: "indisponivel", motivo: "nao_autenticado" }, 401);

  try {
    const uid = await verificarToken(token);

    let hoje: unknown;
    try {
      hoje = ((await request.json()) as { hoje?: unknown })?.hoje;
    } catch {
      // corpo vazio ou inválido: o servidor usa a data de São Paulo
    }

    const resposta = await obterAnalise(dependenciasPadrao(armazenamentoFirebase()), uid, hoje);
    return responder(resposta);
  } catch (erro) {
    if (erro instanceof ErroConfiguracao) {
      console.error("[analise] configuração do servidor incompleta:", erro.message);
      return responder({ status: "indisponivel", motivo: "nao_configurado" });
    }
    // Token expirado/inválido (firebase-admin lança erros com código auth/...)
    const codigo = (erro as { code?: string })?.code ?? "";
    if (codigo.startsWith("auth/")) return responder({ status: "indisponivel", motivo: "nao_autenticado" }, 401);
    console.error("[analise] erro inesperado:", erro);
    return responder({ status: "indisponivel", motivo: "ia_indisponivel" });
  }
}
