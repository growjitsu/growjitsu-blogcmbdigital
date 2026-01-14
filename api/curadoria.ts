
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  // Forçar o cabeçalho de resposta para JSON imediatamente
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    // Inicialização direta. O erro "Unexpected token A" geralmente ocorre quando 
    // a Vercel retorna uma página de erro HTML por falha na execução.
    const apiKey = process.env.OPENAI_API_KEY;
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Você responde exclusivamente em JSON puro. Não use markdown, não use blocos de código, não inclua texto antes ou depois do JSON."
        },
        {
          role: "user",
          content: `PROTOCOLO EDITORIAL:
          Gere 3 artigos de alta performance sobre tendências de tecnologia e marketing digital no Brasil.
          Retorne obrigatoriamente neste formato JSON:
          {
            "articles": [
              {
                "slug": "string",
                "title": "string",
                "excerpt": "string",
                "content": "string (mínimo 500 palavras, sem HTML)",
                "category": "string (IA, Tecnologia, Marketing Digital ou Produtividade)",
                "tags": ["tag1", "tag2"],
                "promptImagem": "string (detalhado em inglês)"
              }
            ]
          }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawContent = response.choices[0].message.content;
    
    if (!rawContent) {
      throw new Error("A API da OpenAI retornou um conteúdo vazio.");
    }

    const data = JSON.parse(rawContent);

    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error("Estrutura de dados inválida retornada pelo motor editorial.");
    }

    const processedArticles = data.articles.map((art: any) => ({
      ...art,
      id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
      author: 'CMBDIGITAL',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'draft',
      image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",tech")}`
    }));

    return res.status(200).json({ 
      success: true,
      articles: processedArticles 
    });

  } catch (error: any) {
    console.error("ERRO NO MOTOR DE CURADORIA:", error);
    
    // GARANTIA: Sempre retorna JSON, nunca texto puro ou HTML
    return res.status(500).json({ 
      success: false,
      error: 'Falha na execução da curadoria',
      details: error.message || 'Erro interno desconhecido'
    });
  }
}
