import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY não configurada no ambiente do servidor.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // PROTOCOLO DEFINITIVO — ETAPA 1: PESQUISA (GROUNDING)
    const researchResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Identifique as 3 tendências ou notícias mais impactantes de hoje em Tecnologia, IA e Marketing Digital no Brasil. Foque em fatos reais e movimentos de mercado para curadoria premium.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const trendsContext = researchResponse.text;
    const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // PROTOCOLO DEFINITIVO — ETAPA 2 e 3: GERAÇÃO EDITORIAL
    const generationResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base nestas tendências reais: "${trendsContext}", execute o PROTOCOLO DE CURADORIA PREMIUM.
      Gere 3 artigos em estado de RASCUNHO. Tom chic, técnico e autoritativo.
      Retorne um array JSON com a estrutura interna do blog: id, slug, title, excerpt, content (HTML com H2/H3), category, date, tags, metaTitle, metaDescription.`,
      config: {
        systemInstruction: `Você é um Motor de Curadoria Editorial Premium para o blog CMBDIGITAL. 
        OBJETIVO: Criar conteúdo original, SEO-friendly e técnico. 
        ESTILO: Moderno, sofisticado, editorial. 
        RESTRIÇÕES: Não cite que foi gerado por IA. Não mencione OpenAI. Sem clickbait barato. Sem inventar fatos. 
        QUALIDADE: Valor real para o leitor, alinhado ao Google AdSense Brasil.`,
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
              metaDescription: { type: Type.STRING },
              promptImagem: { type: Type.STRING, description: "Prompt para geração de imagem editorial" }
            },
            required: ["id", "slug", "title", "excerpt", "content", "category", "date", "tags", "metaTitle", "metaDescription", "promptImagem"]
          }
        }
      }
    });

    const articlesData = JSON.parse(generationResponse.text || "[]");

    // GERAÇÃO DE IMAGENS BASEADA NO PROMPT GERADO PELO MOTOR EDITORIAL
    const finalArticles = await Promise.all(articlesData.map(async (art: any) => {
      try {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: art.promptImagem || `Professional tech editorial photography for: "${art.title}". Obsidian style, 8k.` }]
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
          id: `cmb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
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
    console.error("Erro no Protocolo Editorial:", error);
    
    if (error.message?.includes("429")) {
      return res.status(429).json({ 
        error: "O motor está processando muitas requisições. O protocolo entrará em espera por 60 segundos." 
      });
    }

    return res.status(500).json({ 
      error: `Falha no Motor de IA: ${error.message}` 
    });
  }
}
