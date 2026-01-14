
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { themes } = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // PASSO 1: Gerar o conteúdo textual baseado nos temas fornecidos
    const promptTemas = themes && themes.length > 0 
      ? `Gere 1 artigo épico e único para cada um destes temas específicos: ${themes.join(", ")}.`
      : "Gere 3 artigos épicos e distintos sobre as maiores tendências de IA e Tecnologia no Brasil para 2025.";

    const curatorResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptTemas,
      config: {
        systemInstruction: "Você é o Editor-Chefe Sênior da CMBDIGITAL. OBRIGATÓRIO: Conteúdo 100% em Português (pt-BR). Linguagem natural, profissional e otimizada para SEO. Gere títulos impactantes e rascunhos profundos. Para cada artigo, você DEVE fornecer um 'promptImagem' em INGLÊS que seja ALTAMENTE ESPECÍFICO ao título do post, evitando descrições genéricas de tecnologia.",
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
                  promptImagem: { type: Type.STRING, description: "Detailed and unique English visual description specifically for this article's title." }
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
    if (!curatorText) throw new Error("Falha ao gerar rascunhos.");
    
    const data = JSON.parse(curatorText);
    const rawArticles = data.articles || [];

    // PASSO 2: Gerar as imagens REAIS e ÚNICAS para cada artigo
    // A geração é feita individualmente para cada post dentro do loop
    const articlesWithImages = await Promise.all(rawArticles.map(async (art: any) => {
      try {
        // Construção do prompt dinâmico baseado no título (conforme solicitado no prompt definitivo)
        const finalImagePrompt = `Create a professional, modern, and sophisticated editorial image that visually represents the theme: '${art.title}'. Visual context: ${art.promptImagem}. Style: Clean, technological, high-end visual standards, NO TEXT, NO LOGOS, no famous faces, cinematic lighting, conceptual focus. High-quality professional editorial photography, 8k resolution.`;

        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: finalImagePrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",tech,business")}`;

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
        console.error("Erro na geração da imagem única:", art.title, imgError);
        // Fallback dinâmico baseado no título para evitar repetição absoluta
        return {
          ...art,
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          author: 'CMBDIGITAL',
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          status: 'draft',
          image: `https://images.unsplash.com/featured/?${encodeURIComponent(art.title.split(' ').slice(0, 3).join(','))}`
        };
      }
    }));

    return res.status(200).json({ 
      success: true,
      articles: articlesWithImages 
    });

  } catch (error: any) {
    console.error("ERRO EDITORIAL CRÍTICO:", error);
    return res.status(500).json({ 
      success: false,
      error: 'Falha na curadoria de imagens únicas',
      details: error.message
    });
  }
}
