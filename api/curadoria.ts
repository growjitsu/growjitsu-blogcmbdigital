
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { themes, action, title, customPrompt, category } = req.body;
  
  // Credenciais sincronizadas
  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const saveToStorage = async (base64Data: string, name: string): Promise<string | null> => {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${name}-${Date.now()}.png`;
        const { error } = await supabaseAdmin.storage
          .from('blog-images')
          .upload(`ai/${fileName}`, buffer, { contentType: 'image/png', upsert: true });
        
        if (error) throw error;
        const { data: { publicUrl } } = supabaseAdmin.storage.from('blog-images').getPublicUrl(`ai/${fileName}`);
        return publicUrl;
      } catch (e) {
        console.error("Storage AI Error:", e);
        return null;
      }
    };

    if (action === 'regenerate_image') {
      const finalImagePrompt = customPrompt || `Create a professional, modern, and sophisticated editorial image representing: '${title}'. NO TEXT, high-end visual standards.`;

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: finalImagePrompt }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });

      let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(category || "tech")}`;
      if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            const storedUrl = await saveToStorage(part.inlineData.data, title.toLowerCase().replace(/\s+/g, '-'));
            imageUrl = storedUrl || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      return res.status(200).json({ success: true, image: imageUrl });
    }

    const promptTemas = themes && themes.length > 0 
      ? `Gere 1 artigo épico e único para cada um destes temas específicos: ${themes.join(", ")}.`
      : "Gere 3 artigos épicos e distintos sobre as maiores tendências de IA e Tecnologia no Brasil para 2025.";

    const curatorResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptTemas,
      config: {
        systemInstruction: "Você é o Editor-Chefe Sênior da CMBDIGITAL. OBRIGATÓRIO: Conteúdo 100% em Português (pt-BR). Linguagem natural, profissional e otimizada para SEO. Gere títulos impactantes e rascunhos profundos. Forneça rascunhos em JSON.",
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
                  promptImagem: { type: Type.STRING }
                },
                required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem"]
              }
            }
          },
          required: ["articles"]
        }
      }
    });

    const data = JSON.parse(curatorResponse.text || "{}");
    const rawArticles = data.articles || [];

    const articlesWithImages = await Promise.all(rawArticles.map(async (art: any) => {
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: art.promptImagem }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        });

        let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category)}`;
        if (imageResponse.candidates?.[0]?.content?.parts) {
          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              const storedUrl = await saveToStorage(part.inlineData.data, art.slug);
              imageUrl = storedUrl || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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
      } catch (e) {
        return { ...art, id: `cmb-${Math.random().toString(36).substr(2, 9)}`, status: 'draft', image: `https://images.unsplash.com/featured/?${art.category}` };
      }
    }));

    return res.status(200).json({ success: true, articles: articlesWithImages });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
