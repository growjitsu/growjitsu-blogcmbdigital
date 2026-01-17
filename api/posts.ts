
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TABLE_NAME = 'posts';

const mapToFrontend = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    image: p.image_url || p.image || '',
    metaTitle: p.meta_title || p.metaTitle || '',
    metaDescription: p.meta_description || p.metaDescription || ''
  };
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { slug, status } = req.query;

      if (slug) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) {
          if (error.message.includes('not find the table')) {
             return res.status(500).json({ success: false, error: `Configuração Necessária: A tabela '${TABLE_NAME}' não existe no banco.` });
          }
          return res.status(404).json({ success: false, error: 'Artigo não localizado.' });
        }
        return res.status(200).json({ success: true, article: mapToFrontend(data) });
      }

      let query = supabase.from(TABLE_NAME).select('*');
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        return res.status(500).json({ 
          success: false, 
          error: `Erro de Banco: ${error.message}.` 
        });
      }
      
      const articles = (data || []).map(mapToFrontend).filter(Boolean);
      return res.status(200).json({ success: true, articles });
    }

    if (req.method === 'POST') {
      const article = req.body;
      if (!article || !article.slug) {
        return res.status(400).json({ success: false, error: 'Dados incompletos (slug obrigatório).' });
      }

      const payload: any = {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        author: article.author || 'CMBDIGITAL',
        date: article.date,
        image_url: article.image || article.image_url,
        tags: article.tags || [],
        status: article.status || 'pending',
        meta_title: article.metaTitle || article.meta_title,
        meta_description: article.metaDescription || article.meta_description,
        updated_at: new Date().toISOString()
      };

      if (article.id && article.id.length === 36) {
        payload.id = article.id;
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(payload, { onConflict: 'slug' });

      if (error) throw error;
      
      return res.status(200).json({ success: true, message: 'Operação realizada com sucesso.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Removido.' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido.' });

  } catch (error: any) {
    console.error("API_POSTS_CRITICAL:", error.message);
    if (!res.writableEnded) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
