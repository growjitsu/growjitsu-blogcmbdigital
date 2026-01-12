import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no ambiente do servidor.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 1. PESQUISA DE TENDÊNCIAS (GROUNDING)
    const researchResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "Identifique as 3 notícias ou tendências de tecnologia, IA e marketing digital mais importantes de hoje (foco no Brasil). Seja específico.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 2. GERAÇÃO DE ARTIGOS
    const generationResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Com base nestas tendências: "${researchResponse.text}", crie exatamente 3 artigos premium para o blog CMBDIGITAL. 
      Retorne um array JSON com: id, slug, title, excerpt, content (HTML rico), category, date, tags (array), metaTitle, metaDescription.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              slug: { type: Type.STRING },
              title: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              metaTitle: { type: Type.STRING },
              metaDescription: { type: Type.STRING }
            },
            required: ["id", "slug", "title", "excerpt", "content", "category", "date", "tags", "metaTitle", "metaDescription"]
          }
        }
      }
    });

    const articles = JSON.parse(generationResponse.text || "[]");

    // 3. GERAÇÃO DE IMAGENS (SÍNCRONO PARA SIMPLICIDADE NO BACKEND)
    const finalArticles = await Promise.all(articles.map(async (art: any) => {
      try {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `Professional tech corporate photography for: "${art.title}". Dark obsidian background, cyan accents, 8k, minimalist.` }]
          }
        });

        let imageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200";
        if (imgResponse.candidates?.[0]?.content?.parts) {
          for (const part of imgResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        }
        return { ...art, image: imageUrl, author: 'CMBDIGITAL', status: 'draft' };
      } catch (e) {
        return { ...art, image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200", author: 'CMBDIGITAL', status: 'draft' };
      }
    }));

    return res.status(200).json({
      articles: finalArticles,
      sources: groundingChunks
    });

  } catch (error: any) {
    console.error("Erro na API Curadoria:", error);
    return res.status(500).json({ error: error.message || 'Falha interna no motor de IA.' });
  }
}
