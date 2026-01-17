
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { themes } = req.body;
  
  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
  const BUCKET_NAME = 'blog-images';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const saveToStorage = async (base64Data: string, name: string): Promise<string | null> => {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${name}-${Date.now()}.png`;
        const { error } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(`ai/${fileName}`, buffer, { contentType: 'image/png', upsert: true });
        
        if (error) throw error;
        const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(`ai/${fileName}`);
        return publicUrl;
      } catch (e) {
        return null;
      }
    };

    const curatorResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: themes && themes.length > 0 ? `Gere 1 artigo sobre: ${themes.join(", ")}.` : "Gere 2 artigos épicos sobre o futuro da IA.",
      config: {
        systemInstruction: "Editor-Chefe CMBDIGITAL. Crie artigos de autoridade. JSON pt-BR.",
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
                  promptImagem: { type: Type.STRING },
                  metaTitle: { type: Type.STRING },
                  metaDescription: { type: Type.STRING }
                },
                required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem", "metaTitle", "metaDescription"]
              }
            }
          },
          required: ["articles"]
        }
      }
    });

    const data = JSON.parse(curatorResponse.text || "{}");
    const rawArticles = data.articles || [];

    const articlesSaved = await Promise.all(rawArticles.map(async (art: any) => {
      try {
        const imageRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: art.promptImagem }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        });

        let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category)}`;
        if (imageRes.candidates?.[0]?.content?.parts) {
          for (const part of imageRes.candidates[0].content.parts) {
            if (part.inlineData) {
              const storedUrl = await saveToStorage(part.inlineData.data, art.slug);
              imageUrl = storedUrl || imageUrl;
              break;
            }
          }
        }

        const newPost = {
          id: `cmb-${Math.random().toString(36).substr(2, 9)}`,
          slug: art.slug,
          title: art.title,
          excerpt: art.excerpt,
          content: art.content,
          category: art.category,
          author: 'CMBDIGITAL',
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          image: imageUrl,
          tags: art.tags,
          status: 'draft',
          meta_title: art.metaTitle,
          meta_description: art.metaDescription
        };

        // Persistência direta no Banco de Dados
        await supabaseAdmin.from('posts').insert([newPost]);
        return newPost;
      } catch (e) {
        return null;
      }
    }));

    return res.status(200).json({ success: true, count: articlesSaved.filter(Boolean).length });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
