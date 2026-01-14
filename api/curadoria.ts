
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  // Garantia de resposta JSON em 100% dos casos
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    /**
     * CONTEXTO TÉCNICO:
     * A chave de API é injetada no ambiente via process.env.API_KEY.
     * Estamos instanciando diretamente sem validações prévias para evitar falsos negativos de ambiente.
     */
    const openai = new OpenAI({
      apiKey: process.env.API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Responda estritamente com JSON puro. Não use markdown, não use blocos de código (```json), não use comentários. Foque em tecnologia, IA e Marketing Digital no Brasil."
        },
        {
          role: "user",
          content: `PROTOCOLO EDITORIAL:
          Gere 3 artigos de alta performance.
          Formato JSON obrigatório:
          {
            "articles": [
              {
                "slug": "url-do-artigo",
                "title": "Título SEO Impactante",
                "excerpt": "Resumo para o card",
                "content": "Conteúdo editorial completo (mínimo 500 palavras, em texto puro, sem HTML)",
                "category": "IA, Tecnologia, Marketing Digital ou Produtividade",
                "tags": ["tag1", "tag2"],
                "promptImagem": "Prompt para imagem em inglês"
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
      throw new Error("Resposta vazia do motor OpenAI.");
    }

    const data = JSON.parse(rawContent);

    // Processamento dos metadados e IDs
    const processedArticles = (data.articles || []).map((art: any) => ({
      ...art,
      id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
      author: 'CMBDIGITAL',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'draft',
      image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",technology")}`
    }));

    return res.status(200).json({ 
      success: true,
      articles: processedArticles 
    });

  } catch (error: any) {
    console.error("FALHA NO MOTOR EDITORIAL:", error);
    
    return res.status(500).json({ 
      success: false,
      error: 'Erro na execução do protocolo de curadoria',
      details: error.message || 'Erro de comunicação com o motor de IA.'
    });
  }
}
