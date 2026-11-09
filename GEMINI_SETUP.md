# MoneyAssist - Integração Gemini AI

## Configuração da API Key

Para habilitar a análise de gastos por IA, você precisa:

1. Obter uma chave gratuita do Gemini em: https://aistudio.google.com/app/apikey

2. Abrir o arquivo `.env` na raiz do projeto e substituir `sua_chave_aqui` pela chave que você obteve:

```bash
VITE_GEMINI_API_KEY=sua_chave_real_aqui
```

3. Reiniciar o servidor de desenvolvimento:

```bash
npm run dev
```

## Como funciona

- A página "Visão Geral" (`/visaoGeral`) agora busca automaticamente seus gastos do Firebase
- Os dados são enviados para o Gemini AI (modelo `gemini-2.0-flash`)
- A IA analisa seus gastos e retorna insights em português, como:
  - Onde você está gastando mais
  - Comparações com meses anteriores
  - Dicas práticas de economia

## Arquivos criados/modificados

- `app/service/gemini.ts` - Serviço que se comunica com a API do Gemini
- `app/routes/visaoGeral.tsx` - Página atualizada para exibir a análise da IA
- `.env` - Variáveis de ambiente (não commitar este arquivo!)
- `.env.example` - Template das variáveis de ambiente

## Segurança

⚠️ Nunca faça commit do arquivo `.env` com sua chave real. Ele já está no `.gitignore`.
