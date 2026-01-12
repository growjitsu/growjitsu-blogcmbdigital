
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Validação estrita da variável de ambiente
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY não configurada no ambiente do servidor (Vercel/Local)' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 1. PROTOCOLO DE PESQUISA (GOOGLE SEARCH GROUNDING)
    // Usamos o modelo Flash para evitar erros de cota 429 do modelo Pro
    const researchResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Identifique as 3 tendências ou notícias mais impactantes de hoje em Tecnologia, IA e Marketing Digital no Brasil. Foque em fatos reais e movimentos de mercado.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const trendsContext = researchResponse.text;
    const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 2. PROTOCOLO EDITORIAL (GERAÇÃO DE ARTIGOS)
    const generationResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contexto de tendências reais: ${trendsContext}. 
      Gere 3 artigos premium seguindo o PROTOCOLO CMBDIGITAL: tom chic, técnico, autoritativo. 
      Sem menção a IAs, sem exageros, foco em valor real para o leitor.`,
      config: {
        systemInstruction: "Você é um Motor de Curadoria Editorial Premium para um blog de autoridade. Crie conteúdo original, SEO-friendly e técnico. Nunca invente fatos. Formate como JSON compatível com a interface de artigos do blog.",
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
              content: { type: Type.STRING, description: "HTML rico com H2, H3 e listas" },
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

    // 3. SÍNTESE VISUAL (GEMINI 2.5 FLASH IMAGE)
    const finalArticles = await Promise.all(articles.map(async (art: any) => {
      try {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `High-end editorial photography for tech article: "${art.title}". Minimalist obsidian style, corporate sophisticated, dark mode aesthetic, 8k. No text.` }]
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
        return { 
          ...art, 
          image: imageUrl, 
          author: 'CMBDIGITAL', 
          status: 'draft',
          id: `art-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` 
        };
      } catch (e) {
        return { 
          ...art, 
          image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200", 
          author: 'CMBDIGITAL', 
          status: 'draft' 
        };
      }
    }));

    return res.status(200).json({
      articles: finalArticles,
      sources: groundingChunks
    });

  } catch (error: any) {
    console.error("Erro no Protocolo de Curadoria:", error);
    
    // Tratamento específico para erro de cota (429)
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ 
        error: "O motor Gemini Flash atingiu o limite temporário de requisições. O protocolo será reiniciado automaticamente em 60 segundos." 
      });
    }

    return res.status(500).json({ 
      error: `Falha no Motor de IA: ${error.message || 'Erro desconhecido'}` 
    });
  }
}
