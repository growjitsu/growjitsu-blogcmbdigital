import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Ação Obrigatória: Leitura exclusiva via process.env
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY ausente no ambiente do servidor. Verifique as variáveis no painel da Vercel.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 1. PROTOCOLO DE PESQUISA E CONTEXTO (USANDO FLASH LITE PARA ALTA DISPONIBILIDADE)
    const researchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: "Identifique as 3 tendências de tecnologia e marketing digital mais importantes de hoje no Brasil. Seja direto e traga fatos reais.",
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Otimização de cota
      }
    });

    const trendsContext = researchResponse.text;
    const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 2. GERAÇÃO EDITORIAL PREMIUM (CONSOLIDADA)
    const generationResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: `Contexto: ${trendsContext}. Gere 3 artigos PREMIUM para o blog CMBDIGITAL. 
      Siga o PROTOCOLO: tom chic, técnico, autoritativo. Formate em JSON para o banco de rascunhos.`,
      config: {
        systemInstruction: "Você é um Motor Editorial de Elite. Gere conteúdo de alta autoridade, sem clichês de IA. Retorne estritamente um array JSON de objetos.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              slug: { type: Type.STRING },
              title: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              content: { type: Type.STRING, description: "HTML premium com H2/H3" },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              metaTitle: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
              promptImagem: { type: Type.STRING }
            },
            required: ["id", "slug", "title", "excerpt", "content", "category", "date", "tags", "metaTitle", "metaDescription", "promptImagem"]
          }
        }
      }
    });

    const articlesData = JSON.parse(generationResponse.text || "[]");

    // 3. GERAÇÃO VISUAL (SINCRONIZADA)
    const finalArticles = await Promise.all(articlesData.map(async (art: any) => {
      try {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: art.promptImagem || `High-end minimalist tech photography for: "${art.title}". 8k, obsidian style.` }]
          },
          config: { thinkingConfig: { thinkingBudget: 0 } }
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
        return { ...art, image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200", author: 'CMBDIGITAL', status: 'draft' };
      }
    }));

    return res.status(200).json({
      articles: finalArticles,
      sources: groundingChunks
    });

  } catch (error: any) {
    console.error("Erro no Protocolo Editorial:", error);
    
    // Tratamento Robusto de Quota
    if (error.status === 429 || error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ 
        error: "Cota do motor Gemini esgotada. Por favor, aguarde 60 segundos antes de tentar uma nova varredura de mercado." 
      });
    }

    return res.status(500).json({ 
      error: `Erro no Motor Editorial: ${error.message || 'Falha na conexão com a IA'}` 
    });
  }
}
