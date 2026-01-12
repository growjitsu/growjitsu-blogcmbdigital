
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERRO: OPENAI_API_KEY não configurada.");
    return res.status(500).json({ error: 'Configuração de API ausente no servidor.' });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Sua escrita é premium, técnica, autoritativa e focada em SEO para o mercado brasileiro. Você gera conteúdo original e factual."
        },
        {
          role: "user",
          content: `PROTOCOLO EDITORIAL:
          1. Pesquise mentalmente as 3 tendências de tecnologia, IA ou Marketing Digital mais relevantes de hoje no Brasil.
          2. Escreva 3 artigos completos.
          3. Requisitos para cada artigo:
             - Título SEO chamativo
             - Excerpt (resumo) instigante
             - Conteúdo rico e detalhado (Mínimo 400 palavras, em texto puro, sem HTML)
             - Categoria (IA, Tecnologia, Marketing Digital, Produtividade)
             - Tags relevantes
             - Um prompt detalhado para imagem editorial (inglês).
          4. Retorne JSON: { "articles": [ { "slug": "...", "title": "...", "excerpt": "...", "content": "...", "category": "...", "tags": ["..."], "promptImagem": "..." } ] }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    const data = JSON.parse(content || '{"articles": []}');

    const processedArticles = data.articles.map((art: any) => ({
      ...art,
      id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
      author: 'CMBDIGITAL',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'draft',
      image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + "," + (art.tags[0] || "tech"))}`
    }));

    return res.status(200).json({ articles: processedArticles });

  } catch (error: any) {
    console.error("ERRO OPENAI ENGINE:", error);
    return res.status(500).json({ 
      error: error.message || "Erro interno no motor de curadoria." 
    });
  }
}
