import type { ReactNode } from "react";

export const classeInput =
  "w-full rounded-lg border border-surface-border bg-bg-dark px-3 py-2.5 text-white placeholder:text-zinc-500 " +
  "transition-colors hover:border-zinc-600 focus:border-brand-yellow disabled:opacity-60";

export const classeBotaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-on-brand " +
  "transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60";

export const classeBotaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 font-medium text-zinc-100 " +
  "transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Campo({ id, rotulo, dica, erro, children }: { id: string; rotulo: string; dica?: string; erro?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-200">{rotulo}</label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-sm text-red-400">{erro}</p>
      ) : dica ? (
        <p className="text-xs text-zinc-500">{dica}</p>
      ) : null}
    </div>
  );
}

export function EstadoVazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border px-6 py-12 text-center">
      <span aria-hidden="true" className="text-3xl">🪙</span>
      <p className="font-semibold text-white">{titulo}</p>
      <p className="max-w-sm text-sm text-zinc-400">{texto}</p>
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  );
}

/** "2026-11-09" -> "09 nov 2026" (sem deslocar o dia por fuso horário). */
export function formatarData(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "Sem data";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(d)
    .replace(/\./g, "");
}

export function mensagemErroAuth(erro: unknown, padrao: string): string {
  const codigo = (erro as { code?: string })?.code ?? "";
  const mapa: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Tente entrar.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
    "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir.",
  };
  return mapa[codigo] ?? padrao;
}

export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-dark px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-yellow">Money Assist</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{titulo}</h1>
          <p className="mt-1 text-sm text-zinc-400">{subtitulo}</p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-dark p-6 shadow-xl shadow-black/30">{children}</div>
      </div>
    </div>
  );
}
