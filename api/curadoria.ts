
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicialização direta sem travas preventivas. 
  // O sistema assume que OPENAI_API_KEY está configurada no ambiente da Vercel.
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Sua escrita é premium, técnica, autoritativa e focada em SEO. Você gera conteúdo original, factual e sem alucinações sobre tecnologia e marketing digital no Brasil."
        },
        {
          role: "user",
          content: `PROTOCOLO EDITORIAL DE CURADORIA:
          1. Pesquise e identifique as 3 notícias ou tendências de tecnologia e negócios digitais mais impactantes de hoje no Brasil.
          2. Com base nelas, escreva 3 artigos completos.
          3. Cada artigo deve conter:
             - slug: URL amigável
             - title: Título SEO de alto impacto
             - excerpt: Resumo instigante para o card
             - content: Texto editorial completo (mínimo 500 palavras, sem HTML, apenas texto puro com parágrafos)
             - category: Categoria (IA, Tecnologia, Marketing Digital ou Produtividade)
             - tags: Array de 3 a 5 tags relevantes
             - promptImagem: Prompt detalhado em inglês para uma imagem editorial futurista
          4. Retorne estritamente um JSON puro no formato: { "articles": [...] }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawContent = response.choices[0].message.content;
    const data = JSON.parse(rawContent || '{"articles": []}');

    const processedArticles = data.articles.map((art: any) => ({
      ...art,
      id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
      author: 'CMBDIGITAL',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'draft',
      // Imagem fallback via Unsplash Source para garantir exibição imediata
      image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",technology")}`
    }));

    return res.status(200).json({ articles: processedArticles });

  } catch (error: any) {
    console.error("ERRO CRÍTICO NO BACKEND:", error);
    return res.status(500).json({ 
      error: error.message || "Falha na comunicação com a API da OpenAI." 
    });
  }
}
