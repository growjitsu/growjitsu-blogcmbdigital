import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // O sistema utiliza a API_KEY configurada no ambiente para máxima performance e segurança.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API_KEY não localizada. Certifique-se de que a variável de ambiente está configurada.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // PROTOCOLO MESTRE: PESQUISA E GERAÇÃO EM CHAMADA ÚNICA PARA EVITAR 429
    // O modelo gemini-3-flash-preview é otimizado para busca e resposta rápida.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        PROTOCOLO EDITORIAL CMBDIGITAL:
        1. Pesquise as 3 notícias/tendências mais relevantes de HOJE no Brasil sobre IA, Tecnologia e Marketing Digital.
        2. Crie 3 artigos completos com tom técnico e sofisticado.
        3. Cada artigo deve ter: título impactante, slug, excerpt chamativo, content em HTML (usando H2, H3, P e Strong), categoria e meta tags SEO.
        4. Gere um prompt específico de imagem editorial para cada um.
        5. Retorne TUDO em um único array JSON.
      `,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é o Editor-Chefe da CMBDIGITAL. Sua escrita é premium, autoritativa e focada em conversão. Você nunca usa clichês de IA. Retorne apenas JSON puro.",
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
              promptImagem: { type: Type.STRING }
            },
            required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem"]
          }
        }
      }
    });

    const articlesData = JSON.parse(response.text || "[]");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // GERAÇÃO DE IMAGENS COM FALLBACK SEGURO
    const finalArticles = await Promise.all(articlesData.map(async (art: any) => {
      try {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `Professional editorial tech photography, cinematic lighting, high contrast: ${art.promptImagem}` }]
          }
        });

        let imageUrl = `https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format`;
        
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
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          image: imageUrl, 
          author: 'CMBDIGITAL', 
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          status: 'draft'
        };
      } catch (e) {
        // Fallback para não quebrar o rascunho se a geração de imagem falhar
        return { 
          ...art, 
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          image: `https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format`, 
          author: 'CMBDIGITAL', 
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          status: 'draft' 
        };
      }
    }));

    return res.status(200).json({
      articles: finalArticles,
      sources: groundingChunks
    });

  } catch (error: any) {
    console.error("FALHA NO MOTOR EDITORIAL:", error);
    
    const statusCode = error.status || 500;
    const isQuotaError = error.message?.includes("429") || error.status === 429;

    return res.status(statusCode).json({ 
      error: isQuotaError 
        ? "Cota de pesquisa temporariamente excedida. O sistema reiniciará automaticamente em 60 segundos." 
        : `Erro técnico no motor: ${error.message}`
    });
  }
}
