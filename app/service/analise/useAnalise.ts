import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { auth, database } from "~/service/firebase";
import {
  conteudoAutomatico,
  gerarResumo,
  hashGastos,
  hojeLocal,
  type ConteudoAnalise,
  type Gasto,
  type ResumoFinanceiro,
} from "./motor";
import {
  diaBrasil,
  INTERVALO_AUTO_MS,
  MIN_LANCAMENTOS_IA,
  normalizarSalva,
  normalizarUso,
  usosRestantes,
  type AnaliseSalva,
  type MotivoIndisponivel,
  type UsoDiario,
} from "./contrato";
import { solicitarAnalise } from "./cliente";

export interface EstadoAnalise {
  /** Ainda lendo os gastos do Firebase. */
  carregando: boolean;
  resumo: ResumoFinanceiro | null;
  conteudo: ConteudoAnalise | null;
  /** "ia" só quando o texto salvo corresponde exatamente aos gastos atuais. */
  origem: "ia" | "automatica";
  geradoEm: number | null;
  gerando: boolean;
  aviso: string | null;
  podeGerar: boolean;
  rotuloBotao: string;
  usosRestantes: number;
  gerar: () => void;
}

function mensagemAviso(motivo: MotivoIndisponivel): string | null {
  switch (motivo) {
    case "limite_diario":
      return "Você já usou as análises de IA de hoje. Elas voltam amanhã; até lá, vale a análise automática.";
    case "sem_dados":
    case "nao_autenticado":
      return null;
    default:
      return "A IA está indisponível agora, então estou mostrando a análise automática. Tente de novo mais tarde.";
  }
}

export function useAnalise(): EstadoAnalise {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ganhos, setGanhos] = useState<Gasto[]>([]);
  const [gastosCarregados, setGastosCarregados] = useState(false);
  const [salva, setSalva] = useState<AnaliseSalva | null>(null);
  const [salvaCarregada, setSalvaCarregada] = useState(false);
  const [uso, setUso] = useState<UsoDiario | null>(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const emVoo = useRef(false);
  const jaTentou = useRef<Set<string>>(new Set());

  // --- Dados em tempo real: gastos, análise salva e contador de uso ----------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const base = `usuarios/${user.uid}`;

    const offGastos = onValue(
      ref(database, `${base}/gastos`),
      (snap) => {
        const dados = (snap.val() ?? {}) as Record<string, any>;
        setGastos(
          Object.values(dados).map((g) => ({
            categoria: g?.categoria ?? "Outros",
            valor: Number(g?.valor ?? 0),
            data: g?.data ?? "",
          })),
        );
        setGastosCarregados(true);
      },
      () => setGastosCarregados(true),
    );

    // Ganhos: se a regra do banco ainda não existe, a análise segue só com gastos.
    const offGanhos = onValue(
      ref(database, `${base}/ganhos`),
      (snap) => {
        const dados = (snap.val() ?? {}) as Record<string, any>;
        setGanhos(
          Object.values(dados).map((g) => ({
            categoria: g?.categoria ?? "Outros",
            valor: Number(g?.valor ?? 0),
            data: g?.data ?? "",
          })),
        );
      },
      () => {},
    );

    // Se as regras do banco ainda não liberam a leitura, segue só com a análise automática.
    const offSalva = onValue(
      ref(database, `${base}/analise`),
      (snap) => {
        setSalva(normalizarSalva(snap.val()));
        setSalvaCarregada(true);
      },
      () => setSalvaCarregada(true),
    );
    const offUso = onValue(
      ref(database, `${base}/analiseUso`),
      (snap) => setUso(normalizarUso(snap.val())),
      () => {},
    );

    return () => {
      offGastos();
      offGanhos();
      offSalva();
      offUso();
    };
  }, []);

  // --- Camada 1: motor local (instantâneo, sem custo) ------------------------
  const hoje = useMemo(() => hojeLocal(), [gastos]);
  const resumo = useMemo(() => gerarResumo(gastos, hoje, ganhos), [gastos, ganhos, hoje]);
  const automatico = useMemo(() => (resumo ? conteudoAutomatico(resumo) : null), [resumo]);
  const hash = useMemo(() => (resumo ? hashGastos(gastos, hoje, ganhos) : null), [resumo, gastos, ganhos, hoje]);

  // --- Camada 2: texto da IA, só se corresponder aos gastos de agora ---------
  const iaValida = !!salva && !!hash && salva.hash === hash;
  const restantes = usosRestantes(uso, diaBrasil());
  const dadosSuficientes = gastos.length >= MIN_LANCAMENTOS_IA;

  const gerar = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || emVoo.current) return;
    emVoo.current = true;
    setGerando(true);
    setAviso(null);
    const resposta = await solicitarAnalise(user, hoje);
    emVoo.current = false;
    setGerando(false);
    if (resposta.status === "indisponivel") {
      setAviso(mensagemAviso(resposta.motivo));
    } else {
      setSalva(resposta.analise); // o onValue confirma logo em seguida
    }
  }, [hoje]);

  // Geração automática ao abrir a tela: só se não há análise salva ou ela é antiga.
  // O servidor ainda confere hash e limite diário, então isto nunca gasta cota à toa.
  const gerarRef = useRef(gerar);
  gerarRef.current = gerar;
  useEffect(() => {
    if (!gastosCarregados || !salvaCarregada || !hash || !dadosSuficientes) return;
    if (iaValida || restantes <= 0 || jaTentou.current.has(hash)) return;
    if (salva && Date.now() - salva.geradoEm < INTERVALO_AUTO_MS) return;

    const espera = setTimeout(() => {
      jaTentou.current.add(hash);
      void gerarRef.current();
    }, 1500); // espera os gastos "assentarem" (várias atualizações seguidas do Firebase)
    return () => clearTimeout(espera);
  }, [gastosCarregados, salvaCarregada, hash, dadosSuficientes, iaValida, restantes, salva]);

  const podeGerar = !gerando && !!resumo && dadosSuficientes && !iaValida && restantes > 0;
  const rotuloBotao = gerando
    ? "Gerando..."
    : !dadosSuficientes
      ? "Registre mais gastos para usar a IA"
      : iaValida
        ? "Análise em dia"
        : restantes <= 0
          ? "Limite de hoje atingido"
          : salva
            ? "Atualizar com IA"
            : "Gerar com IA";

  return {
    carregando: !gastosCarregados,
    resumo,
    conteudo: iaValida && salva ? salva.conteudo : automatico,
    origem: iaValida ? "ia" : "automatica",
    geradoEm: iaValida && salva ? salva.geradoEm : null,
    gerando,
    aviso,
    podeGerar,
    rotuloBotao,
    usosRestantes: restantes,
    gerar: () => void gerar(),
  };
}
