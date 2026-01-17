
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  // Evitar múltiplos disparos de headers
  if (res.headersSent) return;
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
        console.error("Erro no Storage:", e);
        return null;
      }
    };

    // Protocolo de Extração Robusta de JSON
    const extractJson = (text: string) => {
      try {
        // Tenta encontrar o primeiro { e o último }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        const jsonPart = text.substring(start, end + 1);
        return JSON.parse(jsonPart);
      } catch (e) {
        return null;
      }
    };

    const curatorResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: themes && themes.length > 0 
        ? `Gere 2 artigos épicos sobre: ${themes.join(", ")}.` 
        : "Gere 2 artigos sobre Inteligência Artificial e Marketing Digital para 2025.",
      config: {
        systemInstruction: "Editor-Chefe CMBDIGITAL. Retorne APENAS um objeto JSON válido seguindo o schema. Use pt-BR e HTML semântico.",
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

    const aiText = curatorResponse.text;
    if (!aiText) throw new Error("A IA não retornou nenhum texto.");

    const parsedData = extractJson(aiText);
    if (!parsedData || !parsedData.articles || parsedData.articles.length === 0) {
      console.error("Falha ao parsear JSON da IA ou lista vazia:", aiText);
      throw new Error("Resposta da IA em formato inválido ou lista de artigos vazia.");
    }

    const rawArticles = parsedData.articles;
    const articlesToInsert = await Promise.all(rawArticles.map(async (art: any) => {
      let imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(art.category + ",tech")}`;
      
      try {
        const imageRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: art.promptImagem + " professional, high resolution, editorial photography style" }] },
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
      } catch (e) { 
        console.warn("Falha ao gerar imagem AI, usando fallback do Unsplash.");
      }

      return {
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
        meta_description: art.metaDescription,
        created_at: new Date().toISOString()
      };
    }));

    // Inserção em Lote no Supabase
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('posts')
      .insert(articlesToInsert)
      .select();

    if (dbError) {
      console.error("ERRO SUPABASE INSERT:", dbError.message);
      throw new Error(`Erro ao salvar rascunhos no banco: ${dbError.message}`);
    }

    // Retorno explícito dos rascunhos criados
    return res.status(200).json({ 
      success: true, 
      count: insertedData?.length || 0, 
      drafts: insertedData || [] 
    });

  } catch (error: any) {
    console.error("ERRO CRÍTICO CURADORIA:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
