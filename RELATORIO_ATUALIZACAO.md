# MoneyAssist - Relatório de Atualização

**Aluno:** Pedro Henrique Zanotelli de Freitas  
**Data:** 09/11/2026

---

## Sobre a gravação do vídeo

Infelizmente não consegui gravar o vídeo demonstrativo por questões técnicas no momento da entrega. Por isso, estou enviando este relatório detalhado explicando todas as mudanças que fiz no projeto MoneyAssist.

---

## O que foi implementado

A principal atualização foi a integração de uma inteligência artificial para análise automática dos gastos do usuário. Antes, o app só mostrava os dados em formato de gráficos - agora ele consegue interpretar esses dados e dar insights práticos.

### Tecnologias utilizadas

- **Google Gemini API** (modelo gemini-3.8-flash) - API gratuita de IA do Google
- **TypeScript** para garantir tipos seguros
- **React hooks** (useState e useEffect) para gerenciar o estado da aplicação
- **Firebase Realtime Database** que já estava sendo usado no projeto

### Como funciona na prática

Quando o usuário entra na tela de Visão Geral, o sistema:

1. Busca todos os gastos do usuário no Firebase em tempo real
2. Agrupa esses gastos por categoria e calcula os totais
3. Envia um resumo estruturado para a API do Gemini
4. A IA analisa os dados e retorna uma análise em português, apontando onde o usuário está gastando mais e oferecendo dicas práticas de economia
5. O texto aparece automaticamente na interface, substituindo o placeholder que tinha antes

---

## Arquivos criados e modificados

### `app/service/gemini.ts`
Novo arquivo que contém toda a lógica de comunicação com a API do Gemini. Inclui tratamento de erros, formatação dos dados e o prompt que instrui a IA a responder em português de forma amigável.

### `app/routes/visaoGeral.tsx`
Atualizei essa página para buscar os gastos do Firebase e chamar a função de análise. Adicionei estados para controlar o carregamento (com um spinner animado) e tratamento de erros caso a API não responda.

### `.env` e `.env.example`
Criei esses arquivos para armazenar a chave da API do Gemini de forma segura. O `.env` não vai pro repositório (está no `.gitignore`).

### `package.json`
Adicionei a dependência `@google/generative-ai` necessária para se comunicar com o Gemini.

---

## Detalhes técnicos importantes

### Otimizações implementadas

- **Sistema de cache de 5 minutos** - se os gastos não mudaram, a IA não é chamada novamente, economizando requisições
- **Fallback automático** - se o modelo principal estiver sobrecarregado (erro 503), o código tenta um modelo alternativo
- **Limitação de tokens** - configurei `maxOutputTokens: 150` para manter as respostas curtas e diretas
- **Temperature: 0.7** para equilibrar criatividade com consistência nas respostas

### Prompt elaborado

O prompt foi cuidadosamente elaborado para instruir a IA a:

- Escrever apenas 2-3 frases curtas
- Identificar a categoria com mais gasto
- Dar uma dica prática de economia
- Não usar markdown, só texto simples
- Manter um tom direto e amigável em português brasileiro

---

## Experiência do usuário

Do ponto de vista do usuário, a mudança é bem visível. Antes havia um texto fixo e genérico na seção "IA's tip". Agora:

- Se não houver gastos cadastrados, aparece uma mensagem pedindo para cadastrar alguns gastos
- Enquanto a análise está carregando, aparece um spinner com a mensagem "Analisando seus gastos..."
- Quando pronto, aparece o texto personalizado da IA com insights sobre os gastos específicos daquele usuário
- Se der algum erro (chave inválida, API fora do ar), aparece uma mensagem de erro clara em vermelho

---

## Benefícios desta funcionalidade

O grande diferencial é transformar dados brutos em informação útil. Os gráficos já existiam, mas agora o usuário recebe interpretação e conselhos específicos sobre seus hábitos financeiros. É como ter um consultor financeiro pessoal que analisa seus gastos automaticamente toda vez que você acessa o app.

A análise é totalmente automática e se atualiza em tempo real conforme o usuário adiciona ou remove gastos. Como estou usando a API gratuita do Gemini, não há custos para o projeto nesta fase de desenvolvimento.

---

## Conclusão

Esta atualização representa um salto qualitativo no MoneyAssist. Não é só uma questão de adicionar mais uma funcionalidade - é sobre tornar o app mais inteligente e realmente útil para quem quer entender e melhorar sua situação financeira. A integração com IA abre portas para futuras melhorias, como comparações mensais, alertas de gastos atípicos ou sugestões de metas de economia.

Mesmo sem o vídeo, acredito que este relatório deixa claro o trabalho técnico envolvido e o valor que a funcionalidade traz para o projeto.
