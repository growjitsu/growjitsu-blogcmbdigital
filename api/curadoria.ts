
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não autorizado.' });
  }

  const { themes } = req.body;
  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
  const BUCKET_NAME = 'blog-images';
  const TABLE_NAME = 'posts';

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
      contents: themes && themes.length > 0 
        ? `Gere 2 artigos estratégicos e completos sobre: ${themes.join(", ")}.` 
        : "Gere 2 artigos épicos sobre Inteligência Artificial e Marketing de Performance para 2025.",
      config: {
        systemInstruction: "Você é o Editor-Chefe da CMBDIGITAL. Retorne estritamente um JSON. Use pt-BR e HTML semântico. Gere slugs únicos.",
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
                required: ["slug", "title", "excerpt", "content", "category", "tags", "promptImagem"]
              }
            }
          },
          required: ["articles"]
        }
      }
    });

    const aiText = curatorResponse.text;
    if (!aiText) throw new Error("A IA não retornou dados.");

    const parsedData = JSON.parse(aiText);
    const rawArticles = parsedData.articles;

    const articlesToInsert = await Promise.all(rawArticles.map(async (art: any) => {
      let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",technology")}`;
      
      try {
        const imageRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: art.promptImagem + " cinematic photography, professional high-end look, futuristic" }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        });

        if (imageRes.candidates?.[0]?.content?.parts) {
          for (const part of imageRes.candidates[0].content.parts) {
            if (part.inlineData) {
              const storedUrl = await saveToStorage(part.inlineData.data, art.slug);
              if (storedUrl) imageUrl = storedUrl;
              break;
            }
          }
        }
      } catch (e) { /* fallback image used */ }

      return {
        // Omitimos o ID para que o Supabase use o DEFAULT gen_random_uuid()
        slug: art.slug,
        title: art.title,
        excerpt: art.excerpt,
        content: art.content,
        category: art.category,
        author: 'CMBDIGITAL',
        date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        image_url: imageUrl,
        tags: art.tags,
        status: 'pending',
        meta_title: art.metaTitle || art.title,
        meta_description: art.metaDescription || art.excerpt,
        created_at: new Date().toISOString()
      };
    }));

    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert(articlesToInsert)
      .select();

    if (dbError) throw new Error(`Supabase Error: ${dbError.message}`);

    return res.status(200).json({ 
      success: true, 
      count: insertedData?.length || 0, 
      drafts: insertedData || [] 
    });

  } catch (error: any) {
    console.error("CURADORIA_ERROR:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
