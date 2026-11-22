# MoneyAssist — Análise de gastos (motor local + Gemini no servidor)

A análise da tela **Visão Geral** funciona em duas camadas. Tudo roda dentro dos planos gratuitos do Gemini e do Firebase.

```
 Navegador                                   Servidor (rota /api/analise)
 ─────────                                   ───────────────────────────
 gastos (Firebase)                           confere o token de login
   │                                           │
   ▼                                           ▼
 CAMADA 1: motor local (motor.ts)            lê os gastos do Firebase (não confia no cliente)
   compara meses, projeta o mês,               │
   acha anomalias → fatos + texto pronto       ▼
   (instantâneo, sem custo, sem IA)          mesmo motor calcula os FATOS
   │                                           │
   ▼                                           ├─ nada mudou desde a última análise? → devolve o cache (custo zero)
 mostra na hora                                ├─ passou do limite diário?           → recusa
   │                                           ▼
   └── pede à IA (só se preciso) ───────────► CAMADA 2: Gemini redige os fatos em JSON estruturado
                                               valida a saída (números só podem ser os dos fatos)
 mostra o texto da IA quando chega ◄────────── salva em usuarios/{uid}/analise
```

**O Gemini nunca faz conta e nunca vê gastos individuais.** Ele recebe fatos já calculados (totais, variações, projeção, destaques) e só os escreve de forma clara e priorizada. Se ele falhar, a cota acabar ou a resposta vier fora do contrato, o usuário continua vendo a análise automática do motor local, sem mensagem de erro.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `app/service/analise/motor.ts` | Camada 1. Cálculo determinístico: mês × mês, projeção, categorias em alta/queda, gasto atípico, muitos gastos pequenos, concentração. Roda no navegador e no servidor. |
| `app/service/analise/contrato.ts` | Tipos e constantes compartilhados (limite diário, intervalo automático). |
| `app/service/analise/gemini.server.ts` | Camada 2. Prompt, chamada REST, fallback entre modelos, validação e trava de números inventados. |
| `app/service/analise/armazenamento.server.ts` | Firebase Admin: verifica o login e lê/escreve cache e contador. |
| `app/service/analise/analise.server.ts` | Orquestra cache → limite diário → IA → salvar. |
| `app/routes/api.analise.ts` | Rota `POST /api/analise`. |
| `app/service/analise/useAnalise.ts` | Hook da tela: motor local na hora + análise salva + geração automática/manual. |
| `app/components/cardAnalise.tsx` | Card: resumo, chips, destaques, dica, status e botão. |

Arquivos `*.server.ts` nunca entram no JavaScript enviado ao navegador.

## Configuração

### 1. Chave do Gemini
Crie em <https://aistudio.google.com/app/apikey> e coloque em `GEMINI_API_KEY` (**sem** prefixo `VITE_`).

> **Se você já usou `VITE_GEMINI_API_KEY`:** essa chave foi publicada no JavaScript do site e deve ser considerada vazada. Gere uma nova, apague a antiga no AI Studio e remova a linha `VITE_GEMINI_API_KEY` do `.env` e de qualquer lugar onde o site foi publicado.

### 2. Conta de serviço do Firebase
Console do Firebase → Configurações do projeto → **Contas de serviço** → *Gerar nova chave privada*. Cole o JSON em uma linha (ou em base64) em `FIREBASE_SERVICE_ACCOUNT`. Esse arquivo dá acesso total ao projeto: não o coloque no Git.

Se o seu Realtime Database não usa a URL padrão `https://<projectId>-default-rtdb.firebaseio.com` (por exemplo, fica em outra região), defina `FIREBASE_DATABASE_URL`.

### 3. Regras do Realtime Database
O servidor grava a análise e o contador de uso com o Admin SDK, que ignora as regras. O navegador só precisa **ler** esses dois nós, e não pode escrever neles (senão o usuário zeraria o próprio limite):

```json
{
  "rules": {
    "usuarios": {
      "$uid": {
        "gastos": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        },
        "analise": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": false
        },
        "analiseUso": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": false
        }
      }
    }
  }
}
```

Atenção: no Realtime Database uma regra mais rasa **não pode ser revogada** por uma mais funda. Se hoje existir `.write` (ou `.read`) diretamente em `usuarios/$uid`, remova-o e use o formato acima, senão `analise` e `analiseUso` continuam graváveis pelo navegador.

### 4. Rodar
```bash
npm install
npm run dev
```
Em produção, defina as mesmas variáveis no ambiente do servidor/contêiner (o `.env` não vai para a imagem Docker).

Sem `GEMINI_API_KEY` ou `FIREBASE_SERVICE_ACCOUNT`, o app continua funcionando com a análise automática (camada 1); só não gera o texto por IA.

## Como as cotas grátis são protegidas

- **Cache por conteúdo.** O servidor guarda um hash dos gastos que entram na análise. Se nada mudou, devolve o texto salvo sem chamar o Gemini.
- **Geração automática só quando faz sentido.** Ao abrir a tela, só pede IA se não há análise salva ou se ela tem mais de 6 horas **e** os gastos mudaram. O botão "Atualizar com IA" é manual e fica desabilitado quando a análise já está em dia.
- **Limite diário por usuário** (padrão 5, `ANALISE_LIMITE_DIARIO`), reservado de forma atômica. Se a IA falhar, o uso é devolvido.
- **Sem chamadas duplicadas.** Duplo clique ou duas abas viram uma única chamada.
- **Fallback de modelo e disjuntor.** Se um modelo estourar a cota, tenta o próximo da lista; se todos falharem, pausa as chamadas por alguns minutos em vez de insistir.
- **Poucos dados.** Com menos de 3 lançamentos não chama a IA.

## Modelos

A ordem padrão é `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, `gemini-3.5-flash` (modelos com camada grátis na página de preços do Gemini API). As cotas exatas por modelo aparecem no [AI Studio](https://aistudio.google.com/rate-limit) e mudam com o tempo. Para trocar os modelos sem alterar código, defina `GEMINI_MODELS` com os ids separados por vírgula.

## Privacidade

Na camada grátis do Gemini API, o conteúdo enviado pode ser usado pelo Google para melhorar seus produtos. Por isso o servidor envia **somente fatos agregados** (totais, percentuais, nomes de categoria), nunca lançamentos individuais, datas, e-mail ou identificador do usuário. O nome de categorias personalizadas é filtrado (só letras, números, espaço e hífen, até 30 caracteres) antes de entrar no prompt.

## Ajustando o comportamento

- **Limiares das regras** (quanto é "em alta", o que é "gasto atípico", etc.): `motor.ts`, função `detectarInsights`.
- **Tom e regras do texto da IA:** constante `SISTEMA` em `gemini.server.ts`.
- **Limite diário / intervalo automático:** `contrato.ts` e `ANALISE_LIMITE_DIARIO`.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Sempre "Análise automática", nunca "Escrita pela IA" | Falta `GEMINI_API_KEY` ou `FIREBASE_SERVICE_ACCOUNT` no servidor (veja o log: `configuração do servidor incompleta`). |
| Texto da IA aparece, mas some ao recarregar | Regras do banco não liberam a leitura de `analise` para o dono. |
| "Limite de hoje atingido" cedo demais | `ANALISE_LIMITE_DIARIO` baixo ou muitas edições de gastos no dia. |
| Log `números que não estão nos fatos` | O modelo citou um valor que não recebeu; a resposta foi descartada de propósito. Se acontecer com frequência, reforce a regra 1 em `SISTEMA` ou troque a ordem de `GEMINI_MODELS`. |
