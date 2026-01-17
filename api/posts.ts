
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// NOME DA TABELA DEFINIDO COMO 'posts' (Padrão do Projeto)
const TABLE_NAME = 'posts';

const mapToFrontend = (p: any) => ({
  ...p,
  metaTitle: p.meta_title || p.metaTitle || '',
  metaDescription: p.meta_description || p.metaDescription || '',
  image: p.image_url || p.image || ''
});

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
          console.error(`DB_ERROR [GET SLUG]: ${error.message}`);
          return res.status(404).json({ success: false, error: 'Protocolo não localizado no banco.' });
        }
        return res.status(200).json({ success: true, article: mapToFrontend(data) });
      }

      let query = supabase.from(TABLE_NAME).select('*');
      
      // Se status for solicitado (ex: pending, published)
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error(`DB_ERROR [GET ALL]: ${error.message}`);
        // Retorna erro amigável em vez de quebrar
        return res.status(500).json({ success: false, error: `Falha no Cache de Schema: ${error.message}` });
      }
      
      return res.status(200).json({ success: true, articles: (data || []).map(mapToFrontend) });
    }

    if (req.method === 'POST') {
      const article = req.body;
      if (!article.id || !article.slug) {
        return res.status(400).json({ success: false, error: 'Assinatura de dados incompleta.' });
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert({
          id: article.id,
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          category: article.category,
          author: article.author || 'CMBDIGITAL',
          date: article.date || new Date().toLocaleDateString('pt-BR'),
          image_url: article.image || article.image_url,
          tags: article.tags || [],
          status: article.status || 'pending',
          meta_title: article.metaTitle || article.meta_title,
          meta_description: article.metaDescription || article.meta_description,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error(`DB_ERROR [POST]: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, message: 'Protocolo sincronizado com sucesso.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID de protocolo ausente.' });
      }
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (error) {
        console.error(`DB_ERROR [DELETE]: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, message: 'Protocolo removido da nuvem.' });
    }

    return res.status(405).json({ success: false, error: 'Método não autorizado.' });

  } catch (error: any) {
    console.error("CRITICAL_POSTS_API_ERROR:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: "Erro interno no servidor." });
    }
  }
}
