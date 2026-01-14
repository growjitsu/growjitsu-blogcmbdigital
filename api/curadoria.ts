
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // PASSO 1: Gerar o conteúdo textual e os prompts de imagem
    const curatorResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere 3 artigos épicos sobre tendências de IA, Marketing Digital e Tecnologia no Brasil para 2025.",
      config: {
        systemInstruction: "Você é o Editor-Chefe Sênior da CMBDIGITAL. Gere conteúdos profundos e prompts de imagem detalhados em inglês para uma estética tecnológica e premium.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slug: { type: Type.STRING },
                  title: { type: Type.STRING },
                  excerpt: { type: Type.STRING },
                  content: { type: Type.STRING },
                  category: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  promptImagem: { type: Type.STRING, description: "Detailed English prompt for high-end tech imagery" }
                },
                required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem"]
              }
            }
          },
          required: ["articles"]
        }
      }
    });

    const curatorText = curatorResponse.text;
    if (!curatorText) throw new Error("Falha ao gerar rascunhos iniciais.");
    
    const data = JSON.parse(curatorText);
    const rawArticles = data.articles || [];

    // PASSO 2: Gerar as imagens reais para cada artigo
    const articlesWithImages = await Promise.all(rawArticles.map(async (art: any) => {
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `High-quality, professional editorial photography, cinematic lighting, 8k resolution, premium tech style: ${art.promptImagem}` }]
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",tech")}`; // Fallback

        // Procurar a parte da imagem na resposta
        if (imageResponse.candidates?.[0]?.content?.parts) {
          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        return {
          ...art,
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          author: 'CMBDIGITAL',
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          status: 'draft',
          image: imageUrl
        };
      } catch (imgError) {
        console.error("Erro ao gerar imagem para artigo:", art.title, imgError);
        // Em caso de erro na imagem, retornamos com o fallback do Unsplash para não perder o texto
        return {
          ...art,
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          author: 'CMBDIGITAL',
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          status: 'draft',
          image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",tech")}`
        };
      }
    }));

    return res.status(200).json({ 
      success: true,
      articles: articlesWithImages 
    });

  } catch (error: any) {
    console.error("ERRO NO MOTOR DE CURADORIA:", error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro na geração de conteúdo e imagens',
      details: error.message
    });
  }
}
