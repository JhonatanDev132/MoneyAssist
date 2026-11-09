import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: "MoneyAssist - Relatório de Atualização",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "Aluno: ", bold: true }),
          new TextRun("Pedro Henrique Zanotelli de Freitas")
        ],
        spacing: { after: 200 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "Data: ", bold: true }),
          new TextRun("08/11/2026")
        ],
        spacing: { after: 400 }
      }),

      new Paragraph({
        text: "Sobre a gravação do vídeo",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      }),

      new Paragraph({
        text: "Infelizmente não consegui gravar o vídeo demonstrativo por questões técnicas no momento da entrega. Por isso, estou enviando este relatório detalhado explicando todas as mudanças que fiz no projeto MoneyAssist.",
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "O que foi implementado",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      }),

      new Paragraph({
        text: "A principal atualização foi a integração de uma inteligência artificial para análise automática dos gastos do usuário. Antes, o app só mostrava os dados em formato de gráficos - agora ele consegue interpretar esses dados e dar insights práticos.",
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: "Tecnologias utilizadas",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        text: "• Google Gemini API (modelo gemini-3.8-flash) - API gratuita de IA do Google",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• TypeScript para garantir tipos seguros",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• React hooks (useState e useEffect) para gerenciar o estado da aplicação",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Firebase Realtime Database que já estava sendo usado no projeto",
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "Como funciona na prática",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        text: "Quando o usuário entra na tela de Visão Geral, o sistema:",
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: "1. Busca todos os gastos do usuário no Firebase em tempo real",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "2. Agrupa esses gastos por categoria e calcula os totais",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "3. Envia um resumo estruturado para a API do Gemini",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "4. A IA analisa os dados e retorna uma análise em português, apontando onde o usuário está gastando mais e oferecendo dicas práticas de economia",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "5. O texto aparece automaticamente na interface, substituindo o placeholder que tinha antes",
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "Arquivos criados e modificados",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "app/service/gemini.ts", bold: true }),
          new TextRun(" - Novo arquivo que contém toda a lógica de comunicação com a API do Gemini. Inclui tratamento de erros, formatação dos dados e o prompt que instrui a IA a responder em português de forma amigável.")
        ],
        spacing: { after: 150, left: 360 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "app/routes/visaoGeral.tsx", bold: true }),
          new TextRun(" - Atualizei essa página para buscar os gastos do Firebase e chamar a função de análise. Adicionei estados para controlar o carregamento (com um spinner animado) e tratamento de erros caso a API não responda.")
        ],
        spacing: { after: 150, left: 360 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: ".env e .env.example", bold: true }),
          new TextRun(" - Criei esses arquivos para armazenar a chave da API do Gemini de forma segura. O .env não vai pro repositório (está no .gitignore).")
        ],
        spacing: { after: 150, left: 360 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "package.json", bold: true }),
          new TextRun(" - Adicionei a dependência @google/generative-ai necessária para se comunicar com o Gemini.")
        ],
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "Detalhes técnicos importantes",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        text: "Otimizações implementadas:",
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: "• Sistema de cache de 5 minutos - se os gastos não mudaram, a IA não é chamada novamente, economizando requisições",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Fallback automático - se o modelo principal estiver sobrecarregado (erro 503), o código tenta um modelo alternativo",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Limitação de tokens - configurei maxOutputTokens: 150 para manter as respostas curtas e diretas",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Temperature: 0.7 para equilibrar criatividade com consistência nas respostas",
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "O prompt foi cuidadosamente elaborado para instruir a IA a:",
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: "• Escrever apenas 2-3 frases curtas",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Identificar a categoria com mais gasto",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Dar uma dica prática de economia",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Não usar markdown, só texto simples",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Manter um tom direto e amigável em português brasileiro",
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "Experiência do usuário",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        text: "Do ponto de vista do usuário, a mudança é bem visível. Antes havia um texto fixo e genérico na seção \"IA's tip\". Agora:",
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: "• Se não houver gastos cadastrados, aparece uma mensagem pedindo para cadastrar alguns gastos",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Enquanto a análise está carregando, aparece um spinner com a mensagem \"Analisando seus gastos...\"",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Quando pronto, aparece o texto personalizado da IA com insights sobre os gastos específicos daquele usuário",
        spacing: { after: 100, left: 360 }
      }),

      new Paragraph({
        text: "• Se der algum erro (chave inválida, API fora do ar), aparece uma mensagem de erro clara em vermelho",
        spacing: { after: 300, left: 360 }
      }),

      new Paragraph({
        text: "Benefícios desta funcionalidade",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 150 }
      }),

      new Paragraph({
        text: "O grande diferencial é transformar dados brutos em informação útil. Os gráficos já existiam, mas agora o usuário recebe interpretação e conselhos específicos sobre seus hábitos financeiros. É como ter um consultor financeiro pessoal que analisa seus gastos automaticamente toda vez que você acessa o app.",
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: "A análise é totalmente automática e se atualiza em tempo real conforme o usuário adiciona ou remove gastos. Como estou usando a API gratuita do Gemini, não há custos para o projeto nesta fase de desenvolvimento.",
        spacing: { after: 400 }
      }),

      new Paragraph({
        text: "Conclusão",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      }),

      new Paragraph({
        text: "Esta atualização representa um salto qualitativo no MoneyAssist. Não é só uma questão de adicionar mais uma funcionalidade - é sobre tornar o app mais inteligente e realmente útil para quem quer entender e melhorar sua situação financeira. A integração com IA abre portas para futuras melhorias, como comparações mensais, alertas de gastos atípicos ou sugestões de metas de economia.",
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: "Mesmo sem o vídeo, acredito que este relatório deixa claro o trabalho técnico envolvido e o valor que a funcionalidade traz para o projeto.",
        spacing: { after: 200 }
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Relatorio_Atualizacao_MoneyAssist.docx', buffer);
  console.log('✅ Documento criado: Relatorio_Atualizacao_MoneyAssist.docx');
});
