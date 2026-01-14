
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // Inicializa o Google GenAI com a chave de ambiente protegida
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere 3 artigos épicos sobre tendências de IA, Marketing Digital e Tecnologia no Brasil para 2025.",
      config: {
        systemInstruction: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Seu tom é profissional, autoritário e focado em valor real para empreendedores. Gere conteúdos profundos, com insights práticos e otimização SEO impecável.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slug: { type: Type.STRING, description: "URL amigável baseada no título" },
                  title: { type: Type.STRING, description: "Título impactante" },
                  excerpt: { type: Type.STRING, description: "Resumo para o card de notícias" },
                  content: { type: Type.STRING, description: "Conteúdo completo com mínimo de 500 palavras em texto puro" },
                  category: { type: Type.STRING, description: "Uma das categorias: IA, Tecnologia, Marketing Digital, Produtividade ou Renda Online" },
                  tags: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Lista de 3 tags relevantes"
                  },
                  promptImagem: { type: Type.STRING, description: "Prompt detalhado em inglês para geração da imagem de capa" }
                },
                required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem"]
              }
            }
          },
          required: ["articles"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("O motor de IA retornou uma resposta vazia.");
    }

    const data = JSON.parse(text);

    // Processamento final para garantir IDs únicos e metadados de sistema
    const processedArticles = data.articles.map((art: any) => ({
      ...art,
      id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
      author: 'CMBDIGITAL',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      status: 'draft',
      image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",future,tech")}`
    }));

    return res.status(200).json({ 
      success: true,
      articles: processedArticles 
    });

  } catch (error: any) {
    console.error("ERRO NO MOTOR GEMINI:", error);
    return res.status(500).json({ 
      success: false,
      error: 'Falha crítica no motor de curadoria',
      details: error.message || 'Erro interno de processamento'
    });
  }
}
